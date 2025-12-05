/**
 * Model Registry
 * Custom ML model versioning and management system
 * 
 * Provides functionality for:
 * - Model registration and versioning
 * - Performance tracking
 * - Model deployment and rollback
 * - Feature importance tracking
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import type { CitationProbabilityModel, ModelVersion } from '../../types/citation-intelligence.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Model Registry Configuration
 */
export const MODEL_REGISTRY_CONFIG = {
  // Model storage paths
  modelStoragePath: process.env.MODEL_STORAGE_PATH || './models',
  
  // Performance thresholds
  minF1Score: 0.7,
  minPrecision: 0.65,
  minRecall: 0.65,
  
  // Versioning
  versionFormat: 'v{major}.{minor}.{patch}',
  
  // Deployment
  maxActiveModels: 3,
  rollbackEnabled: true,
  
  // Monitoring
  performanceCheckInterval: 3600000, // 1 hour in ms
  alertOnDegradation: true,
  degradationThreshold: 0.1, // 10% drop in F1 score
};

/**
 * Model Registry Class
 * Manages ML model lifecycle
 */
export class ModelRegistry {
  /**
   * Register a new model version
   */
  async registerModel(model: Omit<CitationProbabilityModel, 'id'>): Promise<string> {
    // Validate model performance
    if (model.performance.f1Score < MODEL_REGISTRY_CONFIG.minF1Score) {
      throw new Error(
        `Model F1 score (${model.performance.f1Score}) below minimum threshold (${MODEL_REGISTRY_CONFIG.minF1Score})`
      );
    }

    // Insert model into registry
    // @ts-ignore - ml_models table not in generated types yet
    const { data, error } = await (supabase
      .from('ml_models') as any)
      .insert({
        model_name: 'citation_probability_predictor',
        version: model.version,
        features: model.features as any,
        hyperparameters: model.hyperparameters as any,
        precision: model.performance.precision,
        recall: model.performance.recall,
        f1_score: model.performance.f1Score,
        auc: model.performance.auc,
        status: model.status,
        trained_at: model.trainedAt.toISOString(),
        trained_by: null, // Set by RLS policy
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to register model: ${error.message}`);
    }

    return (data as any).id;
  }

  /**
   * Get active model
   */
  async getActiveModel(): Promise<CitationProbabilityModel | null> {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('model_name', 'citation_probability_predictor')
      .eq('status', 'active')
      .order('trained_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  }

  /**
   * Get model by ID
   */
  async getModelById(modelId: string): Promise<CitationProbabilityModel | null> {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  }

  /**
   * Get model by version
   */
  async getModelByVersion(version: string): Promise<CitationProbabilityModel | null> {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('model_name', 'citation_probability_predictor')
      .eq('version', version)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  }

  /**
   * List all models
   */
  async listModels(status?: 'active' | 'testing' | 'archived'): Promise<CitationProbabilityModel[]> {
    let query = supabase
      .from('ml_models')
      .select('*')
      .eq('model_name', 'citation_probability_predictor')
      .order('trained_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(this.mapToModel);
  }

  /**
   * Activate a model (deploy to production)
   */
  async activateModel(modelId: string): Promise<void> {
    // First, archive all currently active models
    // @ts-ignore - ml_models table not in generated types yet
    await (supabase
      .from('ml_models') as any)
      .update({ status: 'archived' })
      .eq('model_name', 'citation_probability_predictor')
      .eq('status', 'active');

    // Activate the new model
    // @ts-ignore - ml_models table not in generated types yet
    const { error } = await (supabase
      .from('ml_models') as any)
      .update({ status: 'active' })
      .eq('id', modelId);

    if (error) {
      throw new Error(`Failed to activate model: ${error.message}`);
    }
  }

  /**
   * Archive a model
   */
  async archiveModel(modelId: string): Promise<void> {
    // @ts-ignore - ml_models table not in generated types yet
    const { error } = await (supabase
      .from('ml_models') as any)
      .update({ status: 'archived' })
      .eq('id', modelId);

    if (error) {
      throw new Error(`Failed to archive model: ${error.message}`);
    }
  }

  /**
   * Rollback to previous model version
   */
  async rollbackToPreviousVersion(): Promise<string> {
    // Get current active model
    const activeModel = await this.getActiveModel();
    if (!activeModel) {
      throw new Error('No active model to rollback from');
    }

    // Get previous active model (most recent archived)
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('model_name', 'citation_probability_predictor')
      .eq('status', 'archived')
      .order('trained_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('No previous model version available for rollback');
    }

    // Archive current active model
    await this.archiveModel(activeModel.id);

    // Activate previous model
    await this.activateModel((data as any).id);

    return (data as any).id;
  }

  /**
   * Compare model performance
   */
  async compareModels(modelId1: string, modelId2: string): Promise<{
    model1: CitationProbabilityModel;
    model2: CitationProbabilityModel;
    comparison: {
      f1ScoreDiff: number;
      precisionDiff: number;
      recallDiff: number;
      aucDiff: number;
      winner: 'model1' | 'model2' | 'tie';
    };
  }> {
    const model1 = await this.getModelById(modelId1);
    const model2 = await this.getModelById(modelId2);

    if (!model1 || !model2) {
      throw new Error('One or both models not found');
    }

    const f1ScoreDiff = model1.performance.f1Score - model2.performance.f1Score;
    const precisionDiff = model1.performance.precision - model2.performance.precision;
    const recallDiff = model1.performance.recall - model2.performance.recall;
    const aucDiff = model1.performance.auc - model2.performance.auc;

    let winner: 'model1' | 'model2' | 'tie' = 'tie';
    if (Math.abs(f1ScoreDiff) > 0.01) {
      winner = f1ScoreDiff > 0 ? 'model1' : 'model2';
    }

    return {
      model1,
      model2,
      comparison: {
        f1ScoreDiff,
        precisionDiff,
        recallDiff,
        aucDiff,
        winner,
      },
    };
  }

  /**
   * Get model version history
   */
  async getVersionHistory(): Promise<ModelVersion[]> {
    const models = await this.listModels();

    return models.map((model, index) => {
      const previous = models[index + 1];
      const performanceComparison = previous
        ? {
            previous: previous.performance.f1Score,
            current: model.performance.f1Score,
            improvement: model.performance.f1Score - previous.performance.f1Score,
          }
        : {
            previous: 0,
            current: model.performance.f1Score,
            improvement: model.performance.f1Score,
          };

      return {
        modelId: model.id,
        version: model.version,
        createdAt: model.trainedAt,
        createdBy: 'system', // TODO: Get from trained_by field
        changes: [], // TODO: Track changes between versions
        performanceComparison,
        rollbackAvailable: model.status === 'archived',
      };
    });
  }

  /**
   * Check for model performance degradation
   */
  async checkPerformanceDegradation(): Promise<{
    degraded: boolean;
    currentF1: number;
    previousF1: number;
    degradationPercent: number;
  }> {
    const models = await this.listModels('active');
    if (models.length === 0) {
      return {
        degraded: false,
        currentF1: 0,
        previousF1: 0,
        degradationPercent: 0,
      };
    }

    const currentModel = models[0];
    const archivedModels = await this.listModels('archived');

    if (archivedModels.length === 0) {
      return {
        degraded: false,
        currentF1: currentModel.performance.f1Score,
        previousF1: 0,
        degradationPercent: 0,
      };
    }

    const previousModel = archivedModels[0];
    const degradationPercent =
      (previousModel.performance.f1Score - currentModel.performance.f1Score) /
      previousModel.performance.f1Score;

    return {
      degraded: degradationPercent > MODEL_REGISTRY_CONFIG.degradationThreshold,
      currentF1: currentModel.performance.f1Score,
      previousF1: previousModel.performance.f1Score,
      degradationPercent,
    };
  }

  /**
   * Map database row to CitationProbabilityModel
   */
  private mapToModel(data: any): CitationProbabilityModel {
    return {
      id: data.id,
      version: data.version,
      trainedAt: new Date(data.trained_at),
      features: data.features,
      performance: {
        precision: data.precision,
        recall: data.recall,
        f1Score: data.f1_score,
        auc: data.auc,
      },
      hyperparameters: data.hyperparameters,
      status: data.status,
    };
  }
}

/**
 * Singleton instance
 */
export const modelRegistry = new ModelRegistry();
