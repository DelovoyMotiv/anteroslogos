/**
 * A2A Payment Extension - Linux Foundation A2A Protocol v1.0
 * 
 * Integrates A2A task lifecycle with existing APA micropayment system
 * Supports USDC payments on Base L2 for task execution
 * 
 * Extension Spec: agent-card.json extensions.payment
 */

import { createInvoice, Invoice } from '../payments/invoice';
import { Task, TaskStatus, taskManager } from './taskManager';
import { agentCardManager } from './agentCard';

// =====================================================
// PAYMENT EXTENSION TYPES
// =====================================================

export interface TaskPaymentRequirement {
  task_id: string;
  amount_usd: number;
  currency: 'USDC';
  network: 'base-l2';
  required_before: 'execution' | 'completion' | 'none';
}

export interface TaskInvoice {
  task_id: string;
  invoice_id: string;
  invoice: Invoice;
  payment_status: 'pending' | 'paid' | 'expired' | 'refunded';
  required_before_execution: boolean;
}

// =====================================================
// PAYMENT EXTENSION MANAGER
// =====================================================

export class PaymentExtensionManager {
  private static instance: PaymentExtensionManager;
  private taskInvoices: Map<string, TaskInvoice> = new Map();
  
  private constructor() {}
  
  static getInstance(): PaymentExtensionManager {
    if (!PaymentExtensionManager.instance) {
      PaymentExtensionManager.instance = new PaymentExtensionManager();
    }
    return PaymentExtensionManager.instance;
  }
  
  /**
   * Check if payment extension is enabled
   */
  isPaymentEnabled(): boolean {
    const card = agentCardManager.getCard();
    return card.extensions?.payment?.supported || false;
  }
  
  /**
   * Get payment configuration from agent card
   */
  getPaymentConfig(): {
    network: string;
    token: string;
    wallet_address?: string;
  } | null {
    const card = agentCardManager.getCard();
    
    if (!card.extensions?.payment?.supported) {
      return null;
    }
    
    return {
      network: card.extensions.payment.network,
      token: card.extensions.payment.token,
      wallet_address: card.extensions.payment.wallet_address,
    };
  }
  
  /**
   * Calculate payment requirement for task
   */
  async calculateTaskPayment(
    task: Task,
    userTier: 'free' | 'basic' | 'pro' = 'basic'
  ): Promise<TaskPaymentRequirement> {
    // Base price from agent card pricing
    const card = agentCardManager.getCard();
    const basePrice = parseFloat(card.pricing?.base_price || '0.10');
    
    // Priority multiplier
    let priorityMultiplier = 1.0;
    switch (task.priority) {
      case 'low':
        priorityMultiplier = 0.8;
        break;
      case 'normal':
        priorityMultiplier = 1.0;
        break;
      case 'high':
        priorityMultiplier = 1.5;
        break;
      case 'critical':
        priorityMultiplier = 2.0;
        break;
    }
    
    // Tier discount
    let tierDiscount = 1.0;
    switch (userTier) {
      case 'free':
        tierDiscount = 1.0; // No discount
        break;
      case 'basic':
        tierDiscount = 0.9; // 10% discount
        break;
      case 'pro':
        tierDiscount = 0.75; // 25% discount
        break;
    }
    
    const finalAmount = basePrice * priorityMultiplier * tierDiscount;
    
    return {
      task_id: task.id,
      amount_usd: parseFloat(finalAmount.toFixed(2)),
      currency: 'USDC',
      network: 'base-l2',
      required_before: task.priority === 'critical' ? 'execution' : 'completion',
    };
  }
  
  /**
   * Create invoice for task
   */
  async createTaskInvoice(
    task: Task,
    userId: string,
    userTier: 'free' | 'basic' | 'pro' = 'basic'
  ): Promise<TaskInvoice> {
    // Check if payment extension is enabled
    if (!this.isPaymentEnabled()) {
      throw new Error('Payment extension not enabled for this agent');
    }
    
    // Check if invoice already exists for this task
    const existing = this.taskInvoices.get(task.id);
    if (existing) {
      return existing;
    }
    
    // Calculate payment requirement
    const payment = await this.calculateTaskPayment(task, userTier);
    
    // Create invoice using APA system
    // NOTE: createInvoice calculates price based on tier (free/basic/pro)
    // For A2A tasks, we use 'basic' tier by default
    const invoice = await createInvoice({
      userId,
      method: task.capability,
      params: task.params,
      tier: userTier,
      token: payment.currency,
      ttlSeconds: 3600, // 1 hour expiration
    });
    
    // Store task invoice mapping
    const taskInvoice: TaskInvoice = {
      task_id: task.id,
      invoice_id: invoice.id,
      invoice,
      payment_status: 'pending',
      required_before_execution: payment.required_before === 'execution',
    };
    
    this.taskInvoices.set(task.id, taskInvoice);
    
    // Add payment metadata to task
    if (!task.extensions) {
      task.extensions = {};
    }
    
    task.extensions.payment = {
      invoice_id: invoice.id,
      amount_usd: payment.amount_usd,
      currency: payment.currency,
      status: 'pending',
      required_before: payment.required_before,
    };
    
    return taskInvoice;
  }
  
  /**
   * Verify task payment status
   * Checks both in-memory cache and Supabase for payment confirmation
   */
  async verifyTaskPayment(taskId: string): Promise<{
    paid: boolean;
    status: string;
    tx_hash?: string;
    confirmed_at?: string;
  }> {
    const taskInvoice = this.taskInvoices.get(taskId);
    
    if (!taskInvoice) {
      return {
        paid: false,
        status: 'no_invoice',
      };
    }
    
    // Return cached status immediately if already paid
    if (taskInvoice.payment_status === 'paid') {
      return {
        paid: true,
        status: 'paid',
        tx_hash: taskInvoice.invoice.txHash,
        confirmed_at: taskInvoice.invoice.confirmedAt?.toISOString(),
      };
    }
    
    // For pending payments, status is tracked via blockchain verification
    // (see lib/payments/verify.ts for on-chain payment verification)
    // Payment verification happens via:
    // 1. User submits txHash via API endpoint
    // 2. Backend verifies transaction on Base L2
    // 3. markTaskPaid() is called on success
    
    return {
      paid: false,
      status: taskInvoice.payment_status,
      tx_hash: taskInvoice.invoice.txHash,
      confirmed_at: taskInvoice.invoice.confirmedAt?.toISOString(),
    };
  }
  
  /**
   * Mark task payment as paid
   */
  async markTaskPaid(
    taskId: string,
    txHash: string,
    blockNumber?: bigint,
    confirmedAt?: Date
  ): Promise<void> {
    const taskInvoice = this.taskInvoices.get(taskId);
    
    if (!taskInvoice) {
      throw new Error(`No invoice found for task ${taskId}`);
    }
    
    // Update invoice status
    taskInvoice.payment_status = 'paid';
    taskInvoice.invoice.txHash = txHash;
    taskInvoice.invoice.blockNumber = blockNumber;
    taskInvoice.invoice.confirmedAt = confirmedAt || new Date();
    
    // Update task extensions
    const task = taskManager.getTask(taskId);
    if (task && task.extensions?.payment) {
      task.extensions.payment.status = 'paid';
      task.extensions.payment.tx_hash = txHash;
      task.extensions.payment.confirmed_at = confirmedAt?.toISOString();
    }
    
    this.taskInvoices.set(taskId, taskInvoice);
  }
  
  /**
   * Check if task can execute (payment gate)
   */
  async canTaskExecute(taskId: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const taskInvoice = this.taskInvoices.get(taskId);
    
    // No invoice = free execution (for free tier or non-payment tasks)
    if (!taskInvoice) {
      return { allowed: true };
    }
    
    // If payment required before execution
    if (taskInvoice.required_before_execution) {
      const verification = await this.verifyTaskPayment(taskId);
      
      if (!verification.paid) {
        return {
          allowed: false,
          reason: `Payment required before execution. Invoice: ${taskInvoice.invoice_id}`,
        };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Get task invoice
   */
  getTaskInvoice(taskId: string): TaskInvoice | null {
    return this.taskInvoices.get(taskId) || null;
  }
  
  /**
   * Get all invoices for user
   */
  getInvoicesByUser(userId: string): TaskInvoice[] {
    return Array.from(this.taskInvoices.values()).filter(
      ti => ti.invoice.userId === userId
    );
  }
  
  /**
   * Calculate total revenue from paid tasks
   */
  calculateRevenue(filter?: {
    startDate?: Date;
    endDate?: Date;
    currency?: 'USDC';
  }): {
    total_usd: number;
    count: number;
    currency: 'USDC';
  } {
    let total = 0;
    let count = 0;
    
    for (const taskInvoice of this.taskInvoices.values()) {
      if (taskInvoice.payment_status !== 'paid') {
        continue;
      }
      
      // Filter by date range
      if (filter?.startDate && taskInvoice.invoice.confirmedAt) {
        if (taskInvoice.invoice.confirmedAt < filter.startDate) {
          continue;
        }
      }
      
      if (filter?.endDate && taskInvoice.invoice.confirmedAt) {
        if (taskInvoice.invoice.confirmedAt > filter.endDate) {
          continue;
        }
      }
      
      // Filter by currency
      if (filter?.currency && taskInvoice.invoice.token !== filter.currency) {
        continue;
      }
      
      total += taskInvoice.invoice.amount;
      count++;
    }
    
    return {
      total_usd: parseFloat(total.toFixed(2)),
      count,
      currency: 'USDC',
    };
  }
  
  /**
   * Cleanup expired invoices
   */
  cleanupExpiredInvoices(): number {
    const now = new Date();
    let cleaned = 0;
    
    for (const [taskId, taskInvoice] of this.taskInvoices.entries()) {
      if (taskInvoice.payment_status === 'pending' && taskInvoice.invoice.expiresAt < now) {
        taskInvoice.payment_status = 'expired';
        
        // Mark task as failed due to payment expiration
        const task = taskManager.getTask(taskId);
        if (task && task.status === TaskStatus.PENDING) {
          taskManager.updateTaskStatus(taskId, TaskStatus.FAILED, {
            error: {
              code: 'PAYMENT_EXPIRED',
              message: 'Payment invoice expired before execution',
              details: {
                invoice_id: taskInvoice.invoice_id,
                expired_at: taskInvoice.invoice.expiresAt.toISOString(),
              },
            },
          });
        }
        
        this.taskInvoices.delete(taskId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const paymentExtension = PaymentExtensionManager.getInstance();

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Create task with payment requirement
 */
export async function createPaidTask(
  capability: string,
  params: Record<string, any>,
  userId: string,
  options?: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    userTier?: 'free' | 'basic' | 'pro';
    sessionId?: string;
  }
): Promise<{ task: Task; invoice: TaskInvoice | null }> {
  const agentId = agentCardManager.getCard().id;
  
  // Create task
  const task = taskManager.createTask(
    {
      capability,
      params,
      priority: options?.priority as any,
      session_id: options?.sessionId,
    },
    agentId
  );
  
  // Create invoice if payment extension is enabled
  let invoice: TaskInvoice | null = null;
  
  if (paymentExtension.isPaymentEnabled()) {
    try {
      invoice = await paymentExtension.createTaskInvoice(
        task,
        userId,
        options?.userTier || 'basic'
      );
    } catch (error) {
      console.error('Failed to create invoice for task:', error);
      // Continue without invoice - task can still execute
    }
  }
  
  return { task, invoice };
}
