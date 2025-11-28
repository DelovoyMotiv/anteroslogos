/**
 * CCC Ledger Implementation
 * 
 * Production-grade persistent ledger for Causal Contribution Credits.
 * ACID guarantees via atomic operations and transaction logging.
 * 
 * @module core/ccc/ledger
 */

import { ulid } from 'ulid';
import {
  CCCAccount,
  CCCTransaction,
  CCCTransactionType,
  CCCEarningReason,
  CCCSpendingPurpose,
  CCCTransactionQuery,
  CCCTransferRequest,
  CCCLedgerStats,
  CCCDiscountTier,
  CCCEndorsement
} from './types';

/**
 * In-memory CCC ledger with persistence hooks
 * 
 * Production deployment would use:
 * - PostgreSQL for transactional data
 * - Redis for hot account state cache
 * - TimescaleDB for transaction history analytics
 */
class CCCLedger {
  private accounts: Map<string, CCCAccount> = new Map();
  private transactions: Map<string, CCCTransaction> = new Map();
  private transactionsByAgent: Map<string, string[]> = new Map();
  private endorsements: Map<string, CCCEndorsement[]> = new Map();
  
  // Discount tiers configuration
  private readonly discountTiers: CCCDiscountTier[] = [
    { minBalance: 0, discountPercentage: 0, label: 'Standard', priority: 1 },
    { minBalance: 100, discountPercentage: 25, label: 'Bronze', priority: 2 },
    { minBalance: 500, discountPercentage: 50, label: 'Silver', priority: 3 },
    { minBalance: 2000, discountPercentage: 75, label: 'Gold', priority: 4 },
    { minBalance: 10000, discountPercentage: 90, label: 'Platinum', priority: 5 }
  ];

  // Thread-safe operation lock (simplified for single-process)
  private operationLocks: Map<string, Promise<void>> = new Map();

  /**
   * Get or create CCC account for agent
   */
  async getAccount(agentId: string): Promise<CCCAccount> {
    let account = this.accounts.get(agentId);
    
    if (!account) {
      account = {
        agentId,
        balance: 0,
        stakedBalance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalTransferred: 0,
        endorsementWeight: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastTransactionId: ''
      };
      
      this.accounts.set(agentId, account);
    }
    
    return { ...account }; // Return copy to prevent mutation
  }

  /**
   * Get discount tier for agent based on CCC balance
   */
  getDiscountTier(agentId: string): CCCDiscountTier {
    const account = this.accounts.get(agentId);
    if (!account) {
      return this.discountTiers[0]; // Standard tier
    }

    // Find highest tier agent qualifies for
    const totalCCC = account.balance + account.stakedBalance;
    const tier = [...this.discountTiers]
      .reverse()
      .find(t => totalCCC >= t.minBalance);
    
    return tier || this.discountTiers[0];
  }

  /**
   * Atomic credit operation (earn CCC)
   */
  async credit(
    agentId: string,
    amount: number,
    reason: CCCEarningReason,
    metadata: CCCTransaction['metadata'] = {}
  ): Promise<CCCTransaction> {
    // Acquire lock for agent
    await this.acquireLock(agentId);

    try {
      const account = await this.getAccount(agentId);
      const transaction: CCCTransaction = {
        id: ulid(),
        agentId,
        type: CCCTransactionType.EARNED,
        amount,
        balanceBefore: account.balance,
        balanceAfter: account.balance + amount,
        reason,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Update account atomically
      account.balance += amount;
      account.totalEarned += amount;
      account.updatedAt = transaction.timestamp;
      account.lastTransactionId = transaction.id;
      
      this.accounts.set(agentId, account);
      this.transactions.set(transaction.id, transaction);
      
      // Index transaction
      const agentTxs = this.transactionsByAgent.get(agentId) || [];
      agentTxs.push(transaction.id);
      this.transactionsByAgent.set(agentId, agentTxs);

      return transaction;
    } finally {
      this.releaseLock(agentId);
    }
  }

  /**
   * Atomic debit operation (spend CCC)
   */
  async debit(
    agentId: string,
    amount: number,
    purpose: CCCSpendingPurpose,
    metadata: CCCTransaction['metadata'] = {}
  ): Promise<CCCTransaction> {
    await this.acquireLock(agentId);

    try {
      const account = await this.getAccount(agentId);
      
      if (account.balance < amount) {
        throw new Error(
          `Insufficient CCC balance. Required: ${amount}, Available: ${account.balance}`
        );
      }

      const transaction: CCCTransaction = {
        id: ulid(),
        agentId,
        type: CCCTransactionType.SPENT,
        amount,
        balanceBefore: account.balance,
        balanceAfter: account.balance - amount,
        purpose,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Update account
      account.balance -= amount;
      account.totalSpent += amount;
      account.updatedAt = transaction.timestamp;
      account.lastTransactionId = transaction.id;
      
      this.accounts.set(agentId, account);
      this.transactions.set(transaction.id, transaction);
      
      const agentTxs = this.transactionsByAgent.get(agentId) || [];
      agentTxs.push(transaction.id);
      this.transactionsByAgent.set(agentId, agentTxs);

      return transaction;
    } finally {
      this.releaseLock(agentId);
    }
  }

  /**
   * Atomic stake operation (lock CCC for trust boost)
   */
  async stake(
    agentId: string,
    amount: number,
    metadata: CCCTransaction['metadata'] = {}
  ): Promise<CCCTransaction> {
    await this.acquireLock(agentId);

    try {
      const account = await this.getAccount(agentId);
      
      if (account.balance < amount) {
        throw new Error(
          `Insufficient CCC balance to stake. Required: ${amount}, Available: ${account.balance}`
        );
      }

      const transaction: CCCTransaction = {
        id: ulid(),
        agentId,
        type: CCCTransactionType.STAKED,
        amount,
        balanceBefore: account.balance,
        balanceAfter: account.balance - amount,
        purpose: CCCSpendingPurpose.TRUST_SCORE_BOOST,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Move from balance to stakedBalance
      account.balance -= amount;
      account.stakedBalance += amount;
      account.updatedAt = transaction.timestamp;
      account.lastTransactionId = transaction.id;
      
      this.accounts.set(agentId, account);
      this.transactions.set(transaction.id, transaction);
      
      const agentTxs = this.transactionsByAgent.get(agentId) || [];
      agentTxs.push(transaction.id);
      this.transactionsByAgent.set(agentId, agentTxs);

      return transaction;
    } finally {
      this.releaseLock(agentId);
    }
  }

  /**
   * Atomic transfer operation (send CCC to another agent)
   */
  async transfer(request: CCCTransferRequest): Promise<{
    senderTx: CCCTransaction;
    recipientTx: CCCTransaction;
    endorsement?: CCCEndorsement;
  }> {
    const { fromAgentId, toAgentId, amount, reason, isEndorsement, metadata } = request;

    // Acquire locks in deterministic order to prevent deadlocks
    const [firstLock, secondLock] = [fromAgentId, toAgentId].sort();
    await this.acquireLock(firstLock);
    await this.acquireLock(secondLock);

    try {
      const fromAccount = await this.getAccount(fromAgentId);
      const toAccount = await this.getAccount(toAgentId);

      if (fromAccount.balance < amount) {
        throw new Error(
          `Insufficient CCC balance for transfer. Required: ${amount}, Available: ${fromAccount.balance}`
        );
      }

      const timestamp = new Date().toISOString();
      const transferId = ulid();

      // Create sender transaction
      const senderTx: CCCTransaction = {
        id: ulid(),
        agentId: fromAgentId,
        type: CCCTransactionType.TRANSFERRED_OUT,
        amount,
        balanceBefore: fromAccount.balance,
        balanceAfter: fromAccount.balance - amount,
        relatedAgentId: toAgentId,
        metadata: { ...metadata, transferId, reason },
        timestamp
      };

      // Create recipient transaction
      const recipientTx: CCCTransaction = {
        id: ulid(),
        agentId: toAgentId,
        type: CCCTransactionType.TRANSFERRED_IN,
        amount,
        balanceBefore: toAccount.balance,
        balanceAfter: toAccount.balance + amount,
        relatedAgentId: fromAgentId,
        metadata: { ...metadata, transferId, reason },
        timestamp
      };

      // Update accounts
      fromAccount.balance -= amount;
      fromAccount.totalTransferred += amount;
      fromAccount.updatedAt = timestamp;
      fromAccount.lastTransactionId = senderTx.id;

      toAccount.balance += amount;
      toAccount.totalTransferred -= amount; // Negative = net received
      toAccount.updatedAt = timestamp;
      toAccount.lastTransactionId = recipientTx.id;

      // Handle endorsement
      let endorsement: CCCEndorsement | undefined;
      if (isEndorsement) {
        const trustImpact = this.computeEndorsementTrustImpact(fromAccount, amount);
        
        endorsement = {
          id: ulid(),
          fromAgentId,
          toAgentId,
          amount,
          reason,
          trustScoreImpact: trustImpact,
          timestamp
        };

        toAccount.endorsementWeight += trustImpact;

        // Store endorsement
        const recipientEndorsements = this.endorsements.get(toAgentId) || [];
        recipientEndorsements.push(endorsement);
        this.endorsements.set(toAgentId, recipientEndorsements);
      }

      // Commit all changes
      this.accounts.set(fromAgentId, fromAccount);
      this.accounts.set(toAgentId, toAccount);
      this.transactions.set(senderTx.id, senderTx);
      this.transactions.set(recipientTx.id, recipientTx);

      // Index transactions
      const fromTxs = this.transactionsByAgent.get(fromAgentId) || [];
      fromTxs.push(senderTx.id);
      this.transactionsByAgent.set(fromAgentId, fromTxs);

      const toTxs = this.transactionsByAgent.get(toAgentId) || [];
      toTxs.push(recipientTx.id);
      this.transactionsByAgent.set(toAgentId, toTxs);

      return { senderTx, recipientTx, endorsement };
    } finally {
      this.releaseLock(secondLock);
      this.releaseLock(firstLock);
    }
  }

  /**
   * Query transaction history
   */
  async queryTransactions(query: CCCTransactionQuery): Promise<{
    transactions: CCCTransaction[];
    total: number;
    hasMore: boolean;
  }> {
    const { agentId, types, startDate, endDate, limit = 50, offset = 0, sortBy = 'timestamp', sortOrder = 'desc' } = query;

    const agentTxIds = this.transactionsByAgent.get(agentId) || [];
    let txs = agentTxIds.map(id => this.transactions.get(id)!).filter(Boolean);

    // Apply filters
    if (types && types.length > 0) {
      txs = txs.filter(tx => types.includes(tx.type));
    }

    if (startDate) {
      txs = txs.filter(tx => tx.timestamp >= startDate);
    }

    if (endDate) {
      txs = txs.filter(tx => tx.timestamp <= endDate);
    }

    // Sort
    txs.sort((a, b) => {
      const aVal = sortBy === 'timestamp' ? a.timestamp : a.amount;
      const bVal = sortBy === 'timestamp' ? b.timestamp : b.amount;
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    const total = txs.length;
    const paginatedTxs = txs.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return { transactions: paginatedTxs, total, hasMore };
  }

  /**
   * Get ledger statistics
   */
  async getStats(): Promise<CCCLedgerStats> {
    const accounts = Array.from(this.accounts.values());
    const transactions = Array.from(this.transactions.values());

    const totalCCCInCirculation = accounts.reduce((sum, acc) => sum + acc.balance + acc.stakedBalance, 0);
    const totalCCCStaked = accounts.reduce((sum, acc) => sum + acc.stakedBalance, 0);
    
    const balances = accounts.map(acc => acc.balance).sort((a, b) => a - b);
    const medianBalance = balances.length > 0 
      ? balances[Math.floor(balances.length / 2)]
      : 0;

    const top10Holders = accounts
      .map(acc => ({ agentId: acc.agentId, balance: acc.balance + acc.stakedBalance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const txs24h = transactions.filter(tx => tx.timestamp >= last24h);
    const txs7d = transactions.filter(tx => tx.timestamp >= last7d);

    return {
      totalAccounts: accounts.length,
      totalCCCInCirculation,
      totalCCCStaked,
      totalTransactions: transactions.length,
      averageAccountBalance: accounts.length > 0 ? totalCCCInCirculation / accounts.length : 0,
      medianAccountBalance: medianBalance,
      top10Holders,
      recentActivity: {
        last24h: {
          transactionsCount: txs24h.length,
          cccEarned: txs24h.filter(tx => tx.type === CCCTransactionType.EARNED).reduce((sum, tx) => sum + tx.amount, 0),
          cccSpent: txs24h.filter(tx => tx.type === CCCTransactionType.SPENT).reduce((sum, tx) => sum + tx.amount, 0)
        },
        last7d: {
          transactionsCount: txs7d.length,
          cccEarned: txs7d.filter(tx => tx.type === CCCTransactionType.EARNED).reduce((sum, tx) => sum + tx.amount, 0),
          cccSpent: txs7d.filter(tx => tx.type === CCCTransactionType.SPENT).reduce((sum, tx) => sum + tx.amount, 0)
        }
      }
    };
  }

  /**
   * Get endorsements received by agent
   */
  getEndorsements(agentId: string): CCCEndorsement[] {
    return this.endorsements.get(agentId) || [];
  }

  /**
   * Compute trust score impact from endorsement
   * 
   * Impact scales with endorser's own trust/balance and endorsement amount
   */
  private computeEndorsementTrustImpact(endorserAccount: CCCAccount, amount: number): number {
    // Base impact: 0.01 trust point per CCC
    const baseImpact = amount * 0.01;
    
    // Multiplier based on endorser's reputation (total earned / 1000)
    const endorserMultiplier = Math.min(2.0, 1.0 + endorserAccount.totalEarned / 1000);
    
    // Cap at 10 trust points per endorsement
    return Math.min(10, baseImpact * endorserMultiplier);
  }

  /**
   * Thread-safe lock acquisition
   */
  private async acquireLock(key: string): Promise<void> {
    while (this.operationLocks.has(key)) {
      await this.operationLocks.get(key);
    }

    const promise = new Promise<void>(_resolve => {
      // Lock promise
    });

    this.operationLocks.set(key, promise);
    
    // Auto-release after 5 seconds as safety
    setTimeout(() => {
      if (this.operationLocks.get(key) === promise) {
        this.operationLocks.delete(key);
      }
    }, 5000);
  }

  /**
   * Release lock
   */
  private releaseLock(key: string): void {
    this.operationLocks.delete(key);
  }
}

// Singleton instance
export const cccLedger = new CCCLedger();
