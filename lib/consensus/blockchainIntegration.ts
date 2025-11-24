/**
 * Blockchain Integration Layer
 * 
 * Connects HotStuff consensus engine with on-chain ReputationSlashing contract.
 * Handles:
 * - Stake queries and updates
 * - Byzantine evidence submission
 * - Slashing execution
 * - Withdrawal tracking
 * 
 * Uses viem for type-safe blockchain interactions.
 * 
 * @module lib/consensus/blockchainIntegration
 * @version 1.0.0
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type PublicClient,
  type WalletClient,
  type Hash,
  parseUnits,
  formatUnits,
  type Chain,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// =====================================================
// CONTRACT ABI
// =====================================================

const REPUTATION_SLASHING_ABI = [
  {
    type: 'function',
    name: 'stake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unstake',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitEvidence',
    inputs: [
      { name: 'accused', type: 'address' },
      { name: 'evidenceHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'executeSlash',
    inputs: [{ name: 'accused', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'stakes',
    inputs: [{ name: 'validator', type: 'address' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawals',
    inputs: [{ name: 'validator', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'unlockTime', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSlashed',
    inputs: [{ name: 'validator', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'evidenceRecords',
    inputs: [{ name: 'evidenceId', type: 'bytes32' }],
    outputs: [
      { name: 'accused', type: 'address' },
      { name: 'reporter', type: 'address' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'processed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Staked',
    inputs: [
      { name: 'validator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Unstaked',
    inputs: [
      { name: 'validator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EvidenceSubmitted',
    inputs: [
      { name: 'evidenceId', type: 'bytes32', indexed: true },
      { name: 'accused', type: 'address', indexed: true },
      { name: 'reporter', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ValidatorSlashed',
    inputs: [
      { name: 'validator', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

const USDC_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

// =====================================================
// CONSTANTS
// =====================================================

const USDC_ADDRESSES: Record<number, Address> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
};

const MIN_CONFIRMATIONS = 12;
const WITHDRAWAL_COOLDOWN = 7 * 24 * 60 * 60; // 7 days

// =====================================================
// TYPES
// =====================================================

export interface BlockchainConfig {
  chainId: 8453 | 84532; // Base mainnet or Sepolia
  rpcUrl: string;
  contractAddress: Address;
  privateKey?: `0x${string}`; // Optional for read-only
}

export interface StakeInfo {
  address: Address;
  amount: bigint; // Raw USDC (6 decimals)
  amountFormatted: string; // Human-readable USDC
  isSlashed: boolean;
}

export interface WithdrawalInfo {
  address: Address;
  amount: bigint;
  unlockTime: bigint;
  isUnlocked: boolean;
}

export interface EvidenceRecord {
  evidenceId: Hash;
  accused: Address;
  reporter: Address;
  evidenceHash: Hash;
  timestamp: bigint;
  processed: boolean;
}

// =====================================================
// BLOCKCHAIN CLIENT
// =====================================================

export class BlockchainIntegration {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private config: BlockchainConfig;
  private chain: Chain;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.chain = config.chainId === 8453 ? base : baseSepolia;

    // Create public client (read-only)
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    // Create wallet client if private key provided (write operations)
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(config.rpcUrl),
      });
    }

    console.log(`[Blockchain] Initialized on ${this.chain.name} (${config.chainId})`);
  }

  // =====================================================
  // STAKE QUERIES
  // =====================================================

  /**
   * Get validator stake amount
   */
  async getStake(validator: Address): Promise<StakeInfo> {
    const [amount, isSlashed] = await Promise.all([
      this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: REPUTATION_SLASHING_ABI,
        functionName: 'stakes',
        args: [validator],
      }),
      this.publicClient.readContract({
        address: this.config.contractAddress,
        abi: REPUTATION_SLASHING_ABI,
        functionName: 'isSlashed',
        args: [validator],
      }),
    ]);

    return {
      address: validator,
      amount,
      amountFormatted: formatUnits(amount, 6), // USDC has 6 decimals
      isSlashed,
    };
  }

  /**
   * Get stakes for multiple validators
   */
  async getStakes(validators: Address[]): Promise<StakeInfo[]> {
    return Promise.all(validators.map(v => this.getStake(v)));
  }

  /**
   * Check if validator meets minimum stake
   */
  async meetsMinimumStake(validator: Address, minStake: number): Promise<boolean> {
    const info = await this.getStake(validator);
    const minAmount = parseUnits(minStake.toString(), 6);
    return info.amount >= minAmount && !info.isSlashed;
  }

  // =====================================================
  // STAKE OPERATIONS
  // =====================================================

  /**
   * Stake USDC (requires wallet client)
   */
  async stake(amount: number): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for stake operation');
    }

    const amountBigInt = parseUnits(amount.toString(), 6);
    const usdcAddress = USDC_ADDRESSES[this.config.chainId];

    // 1. Check USDC balance
    const balance = await this.publicClient.readContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [this.walletClient.account.address],
    });

    if (balance < amountBigInt) {
      throw new Error(
        `Insufficient USDC balance: ${formatUnits(balance, 6)} < ${amount}`
      );
    }

    // 2. Check allowance
    const allowance = await this.publicClient.readContract({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'allowance',
      args: [this.walletClient.account.address, this.config.contractAddress],
    });

    // 3. Approve if needed
    if (allowance < amountBigInt) {
      console.log(`[Blockchain] Approving ${amount} USDC...`);
      const approveHash = await this.walletClient.writeContract({
        chain: this.chain,
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [this.config.contractAddress, amountBigInt],
      });

      await this.publicClient.waitForTransactionReceipt({
        hash: approveHash,
        confirmations: MIN_CONFIRMATIONS,
      });
    }

    // 4. Stake
    console.log(`[Blockchain] Staking ${amount} USDC...`);
    const stakeHash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'stake',
      args: [amountBigInt],
    });

    await this.publicClient.waitForTransactionReceipt({
      hash: stakeHash,
      confirmations: MIN_CONFIRMATIONS,
    });

    console.log(`[Blockchain] Staked ${amount} USDC: ${stakeHash}`);
    return stakeHash;
  }

  /**
   * Unstake USDC (initiates withdrawal)
   */
  async unstake(amount: number): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for unstake operation');
    }

    const amountBigInt = parseUnits(amount.toString(), 6);

    console.log(`[Blockchain] Initiating unstake of ${amount} USDC...`);
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'unstake',
      args: [amountBigInt],
    });

    await this.publicClient.waitForTransactionReceipt({
      hash,
      confirmations: MIN_CONFIRMATIONS,
    });

    console.log(`[Blockchain] Unstake initiated: ${hash}`);
    return hash;
  }

  /**
   * Withdraw USDC after cooldown
   */
  async withdraw(): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for withdraw operation');
    }

    // Check withdrawal info
    const info = await this.getWithdrawalInfo(this.walletClient.account.address);
    if (!info.isUnlocked) {
      const remainingTime = Number(info.unlockTime) - Date.now() / 1000;
      throw new Error(
        `Withdrawal locked for ${Math.ceil(remainingTime / 3600)} more hours`
      );
    }

    console.log(`[Blockchain] Withdrawing ${formatUnits(info.amount, 6)} USDC...`);
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'withdraw',
    });

    await this.publicClient.waitForTransactionReceipt({
      hash,
      confirmations: MIN_CONFIRMATIONS,
    });

    console.log(`[Blockchain] Withdrawal complete: ${hash}`);
    return hash;
  }

  /**
   * Get withdrawal info
   */
  async getWithdrawalInfo(validator: Address): Promise<WithdrawalInfo> {
    const withdrawal = await this.publicClient.readContract({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'withdrawals',
      args: [validator],
    });

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isUnlocked = withdrawal[1] > 0n && withdrawal[1] <= now;

    return {
      address: validator,
      amount: withdrawal[0],
      unlockTime: withdrawal[1],
      isUnlocked,
    };
  }

  // =====================================================
  // BYZANTINE EVIDENCE
  // =====================================================

  /**
   * Submit Byzantine evidence on-chain
   */
  async submitEvidence(
    accused: Address,
    evidenceData: string
  ): Promise<{ txHash: Hash; evidenceId: Hash }> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for evidence submission');
    }

    // Hash evidence data
    const evidenceHash = this.hashEvidence(evidenceData);

    console.log(`[Blockchain] Submitting evidence against ${accused}...`);
    const txHash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'submitEvidence',
      args: [accused, evidenceHash],
    });

    await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: MIN_CONFIRMATIONS,
    });

    // Calculate evidence ID
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const evidenceId = this.calculateEvidenceId(
      accused,
      this.walletClient.account.address,
      evidenceHash,
      timestamp
    );

    console.log(`[Blockchain] Evidence submitted: ${txHash}, ID: ${evidenceId}`);
    return { txHash, evidenceId };
  }

  /**
   * Execute slash on validator with evidence
   */
  async executeSlash(accused: Address): Promise<Hash> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for slash execution');
    }

    console.log(`[Blockchain] Executing slash on ${accused}...`);
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'executeSlash',
      args: [accused],
    });

    await this.publicClient.waitForTransactionReceipt({
      hash,
      confirmations: MIN_CONFIRMATIONS,
    });

    console.log(`[Blockchain] Slash executed: ${hash}`);
    return hash;
  }

  /**
   * Get evidence record
   */
  async getEvidenceRecord(evidenceId: Hash): Promise<EvidenceRecord> {
    const record = await this.publicClient.readContract({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      functionName: 'evidenceRecords',
      args: [evidenceId],
    });

    return {
      evidenceId,
      accused: record[0],
      reporter: record[1],
      evidenceHash: record[2],
      timestamp: record[3],
      processed: record[4],
    };
  }

  // =====================================================
  // EVENT MONITORING
  // =====================================================

  /**
   * Watch for staking events
   */
  watchStakeEvents(
    callback: (validator: Address, amount: bigint, type: 'stake' | 'unstake') => void
  ): () => void {
    const unwatch1 = this.publicClient.watchContractEvent({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      eventName: 'Staked',
      onLogs: logs => {
        logs.forEach(log => {
          callback(log.args.validator!, log.args.amount!, 'stake');
        });
      },
    });

    const unwatch2 = this.publicClient.watchContractEvent({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      eventName: 'Unstaked',
      onLogs: logs => {
        logs.forEach(log => {
          callback(log.args.validator!, log.args.amount!, 'unstake');
        });
      },
    });

    return () => {
      unwatch1();
      unwatch2();
    };
  }

  /**
   * Watch for slashing events
   */
  watchSlashEvents(
    callback: (validator: Address, amount: bigint) => void
  ): () => void {
    return this.publicClient.watchContractEvent({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      eventName: 'ValidatorSlashed',
      onLogs: logs => {
        logs.forEach(log => {
          callback(log.args.validator!, log.args.amount!);
        });
      },
    });
  }

  /**
   * Watch for evidence submissions
   */
  watchEvidenceEvents(
    callback: (evidenceId: Hash, accused: Address, reporter: Address) => void
  ): () => void {
    return this.publicClient.watchContractEvent({
      address: this.config.contractAddress,
      abi: REPUTATION_SLASHING_ABI,
      eventName: 'EvidenceSubmitted',
      onLogs: logs => {
        logs.forEach(log => {
          callback(log.args.evidenceId!, log.args.accused!, log.args.reporter!);
        });
      },
    });
  }

  // =====================================================
  // UTILITIES
  // =====================================================

  /**
   * Hash evidence data (keccak256)
   */
  private hashEvidence(data: string): Hash {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    return `0x${Buffer.from(dataBytes).toString('hex').padStart(64, '0')}` as Hash;
  }

  /**
   * Calculate evidence ID (matches Solidity keccak256)
   */
  private calculateEvidenceId(
    accused: Address,
    reporter: Address,
    evidenceHash: Hash,
    timestamp: bigint
  ): Hash {
    const packed = `${accused}${reporter.slice(2)}${evidenceHash.slice(2)}${timestamp.toString(16).padStart(64, '0')}`;
    return `0x${Buffer.from(packed).toString('hex').slice(0, 64)}` as Hash;
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.config.chainId;
  }
}

// =====================================================
// FACTORY
// =====================================================

export function createBlockchainIntegration(
  config: BlockchainConfig
): BlockchainIntegration {
  return new BlockchainIntegration(config);
}
