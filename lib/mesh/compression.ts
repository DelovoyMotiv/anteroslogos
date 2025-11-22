/**
 * Message Compression for Agent Mesh Network
 * CBOR (Concise Binary Object Representation) encoding/decoding
 * 
 * Features:
 * - CBOR encoding (RFC 8949) for binary compression
 * - Message batching for reduced overhead
 * - Deduplication for repeated data
 * - Payload size optimization
 * - Compression statistics
 * 
 * Why CBOR:
 * - 30-50% smaller than JSON
 * - Type-preserving (dates, binary, undefined)
 * - Self-describing format
 * - Fast parsing (no string escaping)
 * 
 * @module lib/mesh/compression
 * @version 1.0.0
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Compression statistics
 */
export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // compressed / original
  timeTaken: number; // ms
}

/**
 * Message batch
 */
export interface MessageBatch {
  messages: any[];
  timestamp: number;
  batchId: string;
}

/**
 * Deduplication cache entry
 */
interface DeduplicationEntry {
  hash: string;
  data: any;
  timestamp: number;
  hits: number;
}

// =====================================================
// CBOR ENCODER/DECODER
// =====================================================

/**
 * CBOR Major Types
 */
enum CBORMajorType {
  UNSIGNED_INT = 0,
  NEGATIVE_INT = 1,
  BYTE_STRING = 2,
  TEXT_STRING = 3,
  ARRAY = 4,
  MAP = 5,
  TAG = 6,
  SIMPLE_FLOAT = 7,
}

/**
 * CBOR Encoder
 * Implements RFC 8949 subset (common types)
 */
export class CBOREncoder {
  private buffer: number[] = [];

  /**
   * Encode value to CBOR
   */
  encode(value: any): Uint8Array {
    this.buffer = [];
    this.encodeValue(value);
    return new Uint8Array(this.buffer);
  }

  /**
   * Encode any value
   */
  private encodeValue(value: any): void {
    if (value === null) {
      this.encodeNull();
    } else if (value === undefined) {
      this.encodeUndefined();
    } else if (typeof value === 'boolean') {
      this.encodeBoolean(value);
    } else if (typeof value === 'number') {
      this.encodeNumber(value);
    } else if (typeof value === 'string') {
      this.encodeString(value);
    } else if (Array.isArray(value)) {
      this.encodeArray(value);
    } else if (value instanceof Uint8Array) {
      this.encodeBytes(value);
    } else if (value instanceof Date) {
      this.encodeDate(value);
    } else if (typeof value === 'object') {
      this.encodeObject(value);
    } else {
      throw new Error(`Unsupported type: ${typeof value}`);
    }
  }

  /**
   * Encode null
   */
  private encodeNull(): void {
    this.buffer.push(0xf6); // Major 7, additional info 22
  }

  /**
   * Encode undefined
   */
  private encodeUndefined(): void {
    this.buffer.push(0xf7); // Major 7, additional info 23
  }

  /**
   * Encode boolean
   */
  private encodeBoolean(value: boolean): void {
    this.buffer.push(value ? 0xf5 : 0xf4); // Major 7, additional info 20/21
  }

  /**
   * Encode number
   */
  private encodeNumber(value: number): void {
    if (Number.isInteger(value)) {
      if (value >= 0) {
        this.encodeUnsignedInt(value);
      } else {
        this.encodeNegativeInt(value);
      }
    } else {
      this.encodeFloat(value);
    }
  }

  /**
   * Encode unsigned integer
   */
  private encodeUnsignedInt(value: number): void {
    if (value < 24) {
      this.buffer.push((CBORMajorType.UNSIGNED_INT << 5) | value);
    } else if (value < 256) {
      this.buffer.push((CBORMajorType.UNSIGNED_INT << 5) | 24);
      this.buffer.push(value);
    } else if (value < 65536) {
      this.buffer.push((CBORMajorType.UNSIGNED_INT << 5) | 25);
      this.buffer.push((value >> 8) & 0xff);
      this.buffer.push(value & 0xff);
    } else if (value < 4294967296) {
      this.buffer.push((CBORMajorType.UNSIGNED_INT << 5) | 26);
      this.buffer.push((value >> 24) & 0xff);
      this.buffer.push((value >> 16) & 0xff);
      this.buffer.push((value >> 8) & 0xff);
      this.buffer.push(value & 0xff);
    } else {
      // 64-bit (use float representation for large numbers)
      this.encodeFloat(value);
    }
  }

  /**
   * Encode negative integer
   */
  private encodeNegativeInt(value: number): void {
    const absValue = Math.abs(value) - 1;
    if (absValue < 24) {
      this.buffer.push((CBORMajorType.NEGATIVE_INT << 5) | absValue);
    } else if (absValue < 256) {
      this.buffer.push((CBORMajorType.NEGATIVE_INT << 5) | 24);
      this.buffer.push(absValue);
    } else if (absValue < 65536) {
      this.buffer.push((CBORMajorType.NEGATIVE_INT << 5) | 25);
      this.buffer.push((absValue >> 8) & 0xff);
      this.buffer.push(absValue & 0xff);
    } else {
      this.buffer.push((CBORMajorType.NEGATIVE_INT << 5) | 26);
      this.buffer.push((absValue >> 24) & 0xff);
      this.buffer.push((absValue >> 16) & 0xff);
      this.buffer.push((absValue >> 8) & 0xff);
      this.buffer.push(absValue & 0xff);
    }
  }

  /**
   * Encode float (64-bit double)
   */
  private encodeFloat(value: number): void {
    this.buffer.push((CBORMajorType.SIMPLE_FLOAT << 5) | 27);
    
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, false); // big-endian
    
    for (let i = 0; i < 8; i++) {
      this.buffer.push(view.getUint8(i));
    }
  }

  /**
   * Encode string
   */
  private encodeString(value: string): void {
    const utf8 = new TextEncoder().encode(value);
    this.encodeLength(CBORMajorType.TEXT_STRING, utf8.length);
    this.buffer.push(...utf8);
  }

  /**
   * Encode byte string
   */
  private encodeBytes(value: Uint8Array): void {
    this.encodeLength(CBORMajorType.BYTE_STRING, value.length);
    this.buffer.push(...value);
  }

  /**
   * Encode array
   */
  private encodeArray(value: any[]): void {
    this.encodeLength(CBORMajorType.ARRAY, value.length);
    for (const item of value) {
      this.encodeValue(item);
    }
  }

  /**
   * Encode object (as CBOR map)
   */
  private encodeObject(value: any): void {
    const entries = Object.entries(value);
    this.encodeLength(CBORMajorType.MAP, entries.length);
    
    for (const [key, val] of entries) {
      this.encodeString(key);
      this.encodeValue(val);
    }
  }

  /**
   * Encode Date (CBOR tag 1 + epoch timestamp)
   */
  private encodeDate(value: Date): void {
    this.buffer.push((CBORMajorType.TAG << 5) | 1); // Tag 1 = epoch time
    this.encodeNumber(Math.floor(value.getTime() / 1000));
  }

  /**
   * Encode length for variable-length items
   */
  private encodeLength(majorType: CBORMajorType, length: number): void {
    if (length < 24) {
      this.buffer.push((majorType << 5) | length);
    } else if (length < 256) {
      this.buffer.push((majorType << 5) | 24);
      this.buffer.push(length);
    } else if (length < 65536) {
      this.buffer.push((majorType << 5) | 25);
      this.buffer.push((length >> 8) & 0xff);
      this.buffer.push(length & 0xff);
    } else {
      this.buffer.push((majorType << 5) | 26);
      this.buffer.push((length >> 24) & 0xff);
      this.buffer.push((length >> 16) & 0xff);
      this.buffer.push((length >> 8) & 0xff);
      this.buffer.push(length & 0xff);
    }
  }
}

/**
 * CBOR Decoder
 */
export class CBORDecoder {
  private data!: Uint8Array; // Definite assignment assertion
  private offset: number = 0;

  /**
   * Decode CBOR to value
   */
  decode(data: Uint8Array): any {
    this.data = data;
    this.offset = 0;
    return this.decodeValue();
  }

  /**
   * Decode any value
   */
  private decodeValue(): any {
    const byte = this.data[this.offset++];
    const majorType = (byte >> 5) & 0x07;
    const additionalInfo = byte & 0x1f;

    switch (majorType) {
      case CBORMajorType.UNSIGNED_INT:
        return this.decodeUnsignedInt(additionalInfo);
      case CBORMajorType.NEGATIVE_INT:
        return this.decodeNegativeInt(additionalInfo);
      case CBORMajorType.BYTE_STRING:
        return this.decodeBytes(additionalInfo);
      case CBORMajorType.TEXT_STRING:
        return this.decodeString(additionalInfo);
      case CBORMajorType.ARRAY:
        return this.decodeArray(additionalInfo);
      case CBORMajorType.MAP:
        return this.decodeMap(additionalInfo);
      case CBORMajorType.TAG:
        return this.decodeTag(additionalInfo);
      case CBORMajorType.SIMPLE_FLOAT:
        return this.decodeSimpleOrFloat(additionalInfo);
      default:
        throw new Error(`Unknown major type: ${majorType}`);
    }
  }

  /**
   * Decode unsigned integer
   */
  private decodeUnsignedInt(additionalInfo: number): number {
    if (additionalInfo < 24) {
      return additionalInfo;
    } else if (additionalInfo === 24) {
      return this.data[this.offset++];
    } else if (additionalInfo === 25) {
      const value = (this.data[this.offset] << 8) | this.data[this.offset + 1];
      this.offset += 2;
      return value;
    } else if (additionalInfo === 26) {
      const value = 
        (this.data[this.offset] << 24) |
        (this.data[this.offset + 1] << 16) |
        (this.data[this.offset + 2] << 8) |
        this.data[this.offset + 3];
      this.offset += 4;
      return value;
    }
    throw new Error('Unsupported integer size');
  }

  /**
   * Decode negative integer
   */
  private decodeNegativeInt(additionalInfo: number): number {
    return -1 - this.decodeUnsignedInt(additionalInfo);
  }

  /**
   * Decode byte string
   */
  private decodeBytes(additionalInfo: number): Uint8Array {
    const length = this.decodeUnsignedInt(additionalInfo);
    const bytes = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    return bytes;
  }

  /**
   * Decode text string
   */
  private decodeString(additionalInfo: number): string {
    const bytes = this.decodeBytes(additionalInfo);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Decode array
   */
  private decodeArray(additionalInfo: number): any[] {
    const length = this.decodeUnsignedInt(additionalInfo);
    const array: any[] = [];
    
    for (let i = 0; i < length; i++) {
      array.push(this.decodeValue());
    }
    
    return array;
  }

  /**
   * Decode map (object)
   */
  private decodeMap(additionalInfo: number): any {
    const length = this.decodeUnsignedInt(additionalInfo);
    const map: any = {};
    
    for (let i = 0; i < length; i++) {
      const key = this.decodeValue();
      const value = this.decodeValue();
      map[key] = value;
    }
    
    return map;
  }

  /**
   * Decode tag
   */
  private decodeTag(tag: number): any {
    if (tag === 1) {
      // Tag 1 = epoch timestamp
      const epochSeconds = this.decodeValue();
      return new Date(epochSeconds * 1000);
    }
    
    // Unknown tag - just decode value
    return this.decodeValue();
  }

  /**
   * Decode simple value or float
   */
  private decodeSimpleOrFloat(additionalInfo: number): any {
    if (additionalInfo === 20) {
      return false;
    } else if (additionalInfo === 21) {
      return true;
    } else if (additionalInfo === 22) {
      return null;
    } else if (additionalInfo === 23) {
      return undefined;
    } else if (additionalInfo === 27) {
      // 64-bit float
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, this.data[this.offset++]);
      }
      
      return view.getFloat64(0, false); // big-endian
    }
    
    throw new Error(`Unsupported simple/float value: ${additionalInfo}`);
  }
}

// =====================================================
// COMPRESSION UTILITIES
// =====================================================

export class MessageCompressor {
  private encoder = new CBOREncoder();
  private decoder = new CBORDecoder();
  private deduplicationCache: Map<string, DeduplicationEntry> = new Map();
  
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Compress message to CBOR
   */
  compress(message: any): { data: Uint8Array; stats: CompressionStats } {
    const startTime = Date.now();
    
    // Deduplicate if possible
    const hash = this.hashMessage(message);
    const cached = this.deduplicationCache.get(hash);
    
    if (cached) {
      cached.hits++;
      return {
        data: this.encoder.encode(cached.data),
        stats: {
          originalSize: JSON.stringify(message).length,
          compressedSize: this.encoder.encode(cached.data).length,
          compressionRatio: 0, // Will be calculated
          timeTaken: Date.now() - startTime,
        },
      };
    }

    // Encode to CBOR
    const compressed = this.encoder.encode(message);
    
    // Cache for deduplication
    this.cacheMessage(hash, message);

    const originalSize = JSON.stringify(message).length;
    const compressedSize = compressed.length;

    const stats: CompressionStats = {
      originalSize,
      compressedSize,
      compressionRatio: compressedSize / originalSize,
      timeTaken: Date.now() - startTime,
    };

    return { data: compressed, stats };
  }

  /**
   * Decompress CBOR to message
   */
  decompress(data: Uint8Array): any {
    return this.decoder.decode(data);
  }

  /**
   * Batch multiple messages
   */
  batchMessages(messages: any[]): { data: Uint8Array; stats: CompressionStats } {
    const batch: MessageBatch = {
      messages,
      timestamp: Date.now(),
      batchId: this.generateBatchId(),
    };

    return this.compress(batch);
  }

  /**
   * Unbatch messages
   */
  unbatchMessages(data: Uint8Array): any[] {
    const batch = this.decompress(data) as MessageBatch;
    return batch.messages;
  }

  /**
   * Hash message for deduplication
   */
  private hashMessage(message: any): string {
    const json = JSON.stringify(message);
    
    // Simple hash (FNV-1a)
    let hash = 2166136261;
    for (let i = 0; i < json.length; i++) {
      hash ^= json.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    
    return (hash >>> 0).toString(16);
  }

  /**
   * Cache message for deduplication
   */
  private cacheMessage(hash: string, data: any): void {
    // Evict oldest if cache full
    if (this.deduplicationCache.size >= this.MAX_CACHE_SIZE) {
      const oldest = Array.from(this.deduplicationCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      
      if (oldest) {
        this.deduplicationCache.delete(oldest[0]);
      }
    }

    this.deduplicationCache.set(hash, {
      hash,
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear deduplication cache
   */
  clearCache(): void {
    this.deduplicationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    totalHits: number;
    avgHits: number;
  } {
    const entries = Array.from(this.deduplicationCache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    
    return {
      size: this.deduplicationCache.size,
      totalHits,
      avgHits: entries.length > 0 ? totalHits / entries.length : 0,
    };
  }
}

// =====================================================
// GLOBAL INSTANCE
// =====================================================

let globalCompressor: MessageCompressor | null = null;

/**
 * Get or create global message compressor
 */
export function getMessageCompressor(): MessageCompressor {
  if (!globalCompressor) {
    globalCompressor = new MessageCompressor();
  }
  return globalCompressor;
}

// =====================================================
// EXPORTS
// =====================================================

export default MessageCompressor;
