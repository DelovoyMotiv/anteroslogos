/**
 * Mesh Network Type Definitions
 * 
 * @module types/mesh.types
 */

import type { JSONValue } from './common.types';

/**
 * CBOR encodable value
 */
export type CBORValue = 
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | CBORValue[]
  | { [key: string]: CBORValue };

/**
 * Peer metadata
 */
export interface PeerMetadata {
  version: string;
  capabilities: string[];
  lastSeen: number;
  reputation?: number;
  [key: string]: JSONValue | undefined;
}

/**
 * DHT node data
 */
export interface DHTNodeData {
  id: string;
  address: string;
  port: number;
  publicKey: string;
  metadata: PeerMetadata;
}

/**
 * Network message payload
 */
export interface NetworkMessagePayload {
  type: string;
  data: JSONValue;
  timestamp: number;
  signature?: string;
}

/**
 * Compression stats
 */
export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
}

/**
 * Batch message container
 */
export interface BatchMessageContainer {
  messages: JSONValue[];
  compressed: boolean;
  stats?: CompressionStats;
}
