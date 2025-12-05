/**
 * Citation Intelligence Engine
 * Core infrastructure and data models
 * 
 * This module provides the foundational infrastructure for the
 * Predictive Citation Intelligence Engine, including:
 * - TypeScript type definitions
 * - Database schema (PostgreSQL with TimescaleDB)
 * - Graph database adapter (PostgreSQL-based)
 * - ML model registry
 */

// Export all types
export * from '../../types/citation-intelligence.types';

// Export model registry
export { ModelRegistry, modelRegistry, MODEL_REGISTRY_CONFIG } from './modelRegistry';

// Export graph database configuration
export {
  type GraphDatabaseType,
  type GraphDatabaseConfig,
  type GraphDatabaseAdapter,
  type GraphMetrics,
  type GraphHealthCheck,
  type GraphExportFormat,
  type GraphExportOptions,
  DEFAULT_GRAPH_CONFIG,
  NEO4J_CONFIG,
  ARANGODB_CONFIG,
  getGraphDatabaseConfig,
  GraphQueryBuilder,
} from './graphDatabase.config';

// Export PostgreSQL graph adapter
export { PostgresGraphAdapter, postgresGraphAdapter } from './postgresGraphAdapter';

// Export feature extractor
export {
  extractFeatures,
  extractContentQualityFeatures,
  extractEntityAuthorityFeatures,
  extractTemporalFeatures,
  extractCompetitiveFeatures,
  normalizeFeatures,
} from './featureExtractor';

// Export citation predictor
export { CitationPredictor, citationPredictor } from './citationPredictor';

// Export forecaster
export { generateForecasts, explainForecast } from './forecaster';

// Export quick-win identifier
export {
  identifyQuickWins,
  rankPagesByCitationPotential,
  generateImplementationRoadmap,
} from './quickWinIdentifier';

// Import for internal use
import { postgresGraphAdapter } from './postgresGraphAdapter';
import { modelRegistry } from './modelRegistry';
import type { GraphMetrics } from './graphDatabase.config';

/**
 * Citation Intelligence Configuration
 */
export const CITATION_INTELLIGENCE_CONFIG = {
  // Feature flags
  features: {
    citationPrediction: true,
    contentOptimization: true,
    knowledgeGraph: true,
    temporalAnalysis: true,
    causalInference: true,
    competitiveIntelligence: true,
    realTimeAnalysis: true,
  },

  // Model configuration
  models: {
    citationPredictor: {
      minTrainingData: 100,
      retrainingInterval: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      minF1Score: 0.7,
    },
  },

  // Cache configuration
  cache: {
    citationProbability: {
      ttl: 3600, // 1 hour
      maxSize: 1000,
    },
    knowledgeGraph: {
      ttl: 86400, // 24 hours
      maxSize: 100,
    },
    forecasts: {
      ttl: 21600, // 6 hours
      maxSize: 500,
    },
  },

  // Performance thresholds
  performance: {
    maxPredictionTime: 500, // ms
    maxContentGenerationTime: 5000, // ms
    maxGraphExtractionTime: 2000, // ms
    maxRealTimeAnalysisTime: 2000, // ms
  },

  // API limits
  limits: {
    maxContentLength: 50000, // characters
    maxVariationsPerRequest: 3,
    maxCompetitorsPerAnalysis: 10,
    maxForecastHorizons: 3,
  },
};

/**
 * Initialize citation intelligence infrastructure
 */
export async function initializeCitationIntelligence(): Promise<{
  success: boolean;
  message: string;
  components: {
    database: boolean;
    graphAdapter: boolean;
    modelRegistry: boolean;
  };
}> {
  const components = {
    database: false,
    graphAdapter: false,
    modelRegistry: false,
  };

  try {
    // Test graph adapter connection
    await postgresGraphAdapter.connect();
    components.graphAdapter = true;

    // Test model registry
    await modelRegistry.getActiveModel();
    components.modelRegistry = true;

    // Test database (via graph adapter health check)
    const health = await postgresGraphAdapter.healthCheck();
    components.database = health.connected;

    const allComponentsReady = Object.values(components).every((c) => c);

    return {
      success: allComponentsReady,
      message: allComponentsReady
        ? 'Citation Intelligence Engine initialized successfully'
        : 'Some components failed to initialize',
      components,
    };
  } catch (error) {
    return {
      success: false,
      message: `Initialization failed: ${error}`,
      components,
    };
  }
}

/**
 * Get system status
 */
export async function getCitationIntelligenceStatus(): Promise<{
  healthy: boolean;
  components: {
    database: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
    graphAdapter: { status: 'healthy' | 'degraded' | 'down'; metrics: GraphMetrics };
    modelRegistry: {
      status: 'healthy' | 'degraded' | 'down';
      activeModel: string | null;
    };
  };
}> {
  try {
    // Check graph adapter
    const health = await postgresGraphAdapter.healthCheck();

    // Check model registry
    const activeModelData = await modelRegistry.getActiveModel();

    return {
      healthy: health.connected && activeModelData !== null,
      components: {
        database: {
          status: health.connected ? 'healthy' : 'down',
          responseTime: health.responseTime,
        },
        graphAdapter: {
          status: health.connected ? 'healthy' : 'down',
          metrics: health.metrics,
        },
        modelRegistry: {
          status: activeModelData ? 'healthy' : 'degraded',
          activeModel: activeModelData?.version || null,
        },
      },
    };
  } catch (error) {
    return {
      healthy: false,
      components: {
        database: { status: 'down', responseTime: 0 },
        graphAdapter: {
          status: 'down',
          metrics: {
            totalEntities: 0,
            totalRelationships: 0,
            entitiesByType: {},
            relationshipsByType: {},
            averageDegree: 0,
            density: 0,
            connectedComponents: 0,
          },
        },
        modelRegistry: { status: 'down', activeModel: null },
      },
    };
  }
}
