/**
 * Causal Contribution Credits (CCC) Module
 * 
 * Public API exports for CCC system integration
 * 
 * @module core/ccc
 */

// Type exports
export * from './types';

// Ledger exports
export { cccLedger } from './ledger';

// Causal value computation exports
export {
  computeCausalValue,
  computeCCCReward,
  mergeIntoGlobalGraph,
  getGlobalGraphStats
} from './causalValue';

// Integration exports
export {
  processMeshSync,
  handleCCCBalance,
  handleCCCHistory,
  handleCCCTransfer,
  handleCCCStake,
  applyCCCDiscount,
  getCCCStats,
  rewardConsensusParticipation
} from './integration';
