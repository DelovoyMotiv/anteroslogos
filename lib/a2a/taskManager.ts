/**
 * A2A Task Management Core - Linux Foundation A2A Protocol v1.0
 * 
 * Implements task lifecycle: create → submit → progress → complete/fail
 * Task structure with ULID IDs, status tracking, and result artifacts
 * 
 * Spec: https://a2a-protocol.org/specs/task-management
 */

import { ulid } from 'ulid';
import { z } from 'zod';
import type { JSONValue } from '../../types/common.types';

// =====================================================
// TASK STATUS & TYPES
// =====================================================

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// =====================================================
// TASK SCHEMAS (per Linux Foundation spec)
// =====================================================

export const TaskArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'json', 'binary', 'url', 'report']),
  mime_type: z.string(),
  size: z.number().optional(),
  url: z.string().url().optional(),
  data: z.any().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type TaskArtifact = z.infer<typeof TaskArtifactSchema>;

export const TaskCostBreakdownSchema = z.object({
  compute_cost: z.number(),
  storage_cost: z.number(),
  network_cost: z.number(),
  total_cost: z.number(),
  currency: z.string().default('USDC'),
  breakdown: z.record(z.string(), z.number()).optional(),
});

export type TaskCostBreakdown = z.infer<typeof TaskCostBreakdownSchema>;

export const TaskProgressSchema = z.object({
  percentage: z.number().min(0).max(100),
  stage: z.string(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type TaskProgress = z.infer<typeof TaskProgressSchema>;

export const TaskSchema = z.object({
  // Core Identity
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/), // ULID format
  agent_id: z.string(),
  session_id: z.string().optional(),
  
  // Task Definition
  capability: z.string(),
  params: z.record(z.string(), z.any()),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.NORMAL),
  
  // Lifecycle
  status: z.nativeEnum(TaskStatus),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  
  // Progress Tracking
  progress: TaskProgressSchema.optional(),
  
  // Results
  result: z.any().optional(),
  artifacts: z.array(TaskArtifactSchema).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  
  // Cost & Billing
  cost: TaskCostBreakdownSchema.optional(),
  
  // Extensions
  extensions: z.record(z.string(), z.any()).optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskRequestSchema = z.object({
  capability: z.string(),
  params: z.record(z.string(), z.any()),
  priority: z.nativeEnum(TaskPriority).optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

// =====================================================
// TASK MANAGER
// =====================================================

export class TaskManager {
  private static instance: TaskManager;
  private tasks: Map<string, Task> = new Map();
  private progressListeners: Map<string, Set<(progress: TaskProgress) => void>> = new Map();
  
  private constructor() {}
  
  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }
  
  /**
   * Create new task
   */
  createTask(request: CreateTaskRequest, agentId: string): Task {
    // Validate request
    CreateTaskRequestSchema.parse(request);
    
    const taskId = ulid();
    const now = new Date().toISOString();
    
    const task: Task = {
      id: taskId,
      agent_id: agentId,
      session_id: request.session_id,
      capability: request.capability,
      params: request.params,
      priority: request.priority || TaskPriority.NORMAL,
      status: TaskStatus.PENDING,
      created_at: now,
      metadata: request.metadata,
    };
    
    // Validate task
    TaskSchema.parse(task);
    
    this.tasks.set(taskId, task);
    
    return task;
  }
  
  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }
  
  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    options?: {
      result?: JSONValue;
      error?: { code: string; message: string; details?: JSONValue };
      artifacts?: TaskArtifact[];
      cost?: TaskCostBreakdown;
    }
  ): Task | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    task.status = status;
    
    if (status === TaskStatus.RUNNING && !task.started_at) {
      task.started_at = now;
    }
    
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED || status === TaskStatus.CANCELLED) {
      task.completed_at = now;
      
      if (options?.result) {
        task.result = options.result;
      }
      
      if (options?.error) {
        task.error = options.error;
      }
      
      if (options?.artifacts) {
        task.artifacts = options.artifacts;
      }
      
      if (options?.cost) {
        task.cost = options.cost;
      }
    }
    
    // Validate updated task
    TaskSchema.parse(task);
    
    this.tasks.set(taskId, task);
    
    return task;
  }
  
  /**
   * Update task progress
   */
  updateTaskProgress(
    taskId: string,
    progress: Omit<TaskProgress, 'timestamp'>
  ): Task | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    const fullProgress: TaskProgress = {
      ...progress,
      timestamp: new Date().toISOString(),
    };
    
    task.progress = fullProgress;
    
    // Notify listeners
    const listeners = this.progressListeners.get(taskId);
    if (listeners) {
      listeners.forEach(listener => listener(fullProgress));
    }
    
    this.tasks.set(taskId, task);
    
    return task;
  }
  
  /**
   * Subscribe to task progress updates
   */
  subscribeToProgress(taskId: string, listener: (progress: TaskProgress) => void): () => void {
    if (!this.progressListeners.has(taskId)) {
      this.progressListeners.set(taskId, new Set());
    }
    
    const listeners = this.progressListeners.get(taskId)!;
    listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
      
      if (listeners.size === 0) {
        this.progressListeners.delete(taskId);
      }
    };
  }
  
  /**
   * Add artifact to task
   */
  addTaskArtifact(taskId: string, artifact: TaskArtifact): Task | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    if (!task.artifacts) {
      task.artifacts = [];
    }
    
    // Validate artifact
    TaskArtifactSchema.parse(artifact);
    
    task.artifacts.push(artifact);
    
    this.tasks.set(taskId, task);
    
    return task;
  }
  
  /**
   * Calculate task cost
   */
  calculateTaskCost(
    taskId: string,
    computeCost: number,
    storageCost: number,
    networkCost: number,
    breakdown?: Record<string, number>
  ): Task | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    const cost: TaskCostBreakdown = {
      compute_cost: computeCost,
      storage_cost: storageCost,
      network_cost: networkCost,
      total_cost: computeCost + storageCost + networkCost,
      currency: 'USDC',
      breakdown,
    };
    
    task.cost = cost;
    
    this.tasks.set(taskId, task);
    
    return task;
  }
  
  /**
   * Get tasks by agent
   */
  getTasksByAgent(agentId: string, filters?: {
    status?: TaskStatus;
    capability?: string;
    limit?: number;
  }): Task[] {
    let tasks = Array.from(this.tasks.values()).filter(t => t.agent_id === agentId);
    
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    
    if (filters?.capability) {
      tasks = tasks.filter(t => t.capability === filters.capability);
    }
    
    // Sort by created_at desc
    tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }
  
  /**
   * Get tasks by session
   */
  getTasksBySession(sessionId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter(t => t.session_id === sessionId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  /**
   * Cancel task
   */
  cancelTask(taskId: string, reason?: string): Task | null {
    const task = this.tasks.get(taskId);
    
    if (!task) {
      return null;
    }
    
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
      return task; // Already finished
    }
    
    return this.updateTaskStatus(taskId, TaskStatus.CANCELLED, {
      error: {
        code: 'TASK_CANCELLED',
        message: reason || 'Task cancelled by user',
      },
    });
  }
  
  /**
   * Delete task (cleanup)
   */
  deleteTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }
  
  /**
   * Get task statistics
   */
  getStatistics(agentId?: string): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    let tasks = Array.from(this.tasks.values());
    
    if (agentId) {
      tasks = tasks.filter(t => t.agent_id === agentId);
    }
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
      cancelled: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
    };
  }
  
  /**
   * Cleanup old completed/failed tasks (retention policy)
   */
  cleanupOldTasks(retentionMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) &&
        task.completed_at
      ) {
        const completedAt = new Date(task.completed_at).getTime();
        
        if (now - completedAt > retentionMs) {
          this.tasks.delete(taskId);
          this.progressListeners.delete(taskId);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const taskManager = TaskManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Validate ULID format
 */
export function isValidULID(id: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
}

/**
 * Generate task artifact from data
 */
export function createArtifact(
  type: 'text' | 'json' | 'binary' | 'url' | 'report',
  data: JSONValue,
  metadata?: Record<string, JSONValue>
): TaskArtifact {
  const artifact: TaskArtifact = {
    id: ulid(),
    type,
    mime_type: getMimeType(type),
    data,
    metadata,
  };
  
  if (typeof data === 'string') {
    artifact.size = new Blob([data]).size;
  } else if (typeof data === 'object') {
    artifact.size = new Blob([JSON.stringify(data)]).size;
  }
  
  return artifact;
}

function getMimeType(type: TaskArtifact['type']): string {
  switch (type) {
    case 'text':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'binary':
      return 'application/octet-stream';
    case 'url':
      return 'text/uri-list';
    case 'report':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}
