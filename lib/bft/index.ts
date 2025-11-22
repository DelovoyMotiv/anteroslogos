/**
 * Byzantine Fault Tolerance (BFT) Module
 * Production-grade PBFT consensus for Agent Mesh Network
 * 
 * @module lib/bft
 * @version 1.0.0
 */

// Core types and schemas
export * from './types';

// Storage layer
export { BFTStorage, getBFTStorage } from './storage';
export type { ConsensusStatistics, ByzantineStatistics } from './storage';

// PBFT consensus engine
export { PBFTConsensus } from './pbftConsensus';

// BFT router
export { 
  BFTRouter, 
  getBFTRouter, 
  initializeBFTRouter 
} from './bftRouter';
export type { 
  BFTRoutingOptions, 
  BFTRoutingResult 
} from './bftRouter';
