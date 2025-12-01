/**
 * A2A Session Management - Linux Foundation A2A Protocol v1.0
 * 
 * Manages multi-task sessions for related operations
 * Supports session lifecycle, task grouping, and aggregation
 * 
 * Session Pattern: Multiple related tasks executed within a single session context
 */

import { ulid } from 'ulid';
import { z } from 'zod';
import { Task, TaskStatus, taskManager } from './taskManager';

// =====================================================
// SESSION TYPES
// =====================================================

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const SessionSchema = z.object({
  // Core Identity
  id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/), // ULID format
  agent_id: z.string(),
  user_id: z.string(),
  
  // Session Configuration
  name: z.string().optional(),
  description: z.string().optional(),
  
  // Lifecycle
  status: z.nativeEnum(SessionStatus),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  
  // Tasks
  task_ids: z.array(z.string()),
  
  // Aggregated Metrics
  metrics: z.object({
    total_tasks: z.number(),
    completed_tasks: z.number(),
    failed_tasks: z.number(),
    total_cost_usd: z.number(),
    total_time_ms: z.number(),
  }).optional(),
  
  // Session-level Extensions
  extensions: z.record(z.string(), z.unknown()).optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionRequestSchema = z.object({
  agent_id: z.string(),
  user_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

// =====================================================
// SESSION MANAGER
// =====================================================

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, Session> = new Map();
  
  private constructor() {}
  
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }
  
  /**
   * Create new session
   */
  createSession(request: CreateSessionRequest): Session {
    // Validate request
    CreateSessionRequestSchema.parse(request);
    
    const sessionId = ulid();
    const now = new Date().toISOString();
    
    const session: Session = {
      id: sessionId,
      agent_id: request.agent_id,
      user_id: request.user_id,
      name: request.name,
      description: request.description,
      status: SessionStatus.ACTIVE,
      created_at: now,
      task_ids: [],
      metadata: request.metadata,
    };
    
    // Validate session
    SessionSchema.parse(session);
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Add task to session
   */
  addTaskToSession(sessionId: string, taskId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error(`Cannot add task to ${session.status} session`);
    }
    
    if (!session.task_ids.includes(taskId)) {
      session.task_ids.push(taskId);
      
      // Start session if first task
      if (session.task_ids.length === 1 && !session.started_at) {
        session.started_at = new Date().toISOString();
      }
    }
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Remove task from session
   */
  removeTaskFromSession(sessionId: string, taskId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    session.task_ids = session.task_ids.filter(id => id !== taskId);
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Get all tasks in session
   */
  getSessionTasks(sessionId: string): Task[] {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return [];
    }
    
    return session.task_ids
      .map(taskId => taskManager.getTask(taskId))
      .filter((task): task is Task => task !== null);
  }
  
  /**
   * Calculate session metrics
   */
  calculateSessionMetrics(sessionId: string): Session['metrics'] | null {
    const tasks = this.getSessionTasks(sessionId);
    
    if (tasks.length === 0) {
      return null;
    }
    
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const failed = tasks.filter(t => t.status === TaskStatus.FAILED).length;
    
    const totalCost = tasks.reduce((sum, task) => {
      return sum + (task.cost?.total_cost || 0);
    }, 0);
    
    const totalTime = tasks.reduce((sum, task) => {
      if (task.started_at && task.completed_at) {
        const start = new Date(task.started_at).getTime();
        const end = new Date(task.completed_at).getTime();
        return sum + (end - start);
      }
      return sum;
    }, 0);
    
    return {
      total_tasks: tasks.length,
      completed_tasks: completed,
      failed_tasks: failed,
      total_cost_usd: parseFloat(totalCost.toFixed(2)),
      total_time_ms: totalTime,
    };
  }
  
  /**
   * Update session status
   */
  updateSessionStatus(
    sessionId: string,
    status: SessionStatus
  ): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    const now = new Date().toISOString();
    
    session.status = status;
    
    if (status === SessionStatus.COMPLETED || status === SessionStatus.FAILED || status === SessionStatus.CANCELLED) {
      session.completed_at = now;
      
      // Calculate final metrics
      session.metrics = this.calculateSessionMetrics(sessionId) || undefined;
    }
    
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  /**
   * Complete session (auto-calculate metrics)
   */
  completeSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if all tasks are completed or failed
    const tasks = this.getSessionTasks(sessionId);
    const allFinished = tasks.every(
      t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.FAILED || t.status === TaskStatus.CANCELLED
    );
    
    if (!allFinished) {
      throw new Error('Cannot complete session with pending/running tasks');
    }
    
    // Determine session status based on task outcomes
    const hasFailedTasks = tasks.some(t => t.status === TaskStatus.FAILED);
    const finalStatus = hasFailedTasks ? SessionStatus.FAILED : SessionStatus.COMPLETED;
    
    return this.updateSessionStatus(sessionId, finalStatus);
  }
  
  /**
   * Cancel session
   */
  cancelSession(sessionId: string, reason?: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (session.status === SessionStatus.COMPLETED) {
      return session; // Already completed
    }
    
    // Cancel all pending/running tasks
    const tasks = this.getSessionTasks(sessionId);
    
    for (const task of tasks) {
      if (task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) {
        taskManager.cancelTask(task.id, reason || 'Session cancelled');
      }
    }
    
    return this.updateSessionStatus(sessionId, SessionStatus.CANCELLED);
  }
  
  /**
   * Get sessions by user
   */
  getSessionsByUser(userId: string, filters?: {
    status?: SessionStatus;
    agentId?: string;
    limit?: number;
  }): Session[] {
    let sessions = Array.from(this.sessions.values()).filter(s => s.user_id === userId);
    
    if (filters?.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }
    
    if (filters?.agentId) {
      sessions = sessions.filter(s => s.agent_id === filters.agentId);
    }
    
    // Sort by created_at desc
    sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (filters?.limit) {
      sessions = sessions.slice(0, filters.limit);
    }
    
    return sessions;
  }
  
  /**
   * Get sessions by agent
   */
  getSessionsByAgent(agentId: string, filters?: {
    status?: SessionStatus;
    limit?: number;
  }): Session[] {
    let sessions = Array.from(this.sessions.values()).filter(s => s.agent_id === agentId);
    
    if (filters?.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }
    
    // Sort by created_at desc
    sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (filters?.limit) {
      sessions = sessions.slice(0, filters.limit);
    }
    
    return sessions;
  }
  
  /**
   * Get active sessions
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.status === SessionStatus.ACTIVE)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    // Cannot delete session with active tasks
    const tasks = this.getSessionTasks(sessionId);
    const hasActiveTasks = tasks.some(
      t => t.status === TaskStatus.PENDING || t.status === TaskStatus.RUNNING
    );
    
    if (hasActiveTasks) {
      throw new Error('Cannot delete session with active tasks. Cancel session first.');
    }
    
    return this.sessions.delete(sessionId);
  }
  
  /**
   * Get session statistics
   */
  getStatistics(): {
    total_sessions: number;
    active_sessions: number;
    completed_sessions: number;
    failed_sessions: number;
    cancelled_sessions: number;
    average_tasks_per_session: number;
    average_session_duration_ms: number;
  } {
    const sessions = Array.from(this.sessions.values());
    
    const active = sessions.filter(s => s.status === SessionStatus.ACTIVE).length;
    const completed = sessions.filter(s => s.status === SessionStatus.COMPLETED).length;
    const failed = sessions.filter(s => s.status === SessionStatus.FAILED).length;
    const cancelled = sessions.filter(s => s.status === SessionStatus.CANCELLED).length;
    
    const avgTasks = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.task_ids.length, 0) / sessions.length
      : 0;
    
    const completedSessions = sessions.filter(
      s => s.started_at && s.completed_at
    );
    
    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => {
          const start = new Date(s.started_at!).getTime();
          const end = new Date(s.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedSessions.length
      : 0;
    
    return {
      total_sessions: sessions.length,
      active_sessions: active,
      completed_sessions: completed,
      failed_sessions: failed,
      cancelled_sessions: cancelled,
      average_tasks_per_session: parseFloat(avgTasks.toFixed(2)),
      average_session_duration_ms: Math.round(avgDuration),
    };
  }
  
  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(retentionMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        (session.status === SessionStatus.COMPLETED || 
         session.status === SessionStatus.FAILED || 
         session.status === SessionStatus.CANCELLED) &&
        session.completed_at
      ) {
        const completedAt = new Date(session.completed_at).getTime();
        
        if (now - completedAt > retentionMs) {
          this.sessions.delete(sessionId);
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

export const sessionManager = SessionManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create session with initial task
 */
export function createSessionWithTask(
  agentId: string,
  userId: string,
  capability: string,
  params: Record<string, unknown>,
  sessionName?: string
): { session: Session; task: Task } {
  // Create session
  const session = sessionManager.createSession({
    agent_id: agentId,
    user_id: userId,
    name: sessionName,
  });
  
  // Create task
  const task = taskManager.createTask(
    {
      capability,
      params,
      session_id: session.id,
    },
    agentId
  );
  
  // Add task to session
  sessionManager.addTaskToSession(session.id, task.id);
  
  return { session, task };
}

/**
 * Aggregate session results
 */
export function aggregateSessionResults(sessionId: string): {
  success: boolean;
  results: unknown[];
  errors: unknown[];
  metrics: Session['metrics'];
} {
  const tasks = sessionManager.getSessionTasks(sessionId);
  
  const results = tasks
    .filter(t => t.status === TaskStatus.COMPLETED && t.result)
    .map(t => t.result);
  
  const errors = tasks
    .filter(t => t.status === TaskStatus.FAILED && t.error)
    .map(t => t.error);
  
  const metrics = sessionManager.calculateSessionMetrics(sessionId);
  
  return {
    success: errors.length === 0,
    results,
    errors,
    metrics: metrics || {
      total_tasks: 0,
      completed_tasks: 0,
      failed_tasks: 0,
      total_cost_usd: 0,
      total_time_ms: 0,
    },
  };
}
