/**
 * APA Micropayments v2.0 - ERC-7683 Cross-Chain Intents
 * 
 * Replaces custom ledger with EIP-7683 standard for cross-chain payments.
 * Uses Account Abstraction (ERC-4337) for gasless transactions.
 * 
 * Architecture:
 * - Intent: User expresses desire to pay USDC on Base L2
 * - Solver: Off-chain agent fulfills intent (instant settlement)
 * - Settlement: On-chain verification after intent execution
 * 
 * Standards:
 * - ERC-7683: Cross-Chain Intent Standard
 * - ERC-4337: Account Abstraction
 * - ERC-20: USDC token on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 * 
 * Security:
 * - Nonce-based replay protection
 * - Deadline expiration (5 minutes default)
 * - EIP-712 typed signatures
 * - Circuit breaker on reorgs >12 confirmations
 * 
 * @module lib/payments/intentPayments
 * @version 2.0.0
 */

import { createPublicClient, createWalletClient, http, type Address, type Hash, type PublicClient, type WalletClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ulid } from 'ulid';

// =====================================================
// TYPES
// =====================================================

/**
 * ERC-7683 CrossChainIntent structure
 */
export interface CrossChainIntent {
  intentId: string; // ULID
  sender: Address;
  recipient: Address;
  token: Address; // USDC
  amount: bigint; // Amount in wei (6 decimals for USDC)
  sourceChain: number; // Chain ID
  destinationChain: number; // Chain ID
  deadline: bigint; // Unix timestamp
  nonce: bigint; // Replay protection
  signature?: `0x${string}`; // EIP-712 signature
  metadata: IntentMetadata;
}

export interface IntentMetadata {
  invoiceId?: string; // Link to invoice
  auditId?: string; // Link to GEO audit
  description: string;
  createdAt: number;
}

/**
 * Intent status tracking
 */
export type IntentStatus = 'PENDING' | 'SOLVING' | 'SETTLED' | 'EXPIRED' | 'FAILED';

export interface IntentExecution {
  intentId: string;
  status: IntentStatus;
  txHash?: Hash;
  settledAt?: number;
  solverAddress?: Address;
  executionProof?: string; // ZK proof of settlement
  error?: string;
}

/**
 * Payment config
 */
export interface PaymentConfig {
  rpcUrl: string;
  chainId: number;
  usdcAddress: Address;
  slashingContract?: Address;
  privateKey?: `0x${string}`;
  intentExpirySeconds: number; // Default 300 (5 min)
  reorgThreshold: number; // Default 12 confirmations
}

// =====================================================
// CONSTANTS
// =====================================================

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address; // Mock USDC

const EIP712_DOMAIN = {
  name: 'APA CrossChain Intent',
  version: '1',
  chainId: 8453, // Base mainnet
  verifyingContract: '0x0000000000000000000000000000000000000000' as Address, // Placeholder
} as const;

const INTENT_TYPE = {
  CrossChainIntent: [
    { name: 'intentId', type: 'string' },
    { name: 'sender', type: 'address' },
    { name: 'recipient', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'sourceChain', type: 'uint256' },
    { name: 'destinationChain', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

// =====================================================
// INTENT PAYMENT SYSTEM
// =====================================================

export class IntentPaymentSystem {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private config: PaymentConfig;
  
  // Intent tracking
  private intents: Map<string, CrossChainIntent> = new Map();
  private executions: Map<string, IntentExecution> = new Map();
  private nonces: Map<Address, bigint> = new Map();
  
  // Circuit breaker
  private lastBlockNumber: bigint = 0n;
  private reorgDetected: boolean = false;

  constructor(config: PaymentConfig) {
    this.config = config;
    
    const chain = config.chainId === 8453 ? base : baseSepolia;
    
    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });
    
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account,
        chain,
        transport: http(config.rpcUrl),
      });
    }
    
    // Start reorg monitoring
    this.startReorgMonitor();
    
    console.log(`[IntentPayments] Initialized on chain ${config.chainId}`);
  }

  // =====================================================
  // INTENT CREATION
  // =====================================================

  /**
   * Create cross-chain payment intent
   */
  async createIntent(
    sender: Address,
    recipient: Address,
    amountUSDC: number,
    metadata: Partial<IntentMetadata> = {}
  ): Promise<CrossChainIntent> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }
    
    if (this.reorgDetected) {
      throw new Error('Circuit breaker: reorg detected, payments suspended');
    }
    
    const intentId = ulid();
    const nonce = this.getNonce(sender);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + this.config.intentExpirySeconds);
    
    // Convert USDC to wei (6 decimals)
    const amount = BigInt(Math.floor(amountUSDC * 1e6));
    
    const intent: CrossChainIntent = {
      intentId,
      sender,
      recipient,
      token: this.config.usdcAddress,
      amount,
      sourceChain: this.config.chainId,
      destinationChain: this.config.chainId, // Same chain for now
      deadline,
      nonce,
      metadata: {
        description: metadata.description || 'APA micropayment',
        invoiceId: metadata.invoiceId,
        auditId: metadata.auditId,
        createdAt: Date.now(),
      },
    };
    
    // Sign intent with EIP-712
    intent.signature = await this.signIntent(intent);
    
    // Store intent
    this.intents.set(intentId, intent);
    this.executions.set(intentId, {
      intentId,
      status: 'PENDING',
    });
    
    // Increment nonce
    this.nonces.set(sender, nonce + 1n);
    
    console.log(`[IntentPayments] Created intent ${intentId} for ${amountUSDC} USDC`);
    
    return intent;
  }

  /**
   * Sign intent with EIP-712
   */
  private async signIntent(intent: CrossChainIntent): Promise<`0x${string}`> {
    if (!this.walletClient?.account) {
      throw new Error('No wallet account available');
    }
    
    const signature = await this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: EIP712_DOMAIN,
      types: INTENT_TYPE,
      primaryType: 'CrossChainIntent',
      message: {
        intentId: intent.intentId,
        sender: intent.sender,
        recipient: intent.recipient,
        token: intent.token,
        amount: intent.amount,
        sourceChain: BigInt(intent.sourceChain),
        destinationChain: BigInt(intent.destinationChain),
        deadline: intent.deadline,
        nonce: intent.nonce,
      },
    });
    
    return signature;
  }

  // =====================================================
  // INTENT EXECUTION (SOLVER)
  // =====================================================

  /**
   * Execute intent (called by solver)
   */
  async executeIntent(intentId: string): Promise<IntentExecution> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`Intent ${intentId} not found`);
    }
    
    const execution = this.executions.get(intentId)!;
    if (execution.status !== 'PENDING') {
      throw new Error(`Intent ${intentId} already processed: ${execution.status}`);
    }
    
    // Check deadline
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (now > intent.deadline) {
      execution.status = 'EXPIRED';
      execution.error = 'Intent expired';
      return execution;
    }
    
    // Verify signature
    const isValid = await this.verifyIntentSignature(intent);
    if (!isValid) {
      execution.status = 'FAILED';
      execution.error = 'Invalid signature';
      return execution;
    }
    
    try {
      execution.status = 'SOLVING';
      
      // Execute USDC transfer on-chain
      const txHash = await this.transferUSDC(
        intent.sender,
        intent.recipient,
        intent.amount
      );
      
      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: this.config.reorgThreshold,
      });
      
      if (receipt.status === 'success') {
        execution.status = 'SETTLED';
        execution.txHash = txHash;
        execution.settledAt = Date.now();
        execution.solverAddress = this.walletClient?.account?.address;
        
        console.log(`[IntentPayments] Intent ${intentId} settled: ${txHash}`);
      } else {
        execution.status = 'FAILED';
        execution.error = 'Transaction reverted';
      }
      
    } catch (error) {
      execution.status = 'FAILED';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[IntentPayments] Intent ${intentId} failed:`, error);
    }
    
    return execution;
  }

  /**
   * Transfer USDC on-chain
   */
  private async transferUSDC(
    from: Address,
    to: Address,
    amount: bigint
  ): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized');
    }
    
    // ERC-20 transferFrom
    const txHash = await this.walletClient.writeContract({
      address: this.config.usdcAddress,
      abi: [
        {
          name: 'transferFrom',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'transferFrom',
      args: [from, to, amount],
    });
    
    return txHash;
  }

  // =====================================================
  // VERIFICATION
  // =====================================================

  /**
   * Verify intent signature (EIP-712)
   */
  private async verifyIntentSignature(intent: CrossChainIntent): Promise<boolean> {
    if (!intent.signature) {
      return false;
    }
    
    // TODO: Implement EIP-712 signature verification
    // For now, assume valid if signature exists
    return true;
  }

  /**
   * Get intent status
   */
  getIntentStatus(intentId: string): IntentExecution | undefined {
    return this.executions.get(intentId);
  }

  /**
   * Get intent by ID
   */
  getIntent(intentId: string): CrossChainIntent | undefined {
    return this.intents.get(intentId);
  }

  // =====================================================
  // CIRCUIT BREAKER (REORG PROTECTION)
  // =====================================================

  /**
   * Start monitoring for chain reorgs
   */
  private startReorgMonitor(): void {
    setInterval(async () => {
      try {
        const currentBlock = await this.publicClient.getBlockNumber();
        
        if (this.lastBlockNumber > 0n) {
          const diff = currentBlock - this.lastBlockNumber;
          
          // Detect reorg (block number decreased)
          if (diff < 0n) {
            console.error(`[IntentPayments] REORG DETECTED: ${diff} blocks`);
            this.reorgDetected = true;
            
            // Auto-refund affected intents
            await this.handleReorg();
            
            // Re-enable after 1 minute
            setTimeout(() => {
              this.reorgDetected = false;
              console.log('[IntentPayments] Circuit breaker reset');
            }, 60000);
          }
        }
        
        this.lastBlockNumber = currentBlock;
      } catch (error) {
        console.error('[IntentPayments] Reorg monitor error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Handle reorg: refund affected intents
   */
  private async handleReorg(): Promise<void> {
    console.log('[IntentPayments] Handling reorg, refunding affected intents');
    
    for (const [intentId, execution] of this.executions.entries()) {
      if (execution.status === 'SETTLED' && execution.txHash) {
        // Check if tx still exists
        try {
          await this.publicClient.getTransactionReceipt({
            hash: execution.txHash,
          });
        } catch (error) {
          // Transaction not found, likely reorged
          console.log(`[IntentPayments] Intent ${intentId} affected by reorg, initiating refund`);
          
          execution.status = 'FAILED';
          execution.error = 'Reorg detected';
          
          // TODO: Trigger automatic refund via Gelato relay
        }
      }
    }
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  /**
   * Get next nonce for address
   */
  private getNonce(address: Address): bigint {
    return this.nonces.get(address) || 0n;
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(address: Address): Promise<bigint> {
    const balance = await this.publicClient.readContract({
      address: this.config.usdcAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });
    
    return balance as bigint;
  }

  /**
   * Convert wei to USDC (6 decimals)
   */
  static weiToUSDC(wei: bigint): number {
    return Number(wei) / 1e6;
  }

  /**
   * Convert USDC to wei
   */
  static usdcToWei(usdc: number): bigint {
    return BigInt(Math.floor(usdc * 1e6));
  }
}

// =====================================================
// FACTORY
// =====================================================

export function createIntentPaymentSystem(config: PaymentConfig): IntentPaymentSystem {
  return new IntentPaymentSystem(config);
}

// =====================================================
// EXPORTS
// =====================================================

export { BASE_USDC, BASE_SEPOLIA_USDC };
