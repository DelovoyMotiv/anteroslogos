/**
 * A2A Multi-Agent Orchestration - Linux Foundation A2A Protocol v1.0
 * 
 * Orchestrates complex workflows across multiple A2A agents
 * Supports sequential task execution, result passing, and error handling
 * 
 * Orchestration Pattern: Task chains where output of one agent feeds into next
 */

import { ulid } from 'ulid';
import { z } from 'zod';
import { Task, TaskStatus, taskManager, TaskPriority } from './taskManager';
import { agentCardManager, AgentCard } from './agentCard';

// =====================================================
// ORCHESTRATION TYPES
// =====================================================

export enum OrchestrationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface OrchestrationStep {
  step_id: string;
  agent_id: string;
  capability: string;
  params: Record<string, any> | ((prevResult: any) => Record<string, any>);
  depends_on?: string[]; // Step IDs this step depends on
  optional: boolean; // If true, continue on failure
}

export interface OrchestrationStepResult {
  step_id: string;
  agent_id: string;
  task_id: string;
  status: TaskStatus;
  result?: any;
  error?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export const OrchestrationSchema = z.object({
  // Core Identity
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/), // ULID format
  name: z.string(),
  description: z.string().optional(),
  
  // Lifecycle
  status: z.nativeEnum(OrchestrationStatus),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  
  // Steps
  steps: z.array(z.any()), // OrchestrationStep array
  step_results: z.array(z.any()), // OrchestrationStepResult array
  
  // Current execution
  current_step_index: z.number(),
  
  // Final result
  final_result: z.any().optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).optional(),
});

export type Orchestration = z.infer<typeof OrchestrationSchema>;

// =====================================================
// ORCHESTRATION MANAGER
// =====================================================

export class OrchestrationManager {
  private static instance: OrchestrationManager;
  private orchestrations: Map<string, Orchestration> = new Map();
  
  private constructor() {}
  
  static getInstance(): OrchestrationManager {
    if (!OrchestrationManager.instance) {
      OrchestrationManager.instance = new OrchestrationManager();
    }
    return OrchestrationManager.instance;
  }
  
  /**
   * Create orchestration
   */
  createOrchestration(
    name: string,
    steps: OrchestrationStep[],
    options?: {
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Orchestration {
    const orchestrationId = ulid();
    const now = new Date().toISOString();
    
    const orchestration: Orchestration = {
      id: orchestrationId,
      name,
      description: options?.description,
      status: OrchestrationStatus.PENDING,
      created_at: now,
      steps,
      step_results: [],
      current_step_index: 0,
      metadata: options?.metadata,
    };
    
    OrchestrationSchema.parse(orchestration);
    
    this.orchestrations.set(orchestrationId, orchestration);
    
    return orchestration;
  }
  
  /**
   * Get orchestration by ID
   */
  getOrchestration(orchestrationId: string): Orchestration | null {
    return this.orchestrations.get(orchestrationId) || null;
  }
  
  /**
   * Execute orchestration
   */
  async executeOrchestration(orchestrationId: string): Promise<Orchestration> {
    const orchestration = this.orchestrations.get(orchestrationId);
    
    if (!orchestration) {
      throw new Error(`Orchestration ${orchestrationId} not found`);
    }
    
    if (orchestration.status !== OrchestrationStatus.PENDING) {
      throw new Error(`Orchestration ${orchestrationId} already executed`);
    }
    
    // Start orchestration
    orchestration.status = OrchestrationStatus.RUNNING;
    orchestration.started_at = new Date().toISOString();
    this.orchestrations.set(orchestrationId, orchestration);
    
    try {
      // Execute steps sequentially
      for (let i = 0; i < orchestration.steps.length; i++) {
        orchestration.current_step_index = i;
        
        const step = orchestration.steps[i];
        const stepResult = await this.executeStep(orchestration, step);
        
        orchestration.step_results.push(stepResult);
        
        // Check if step failed and is not optional
        if (stepResult.status === TaskStatus.FAILED && !step.optional) {
          orchestration.status = OrchestrationStatus.FAILED;
          orchestration.completed_at = new Date().toISOString();
          this.orchestrations.set(orchestrationId, orchestration);
          
          throw new Error(
            `Orchestration failed at step ${i + 1} (${step.step_id}): ${stepResult.error?.message || 'Unknown error'}`
          );
        }
      }
      
      // All steps completed successfully
      orchestration.status = OrchestrationStatus.COMPLETED;
      orchestration.completed_at = new Date().toISOString();
      
      // Set final result (last successful step result)
      const lastSuccess = orchestration.step_results
        .reverse()
        .find(r => r.status === TaskStatus.COMPLETED);
      
      orchestration.final_result = lastSuccess?.result;
      
      this.orchestrations.set(orchestrationId, orchestration);
      
      return orchestration;
      
    } catch (error) {
      orchestration.status = OrchestrationStatus.FAILED;
      orchestration.completed_at = new Date().toISOString();
      this.orchestrations.set(orchestrationId, orchestration);
      
      throw error;
    }
  }
  
  /**
   * Execute single orchestration step
   */
  private async executeStep(
    orchestration: Orchestration,
    step: OrchestrationStep
  ): Promise<OrchestrationStepResult> {
    const startTime = Date.now();
    const startTimeISO = new Date().toISOString();
    
    try {
      // Check dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        const dependencies = orchestration.step_results.filter(r =>
          step.depends_on!.includes(r.step_id)
        );
        
        const failedDeps = dependencies.filter(d => d.status === TaskStatus.FAILED);
        
        if (failedDeps.length > 0) {
          throw new Error(
            `Step ${step.step_id} has failed dependencies: ${failedDeps.map(d => d.step_id).join(', ')}`
          );
        }
      }
      
      // Resolve params (may be function depending on previous results)
      let params: Record<string, any>;
      
      if (typeof step.params === 'function') {
        // Get previous step result
        const prevResult = orchestration.step_results.length > 0
          ? orchestration.step_results[orchestration.step_results.length - 1].result
          : null;
        
        params = step.params(prevResult);
      } else {
        params = step.params;
      }
      
      // Create task for this step
      const task = taskManager.createTask(
        {
          capability: step.capability,
          params,
          metadata: {
            orchestration_id: orchestration.id,
            step_id: step.step_id,
          },
        },
        step.agent_id
      );
      
      // Execute task (simulated - in real impl would call agent)
      // For now, mark as completed immediately
      taskManager.updateTaskStatus(task.id, TaskStatus.RUNNING);
      
      // Simulate task execution
      await this.simulateTaskExecution(task);
      
      const endTime = Date.now();
      
      // Get updated task
      const completedTask = taskManager.getTask(task.id);
      
      if (!completedTask) {
        throw new Error(`Task ${task.id} not found after execution`);
      }
      
      return {
        step_id: step.step_id,
        agent_id: step.agent_id,
        task_id: task.id,
        status: completedTask.status,
        result: completedTask.result,
        error: completedTask.error,
        started_at: startTimeISO,
        completed_at: new Date().toISOString(),
        duration_ms: endTime - startTime,
      };
      
    } catch (error) {
      return {
        step_id: step.step_id,
        agent_id: step.agent_id,
        task_id: '',
        status: TaskStatus.FAILED,
        error: {
          code: 'STEP_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        started_at: startTimeISO,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Simulate task execution (placeholder for real agent calls)
   */
  private async simulateTaskExecution(task: Task): Promise<void> {
    // In real implementation, this would:
    // 1. Discover agent via agent card
    // 2. Call agent's HTTP endpoint
    // 3. Stream progress via SSE
    // 4. Handle payment if required
    // 5. Verify via consensus if needed
    
    // For now, simulate success with mock result
    await new Promise(resolve => setTimeout(resolve, 100));
    
    taskManager.updateTaskStatus(task.id, TaskStatus.COMPLETED, {
      result: {
        success: true,
        capability: task.capability,
        params: task.params,
        simulated: true,
      },
    });
  }
  
  /**
   * Cancel orchestration
   */
  cancelOrchestration(orchestrationId: string, reason?: string): Orchestration | null {
    const orchestration = this.orchestrations.get(orchestrationId);
    
    if (!orchestration) {
      return null;
    }
    
    if (orchestration.status === OrchestrationStatus.COMPLETED) {
      return orchestration; // Already completed
    }
    
    orchestration.status = OrchestrationStatus.CANCELLED;
    orchestration.completed_at = new Date().toISOString();
    
    this.orchestrations.set(orchestrationId, orchestration);
    
    return orchestration;
  }
  
  /**
   * Get orchestration statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    average_steps: number;
    average_duration_ms: number;
  } {
    const orchestrations = Array.from(this.orchestrations.values());
    
    const pending = orchestrations.filter(o => o.status === OrchestrationStatus.PENDING).length;
    const running = orchestrations.filter(o => o.status === OrchestrationStatus.RUNNING).length;
    const completed = orchestrations.filter(o => o.status === OrchestrationStatus.COMPLETED).length;
    const failed = orchestrations.filter(o => o.status === OrchestrationStatus.FAILED).length;
    const cancelled = orchestrations.filter(o => o.status === OrchestrationStatus.CANCELLED).length;
    
    const avgSteps = orchestrations.length > 0
      ? orchestrations.reduce((sum, o) => sum + o.steps.length, 0) / orchestrations.length
      : 0;
    
    const completedOrchestrations = orchestrations.filter(
      o => o.started_at && o.completed_at
    );
    
    const avgDuration = completedOrchestrations.length > 0
      ? completedOrchestrations.reduce((sum, o) => {
          const start = new Date(o.started_at!).getTime();
          const end = new Date(o.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedOrchestrations.length
      : 0;
    
    return {
      total: orchestrations.length,
      pending,
      running,
      completed,
      failed,
      cancelled,
      average_steps: parseFloat(avgSteps.toFixed(2)),
      average_duration_ms: Math.round(avgDuration),
    };
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const orchestrationManager = OrchestrationManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create sequential orchestration (each step depends on previous)
 */
export function createSequentialOrchestration(
  name: string,
  steps: Array<{
    agent_id: string;
    capability: string;
    params: Record<string, any> | ((prevResult: any) => Record<string, any>);
    optional?: boolean;
  }>
): Orchestration {
  const orchestrationSteps: OrchestrationStep[] = steps.map((step, index) => ({
    step_id: `step-${index + 1}`,
    agent_id: step.agent_id,
    capability: step.capability,
    params: step.params,
    depends_on: index > 0 ? [`step-${index}`] : undefined,
    optional: step.optional || false,
  }));
  
  return orchestrationManager.createOrchestration(name, orchestrationSteps);
}

/**
 * Create parallel orchestration (all steps execute independently)
 */
export function createParallelOrchestration(
  name: string,
  steps: Array<{
    agent_id: string;
    capability: string;
    params: Record<string, any>;
    optional?: boolean;
  }>
): Orchestration {
  const orchestrationSteps: OrchestrationStep[] = steps.map((step, index) => ({
    step_id: `step-${index + 1}`,
    agent_id: step.agent_id,
    capability: step.capability,
    params: step.params,
    optional: step.optional || false,
  }));
  
  return orchestrationManager.createOrchestration(name, orchestrationSteps);
}

/**
 * Create DAG orchestration with custom dependencies
 */
export function createDAGOrchestration(
  name: string,
  steps: Array<{
    step_id: string;
    agent_id: string;
    capability: string;
    params: Record<string, any> | ((prevResult: any) => Record<string, any>);
    depends_on?: string[];
    optional?: boolean;
  }>
): Orchestration {
  const orchestrationSteps: OrchestrationStep[] = steps.map(step => ({
    step_id: step.step_id,
    agent_id: step.agent_id,
    capability: step.capability,
    params: step.params,
    depends_on: step.depends_on,
    optional: step.optional || false,
  }));
  
  return orchestrationManager.createOrchestration(name, orchestrationSteps);
}

/**
 * Execute orchestration and wait for completion
 */
export async function executeAndWait(
  orchestrationId: string,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<Orchestration> {
  const startTime = Date.now();
  
  const orchestration = await orchestrationManager.executeOrchestration(orchestrationId);
  
  const duration = Date.now() - startTime;
  
  if (duration > timeoutMs) {
    throw new Error(`Orchestration timed out after ${timeoutMs}ms`);
  }
  
  return orchestration;
}
