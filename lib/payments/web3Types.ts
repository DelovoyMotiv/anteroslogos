/**
 * @file lib/payments/web3Types.ts
 * @description Web3 type extensions and utilities for blockchain operations
 * @purpose Provides type-safe wrappers for viem Log types and address extraction
 * 
 * **Feature: production-build-fixes**
 * **Validates: Requirements 5.1, 5.2**
 */

import type { Log } from 'viem';

// =====================================================
// Extended Log Types
// =====================================================

/**
 * Extended log type with topics array
 * Some versions of viem's Log type don't include topics by default
 */
export interface ExtendedLog extends Log {
  topics: readonly `0x${string}`[];
}

// =====================================================
// Type Guards
// =====================================================

/**
 * Type guard to check if a log has topics
 * @param log - Log object to check
 * @returns True if log has topics array, false otherwise
 */
export function hasTopics(log: Log): log is ExtendedLog {
  return 'topics' in log && Array.isArray(log.topics) && log.topics.length > 0;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Safely extract address from topic
 * Topics are 32-byte hex strings, addresses are the last 20 bytes (40 hex chars)
 * @param topic - Topic hex string (0x-prefixed, 66 chars total)
 * @returns Extracted address or null if invalid
 * 
 * @example
 * // Extract address from Transfer event topic
 * const topic = "0x000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913";
 * const address = extractAddressFromTopic(topic);
 * // Returns: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
 */
export function extractAddressFromTopic(
  topic: `0x${string}` | undefined
): `0x${string}` | null {
  if (!topic) {
    return null;
  }

  // Topic should be 66 characters (0x + 64 hex chars)
  if (topic.length !== 66) {
    return null;
  }

  // Extract last 40 hex characters (20 bytes = address)
  const addressHex = topic.slice(-40);
  
  // Validate it's a valid hex string
  if (!/^[a-fA-F0-9]{40}$/.test(addressHex)) {
    return null;
  }

  return `0x${addressHex}` as `0x${string}`;
}

/**
 * Safely extract all addresses from log topics
 * Useful for parsing Transfer events which have from/to addresses in topics
 * @param log - Log object
 * @returns Array of extracted addresses (may be empty)
 * 
 * @example
 * // Parse Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
 * const addresses = extractAddressesFromLog(log);
 * const [from, to] = addresses; // topics[1] = from, topics[2] = to
 */
export function extractAddressesFromLog(log: Log): Array<`0x${string}`> {
  if (!hasTopics(log)) {
    return [];
  }

  const addresses: Array<`0x${string}`> = [];

  // Skip first topic (event signature) and extract addresses from remaining topics
  for (let i = 1; i < log.topics.length; i++) {
    const address = extractAddressFromTopic(log.topics[i]);
    if (address) {
      addresses.push(address);
    }
  }

  return addresses;
}

/**
 * Check if log matches a specific event signature
 * @param log - Log object
 * @param eventSignature - Event signature hash (0x-prefixed)
 * @returns True if log matches event signature
 * 
 * @example
 * // Check for Transfer event
 * const TRANSFER_EVENT_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
 * if (isEventSignature(log, TRANSFER_EVENT_SIG)) {
 *   // Process Transfer event
 * }
 */
export function isEventSignature(
  log: Log,
  eventSignature: `0x${string}`
): boolean {
  if (!hasTopics(log)) {
    return false;
  }

  return log.topics[0] === eventSignature;
}

// =====================================================
// Common Event Signatures
// =====================================================

/**
 * ERC-20 Transfer event signature
 * keccak256("Transfer(address,address,uint256)")
 */
export const TRANSFER_EVENT_SIGNATURE = 
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

/**
 * ERC-20 Approval event signature
 * keccak256("Approval(address,address,uint256)")
 */
export const APPROVAL_EVENT_SIGNATURE = 
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" as const;
