/**
 * @file lib/payments/wallet.ts
 * @description Secure EVM wallet management for Agent-Pay-Agent (APA) system
 * @standards Base L2 (Chain ID 8453), EIP-55 checksum addresses, AES-256-GCM encryption
 * @security Zero-trust, KMS-derived encryption keys, private keys never leave encrypted storage
 */

import { randomBytes } from "node:crypto";
import { createCipheriv, createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Wallet, getAddress } from "ethers";
import { z } from "zod";
import {
  WalletCreateInputSchema,
  CustodialWalletSchema,
  NonCustodialWalletSchema,
  type WalletRow,
  type CustodialWallet,
  type NonCustodialWallet,
  BASE_L2_CHAIN_ID,
} from "./types";

// =====================================================
// Environment & Configuration
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY!; // 32-byte hex from KMS

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

if (!WALLET_ENCRYPTION_KEY) {
  throw new Error("WALLET_ENCRYPTION_KEY must be set (32-byte hex from KMS)");
}

// Validate encryption key format (64 hex chars = 32 bytes)
if (!/^[0-9a-fA-F]{64}$/.test(WALLET_ENCRYPTION_KEY)) {
  throw new Error(
    "WALLET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ENCRYPTION_KEY_BUFFER = Buffer.from(WALLET_ENCRYPTION_KEY, "hex");
const ENCRYPTION_ALGORITHM = "aes-256-gcm" as const;
const GCM_NONCE_LENGTH = 12; // bytes (96 bits, recommended for GCM)
const GCM_TAG_LENGTH = 16; // bytes (128 bits)

// =====================================================
// Types
// =====================================================

interface EncryptionResult {
  ciphertext: string; // Base64-encoded
  nonce: string; // Base64-encoded
  authTag: string; // Base64-encoded (GCM authentication tag)
}

interface DecryptionInput {
  ciphertext: string; // Base64-encoded
  nonce: string; // Base64-encoded
  authTag: string; // Base64-encoded
}

export interface WalletServiceConfig {
  userId?: string; // For user-specific operations
  agentId?: string; // For agent-specific operations
}

// =====================================================
// Encryption Utilities (AES-256-GCM)
// =====================================================

/**
 * Encrypts private key using AES-256-GCM with KMS-derived key
 * @param plaintext - Private key hex string (without 0x prefix)
 * @returns Encrypted result with nonce and authentication tag
 * @throws Error if encryption fails
 */
function encryptPrivateKey(plaintext: string): EncryptionResult {
  try {
    // Generate random nonce (12 bytes for GCM)
    const nonce = randomBytes(GCM_NONCE_LENGTH);

    // Create cipher
    const cipher = createCipheriv(
      ENCRYPTION_ALGORITHM,
      ENCRYPTION_KEY_BUFFER,
      nonce
    );

    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      nonce: nonce.toString("base64"),
      authTag: authTag.toString("base64"),
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts private key using AES-256-GCM with KMS-derived key
 * @param input - Encrypted data with nonce and auth tag
 * @returns Decrypted private key hex string (without 0x prefix)
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
function decryptPrivateKey(input: DecryptionInput): string {
  try {
    // Decode nonce and auth tag
    const nonce = Buffer.from(input.nonce, "base64");
    const authTag = Buffer.from(input.authTag, "base64");

    // Validate lengths
    if (nonce.length !== GCM_NONCE_LENGTH) {
      throw new Error(
        `Invalid nonce length: ${nonce.length} (expected ${GCM_NONCE_LENGTH})`
      );
    }
    if (authTag.length !== GCM_TAG_LENGTH) {
      throw new Error(
        `Invalid auth tag length: ${authTag.length} (expected ${GCM_TAG_LENGTH})`
      );
    }

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      ENCRYPTION_KEY_BUFFER,
      nonce
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(input.ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// =====================================================
// Wallet Generation
// =====================================================

/**
 * Generates a new Ethereum wallet (private key + address)
 * @returns ethers.js Wallet instance
 */
function generateEthereumWallet(): Wallet {
  return Wallet.createRandom() as unknown as Wallet;
}

/**
 * Validates and checksums an Ethereum address
 * @param address - Raw address (with or without 0x prefix)
 * @returns EIP-55 checksummed address
 * @throws Error if address is invalid
 */
function checksumAddress(address: string): string {
  try {
    const normalized = address.toLowerCase().replace(/^0x/, "");
    if (!/^[0-9a-f]{40}$/.test(normalized)) {
      throw new Error("Invalid address format");
    }
    // Use ethers.js getAddress for EIP-55 checksum
    return getAddress(`0x${normalized}`);
  } catch (error) {
    throw new Error(
      `Invalid Ethereum address: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// =====================================================
// Database Operations
// =====================================================

/**
 * Inserts wallet row into database
 * @param row - Wallet row data
 * @returns Inserted row with database-generated fields
 */
async function insertWalletRow(
  row: Omit<WalletRow, "id" | "created_at" | "updated_at">
): Promise<WalletRow> {
  const { data, error } = await supabase
    .from("a2a_wallets")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }

  if (!data) {
    throw new Error("Insert succeeded but no data returned");
  }

  return data as WalletRow;
}

/**
 * Fetches wallet row by address
 * @param address - EVM address (checksummed)
 * @returns Wallet row or null if not found
 */
async function getWalletByAddress(
  address: string
): Promise<WalletRow | null> {
  const { data, error } = await supabase
    .from("a2a_wallets")
    .select()
    .eq("address", address)
    .eq("chain_id", BASE_L2_CHAIN_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data as WalletRow | null;
}

/**
 * Fetches wallet row by user ID
 * @param userId - User UUID
 * @returns Wallet row or null if not found
 */
async function getWalletByUserId(userId: string): Promise<WalletRow | null> {
  const { data, error } = await supabase
    .from("a2a_wallets")
    .select()
    .eq("user_id", userId)
    .eq("chain_id", BASE_L2_CHAIN_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data as WalletRow | null;
}

/**
 * Fetches wallet row by agent ID
 * @param agentId - Agent UUID
 * @returns Wallet row or null if not found
 */
async function getWalletByAgentId(agentId: string): Promise<WalletRow | null> {
  const { data, error } = await supabase
    .from("a2a_wallets")
    .select()
    .eq("agent_id", agentId)
    .eq("chain_id", BASE_L2_CHAIN_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data as WalletRow | null;
}

// =====================================================
// Public API
// =====================================================

/**
 * Creates a new custodial wallet for a user or agent
 * @param input - Wallet creation parameters
 * @returns Custodial wallet details (address + public metadata)
 * @throws Error if validation fails or database operation fails
 */
export async function createCustodialWallet(
  input: z.infer<typeof WalletCreateInputSchema>
): Promise<CustodialWallet> {
  // Validate input
  const validated = WalletCreateInputSchema.parse(input);

  // Check if wallet already exists
  const existingWallet = validated.userId
    ? await getWalletByUserId(validated.userId)
    : await getWalletByAgentId(validated.agentId!);

  if (existingWallet) {
    throw new Error(
      `Wallet already exists for ${validated.userId ? "user" : "agent"}`
    );
  }

  // Generate new Ethereum wallet
  const ethWallet = generateEthereumWallet();
  const address = ethWallet.address; // Already checksummed by ethers.js
  const privateKey = ethWallet.privateKey.replace(/^0x/, ""); // Remove 0x prefix

  // Encrypt private key
  const encrypted = encryptPrivateKey(privateKey);

  // Prepare database row
  const row: Omit<WalletRow, "id" | "created_at" | "updated_at"> = {
    user_id: validated.userId || null,
    agent_id: validated.agentId || null,
    address,
    chain_id: BASE_L2_CHAIN_ID,
    is_custodial: true,
    encrypted_key: `${encrypted.ciphertext}:${encrypted.authTag}`, // Store as "ciphertext:authTag"
    encryption_nonce: encrypted.nonce,
    encryption_algorithm: ENCRYPTION_ALGORITHM,
  };

  // Insert into database
  const insertedRow = await insertWalletRow(row);

  // Return public wallet data (never expose private key)
  const walletData = {
    id: insertedRow.id,
    userId: insertedRow.user_id || undefined,
    agentId: insertedRow.agent_id || undefined,
    address: insertedRow.address,
    chainId: insertedRow.chain_id as 8453,
    isCustodial: true as const,
    encryptionAlgorithm: insertedRow.encryption_algorithm!,
    createdAt: new Date(insertedRow.created_at),
  };

  return CustodialWalletSchema.parse(walletData) as CustodialWallet;
}

/**
 * Registers a non-custodial wallet (user brings their own address)
 * @param input - Wallet registration parameters with external address
 * @returns Non-custodial wallet details
 * @throws Error if validation fails or database operation fails
 */
export async function registerNonCustodialWallet(
  input: z.infer<typeof WalletCreateInputSchema> & { address: string }
): Promise<NonCustodialWallet> {
  // Validate input
  const validated = WalletCreateInputSchema.parse(input);

  // Validate and checksum address
  const checksummedAddress = checksumAddress(input.address);

  // Check if wallet already exists
  const existingWallet = await getWalletByAddress(checksummedAddress);
  if (existingWallet) {
    throw new Error(`Wallet address already registered: ${checksummedAddress}`);
  }

  // Prepare database row (no private key for non-custodial)
  const row: Omit<WalletRow, "id" | "created_at" | "updated_at"> = {
    user_id: validated.userId || null,
    agent_id: validated.agentId || null,
    address: checksummedAddress,
    chain_id: BASE_L2_CHAIN_ID,
    is_custodial: false,
    encrypted_key: null,
    encryption_nonce: null,
    encryption_algorithm: ENCRYPTION_ALGORITHM, // Still store algorithm for consistency
  };

  // Insert into database
  const insertedRow = await insertWalletRow(row);

  // Return wallet data
  const walletData = {
    id: insertedRow.id,
    userId: insertedRow.user_id || undefined,
    agentId: insertedRow.agent_id || undefined,
    address: insertedRow.address,
    chainId: insertedRow.chain_id as 8453,
    isCustodial: false as const,
    createdAt: new Date(insertedRow.created_at),
  };

  return NonCustodialWalletSchema.parse(walletData) as NonCustodialWallet;
}

/**
 * Retrieves wallet by user ID
 * @param userId - User UUID
 * @returns Wallet details or null if not found
 */
export async function getWalletForUser(
  userId: string
): Promise<CustodialWallet | NonCustodialWallet | null> {
  const row = await getWalletByUserId(userId);
  if (!row) return null;

  if (row.is_custodial) {
    const walletData = {
      id: row.id,
      userId: row.user_id || undefined,
      agentId: row.agent_id || undefined,
      address: row.address,
      chainId: row.chain_id as 8453,
      isCustodial: true as const,
      encryptionAlgorithm: row.encryption_algorithm!,
      createdAt: new Date(row.created_at),
    };
    return CustodialWalletSchema.parse(walletData) as CustodialWallet;
  } else {
    const walletData = {
      id: row.id,
      userId: row.user_id || undefined,
      agentId: row.agent_id || undefined,
      address: row.address,
      chainId: row.chain_id as 8453,
      isCustodial: false as const,
      createdAt: new Date(row.created_at),
    };
    return NonCustodialWalletSchema.parse(walletData) as NonCustodialWallet;
  }
}

/**
 * Retrieves wallet by agent ID
 * @param agentId - Agent UUID
 * @returns Wallet details or null if not found
 */
export async function getWalletForAgent(
  agentId: string
): Promise<CustodialWallet | NonCustodialWallet | null> {
  const row = await getWalletByAgentId(agentId);
  if (!row) return null;

  if (row.is_custodial) {
    const walletData = {
      id: row.id,
      userId: row.user_id || undefined,
      agentId: row.agent_id || undefined,
      address: row.address,
      chainId: row.chain_id as 8453,
      isCustodial: true as const,
      encryptionAlgorithm: row.encryption_algorithm!,
      createdAt: new Date(row.created_at),
    };
    return CustodialWalletSchema.parse(walletData) as CustodialWallet;
  } else {
    const walletData = {
      id: row.id,
      userId: row.user_id || undefined,
      agentId: row.agent_id || undefined,
      address: row.address,
      chainId: row.chain_id as 8453,
      isCustodial: false as const,
      createdAt: new Date(row.created_at),
    };
    return NonCustodialWalletSchema.parse(walletData) as NonCustodialWallet;
  }
}

/**
 * Decrypts and returns an ethers.js Wallet instance for signing transactions
 * SECURITY: This method should ONLY be called from secure server-side contexts
 * @param address - Wallet address to decrypt
 * @returns ethers.js Wallet instance
 * @throws Error if wallet not found, not custodial, or decryption fails
 */
export async function getSignerWallet(address: string): Promise<Wallet> {
  // Validate and checksum address
  const checksummedAddress = checksumAddress(address);

  // Fetch wallet row
  const row = await getWalletByAddress(checksummedAddress);
  if (!row) {
    throw new Error(`Wallet not found: ${checksummedAddress}`);
  }

  if (!row.is_custodial) {
    throw new Error(
      `Cannot get signer for non-custodial wallet: ${checksummedAddress}`
    );
  }

  if (!row.encrypted_key || !row.encryption_nonce) {
    throw new Error(`Encrypted key missing for wallet: ${checksummedAddress}`);
  }

  // Parse encrypted key (format: "ciphertext:authTag")
  const [ciphertext, authTag] = row.encrypted_key.split(":");
  if (!ciphertext || !authTag) {
    throw new Error(`Invalid encrypted key format for wallet: ${checksummedAddress}`);
  }

  // Decrypt private key
  const privateKey = decryptPrivateKey({
    ciphertext,
    nonce: row.encryption_nonce,
    authTag,
  });

  // Create wallet instance
  const wallet = new Wallet(`0x${privateKey}`);

  // Verify address matches (security check)
  if (wallet.address !== checksummedAddress) {
    throw new Error(
      `Address mismatch after decryption: expected ${checksummedAddress}, got ${wallet.address}`
    );
  }

  return wallet;
}

/**
 * Lists all wallets for a user (pagination supported)
 * @param userId - User UUID
 * @param limit - Max results (default 100)
 * @param offset - Pagination offset (default 0)
 * @returns Array of wallet details
 */
export async function listWalletsForUser(
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Array<CustodialWallet | NonCustodialWallet>> {
  const { data, error } = await supabase
    .from("a2a_wallets")
    .select()
    .eq("user_id", userId)
    .eq("chain_id", BASE_L2_CHAIN_ID)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return (data as WalletRow[]).map((row) => {
    if (row.is_custodial) {
      const walletData = {
        id: row.id,
        userId: row.user_id || undefined,
        agentId: row.agent_id || undefined,
        address: row.address,
        chainId: row.chain_id as 8453,
        isCustodial: true as const,
        encryptionAlgorithm: row.encryption_algorithm!,
        createdAt: new Date(row.created_at),
      };
      return CustodialWalletSchema.parse(walletData) as CustodialWallet;
    } else {
      const walletData = {
        id: row.id,
        userId: row.user_id || undefined,
        agentId: row.agent_id || undefined,
        address: row.address,
        chainId: row.chain_id as 8453,
        isCustodial: false as const,
        createdAt: new Date(row.created_at),
      };
      return NonCustodialWalletSchema.parse(walletData) as NonCustodialWallet;
    }
  });
}
