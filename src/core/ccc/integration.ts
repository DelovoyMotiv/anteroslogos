/**
 * CCC Integration Layer
 * 
 * Integrates CCC system with:
 * 1. A2A mesh network sync (reward on knowledge graph contribution)
 * 2. A2A protocol methods (ccc.balance, ccc.history, ccc.transfer)
 * 3. APA payment system (CCC discounts on invoices)
 * 
 * @module core/ccc/integration
 */

import { cccLedger } from './ledger';
import { computeCausalValue, computeCCCReward, mergeIntoGlobalGraph } from './causalValue';
import {
  KnowledgeGraphDelta,
  CCCEarningReason,
  CCCSpendingPurpose,
  CCCTransactionQuery,
  CCCTransferRequest
} from './types';

/**
 * Process knowledge graph sync and award CCC tokens
 * Called from a2a.mesh.sync handler
 */
export async function processMeshSync(delta: KnowledgeGraphDelta): Promise<{
  cccAwarded: number;
  causalValueScore: number;
  transactionId: string;
}> {
  console.log(`[CCC Integration] Processing mesh sync from ${delta.agentId}`);

  // Step 1: Compute causal value of delta
  const causalValue = await computeCausalValue(delta);
  console.log(`[CCC Integration] Causal value score: ${causalValue.totalScore.toFixed(2)}`);

  // Step 2: Compute CCC reward
  const cccReward = computeCCCReward(causalValue, delta);
  
  if (cccReward === 0) {
    console.log(`[CCC Integration] No CCC awarded (score below threshold or zero reward)`);
    return {
      cccAwarded: 0,
      causalValueScore: causalValue.totalScore,
      transactionId: ''
    };
  }

  // Step 3: Award CCC tokens
  const transaction = await cccLedger.credit(
    delta.agentId,
    cccReward,
    CCCEarningReason.KNOWLEDGE_GRAPH_SYNC,
    {
      knowledgeGraphDeltaId: delta.id,
      causalValueScore: causalValue.totalScore,
      noveltyScore: causalValue.components.noveltyScore,
      connectivityScore: causalValue.components.connectivityScore,
      predictionImprovementScore: causalValue.components.predictionImprovementScore,
      entitiesCount: delta.entities.length,
      relationshipsCount: delta.relationships.length
    }
  );

  console.log(
    `[CCC Integration] ✅ Awarded ${cccReward.toFixed(2)} CCC to ${delta.agentId} (tx: ${transaction.id})`
  );

  // Step 4: Merge delta into global graph for future novelty detection
  mergeIntoGlobalGraph(delta);

  return {
    cccAwarded: cccReward,
    causalValueScore: causalValue.totalScore,
    transactionId: transaction.id
  };
}

/**
 * A2A Method: a2a.ccc.balance
 * Get CCC account balance
 */
export async function handleCCCBalance(agentId: string): Promise<{
  agentId: string;
  balance: number;
  stakedBalance: number;
  totalEarned: number;
  totalSpent: number;
  endorsementWeight: number;
  discountTier: {
    label: string;
    discountPercentage: number;
    priority: number;
  };
}> {
  const account = await cccLedger.getAccount(agentId);
  const tier = cccLedger.getDiscountTier(agentId);

  return {
    agentId: account.agentId,
    balance: account.balance,
    stakedBalance: account.stakedBalance,
    totalEarned: account.totalEarned,
    totalSpent: account.totalSpent,
    endorsementWeight: account.endorsementWeight,
    discountTier: {
      label: tier.label,
      discountPercentage: tier.discountPercentage,
      priority: tier.priority
    }
  };
}

/**
 * A2A Method: a2a.ccc.history
 * Get CCC transaction history
 */
export async function handleCCCHistory(
  query: CCCTransactionQuery
): Promise<{
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason?: string;
    purpose?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }>;
  total: number;
  hasMore: boolean;
}> {
  const result = await cccLedger.queryTransactions(query);

  return {
    transactions: result.transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      reason: tx.reason,
      purpose: tx.purpose,
      timestamp: tx.timestamp,
      metadata: tx.metadata
    })),
    total: result.total,
    hasMore: result.hasMore
  };
}

/**
 * A2A Method: a2a.ccc.transfer
 * Transfer CCC tokens to another agent
 */
export async function handleCCCTransfer(
  request: CCCTransferRequest
): Promise<{
  success: boolean;
  senderBalance: number;
  recipientBalance: number;
  transactionId: string;
  endorsementCreated: boolean;
  trustImpact?: number;
}> {
  // Validate transfer
  if (request.amount <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  if (request.fromAgentId === request.toAgentId) {
    throw new Error('Cannot transfer to self');
  }

  // Execute transfer
  const result = await cccLedger.transfer(request);

  // Get updated balances
  const senderAccount = await cccLedger.getAccount(request.fromAgentId);
  const recipientAccount = await cccLedger.getAccount(request.toAgentId);

  return {
    success: true,
    senderBalance: senderAccount.balance,
    recipientBalance: recipientAccount.balance,
    transactionId: result.senderTx.id,
    endorsementCreated: !!result.endorsement,
    trustImpact: result.endorsement?.trustScoreImpact
  };
}

/**
 * A2A Method: a2a.ccc.stake
 * Stake CCC tokens for trust score boost
 */
export async function handleCCCStake(
  agentId: string,
  amount: number
): Promise<{
  success: boolean;
  stakedBalance: number;
  availableBalance: number;
  estimatedTrustBoost: number;
  transactionId: string;
}> {
  if (amount <= 0) {
    throw new Error('Stake amount must be positive');
  }

  // Execute stake
  const transaction = await cccLedger.stake(agentId, amount, {
    purpose: 'trust_score_boost'
  });

  // Get updated account
  const account = await cccLedger.getAccount(agentId);

  // Estimate trust boost (0.01 trust points per CCC staked, max 15 points)
  const estimatedTrustBoost = Math.min(15, amount * 0.01);

  return {
    success: true,
    stakedBalance: account.stakedBalance,
    availableBalance: account.balance,
    estimatedTrustBoost,
    transactionId: transaction.id
  };
}

/**
 * APA Payment Integration: Apply CCC discount to invoice
 */
export async function applyCCCDiscount(
  agentId: string,
  baseAmount: number,
  auditId?: string
): Promise<{
  originalAmount: number;
  discountPercentage: number;
  discountedAmount: number;
  cccDeducted: number;
  tier: string;
}> {
  const tier = cccLedger.getDiscountTier(agentId);
  
  // Calculate discount
  const discountPercentage = tier.discountPercentage;
  const discountAmount = baseAmount * (discountPercentage / 100);
  const discountedAmount = baseAmount - discountAmount;

  // CCC cost for discount (1 CCC = 0.01 USDC discount coverage)
  // e.g., 50% discount on $0.10 = $0.05 discount = 5 CCC deducted
  const cccCost = discountAmount * 100;

  // Deduct CCC if balance sufficient
  let actualCCCDeducted = 0;
  if (cccCost > 0) {
    try {
      const account = await cccLedger.getAccount(agentId);
      if (account.balance >= cccCost) {
        await cccLedger.debit(
          agentId,
          cccCost,
          CCCSpendingPurpose.AUDIT_DISCOUNT,
          {
            auditId,
            discountPercentage,
            originalAmount: baseAmount,
            discountedAmount
          }
        );
        actualCCCDeducted = cccCost;
      } else {
        console.warn(
          `[CCC Integration] Insufficient CCC balance for discount. Required: ${cccCost}, Available: ${account.balance}`
        );
      }
    } catch (error) {
      console.error('[CCC Integration] Failed to deduct CCC for discount:', error);
    }
  }

  return {
    originalAmount: baseAmount,
    discountPercentage,
    discountedAmount: actualCCCDeducted > 0 ? discountedAmount : baseAmount,
    cccDeducted: actualCCCDeducted,
    tier: tier.label
  };
}

/**
 * Get CCC ledger statistics (for admin/monitoring)
 */
export async function getCCCStats() {
  return await cccLedger.getStats();
}

/**
 * Bonus: Auto-reward for consensus participation
 * Called when agent participates in BFT consensus round
 */
export async function rewardConsensusParticipation(
  agentId: string,
  consensusRoundId: string,
  wasValid: boolean
): Promise<number> {
  if (!wasValid) {
    return 0;
  }

  // Award 0.1 CCC per successful consensus participation
  const rewardAmount = 0.1;
  
  const transaction = await cccLedger.credit(
    agentId,
    rewardAmount,
    CCCEarningReason.CONSENSUS_PARTICIPATION,
    {
      consensusRoundId,
      type: 'bft_round'
    }
  );

  console.log(
    `[CCC Integration] Awarded ${rewardAmount} CCC for consensus participation (tx: ${transaction.id})`
  );

  return rewardAmount;
}
