/**
 * Cryptocurrency Payment Integration for CCC Credit Purchases
 * Handles USDC payment verification and blockchain monitoring
 */

import { ethers } from 'ethers';
import { BillingService } from './BillingService';
import { ANCHOR_PRICE_USD_PER_CCC } from './stripe';

/**
 * USDC contract addresses by chain ID
 */
const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum mainnet
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia (testnet)
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia (testnet)
};

/**
 * USDC has 6 decimals
 */
const USDC_DECIMALS = 6;

/**
 * Minimum confirmations required for transaction verification
 */
const MIN_CONFIRMATIONS = 3;

/**
 * Payment destination address (platform wallet)
 * This should be set via environment variable
 */
function getPlatformWalletAddress(): string {
  const address = process.env.PLATFORM_WALLET_ADDRESS;
  
  if (!address) {
    throw new Error('Missing PLATFORM_WALLET_ADDRESS environment variable');
  }
  
  if (!ethers.isAddress(address)) {
    throw new Error('Invalid PLATFORM_WALLET_ADDRESS format');
  }
  
  return address;
}

/**
 * Get blockchain provider for the specified chain
 */
function getProvider(chainId: number): ethers.JsonRpcProvider {
  const rpcUrls: Record<number, string | undefined> = {
    1: process.env.ETHEREUM_RPC_URL,
    8453: process.env.BASE_RPC_URL,
    84532: process.env.BASE_SEPOLIA_RPC_URL,
    11155111: process.env.SEPOLIA_RPC_URL,
  };
  
  const rpcUrl = rpcUrls[chainId];
  
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ID ${chainId}`);
  }
  
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get USDC contract address for chain
 */
function getUSDCAddress(chainId: number): string {
  const address = USDC_ADDRESSES[chainId];
  
  if (!address) {
    throw new Error(`USDC not supported on chain ID ${chainId}`);
  }
  
  return address;
}

/**
 * ERC20 ABI (minimal interface for USDC)
 */
const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/**
 * Verified transaction details
 */
export interface VerifiedTransaction {
  txHash: string;
  from: string;
  to: string;
  amount: number; // USDC amount
  cccAmount: number; // Calculated CCC
  blockNumber: number;
  confirmations: number;
  timestamp: number;
  chainId: number;
}

/**
 * Verify a USDC transaction on-chain
 * Checks that:
 * 1. Transaction exists and is confirmed
 * 2. Transaction is a USDC transfer to platform wallet
 * 3. Amount is valid
 */
export async function verifyUSDCTransaction(
  txHash: string,
  chainId: number
): Promise<VerifiedTransaction> {
  const provider = getProvider(chainId);
  const platformWallet = getPlatformWalletAddress();
  const usdcAddress = getUSDCAddress(chainId);
  
  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    throw new Error(`Transaction ${txHash} not found on chain ${chainId}`);
  }
  
  // Check confirmations
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber + 1;
  
  if (confirmations < MIN_CONFIRMATIONS) {
    throw new Error(
      `Transaction has ${confirmations} confirmations, minimum ${MIN_CONFIRMATIONS} required`
    );
  }
  
  // Verify transaction was successful
  if (receipt.status !== 1) {
    throw new Error(`Transaction ${txHash} failed on-chain`);
  }
  
  // Parse USDC Transfer event
  const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
  
  let transferEvent: ethers.Log | null = null;
  let transferAmount = 0n;
  let fromAddress = '';
  
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === usdcAddress.toLowerCase()) {
      try {
        const parsed = usdcContract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        
        if (parsed && parsed.name === 'Transfer') {
          const to = parsed.args[1] as string;
          
          // Check if this transfer is to our platform wallet
          if (to.toLowerCase() === platformWallet.toLowerCase()) {
            transferEvent = log;
            fromAddress = parsed.args[0] as string;
            transferAmount = parsed.args[2] as bigint;
            break;
          }
        }
      } catch (error) {
        // Not a Transfer event or parsing failed, continue
        continue;
      }
    }
  }
  
  if (!transferEvent || transferAmount === 0n) {
    throw new Error(
      `No USDC transfer to platform wallet found in transaction ${txHash}`
    );
  }
  
  // Convert USDC amount (6 decimals) to float
  const usdcAmount = Number(ethers.formatUnits(transferAmount, USDC_DECIMALS));
  
  if (usdcAmount <= 0) {
    throw new Error('Invalid USDC amount');
  }
  
  // Calculate CCC amount (USDC is pegged 1:1 with USD)
  const cccAmount = usdcAmount / ANCHOR_PRICE_USD_PER_CCC;
  
  // Get block timestamp
  const block = await provider.getBlock(receipt.blockNumber);
  const timestamp = block ? block.timestamp : Math.floor(Date.now() / 1000);
  
  return {
    txHash,
    from: fromAddress,
    to: platformWallet,
    amount: usdcAmount,
    cccAmount,
    blockNumber: receipt.blockNumber,
    confirmations,
    timestamp,
    chainId,
  };
}

/**
 * Process a verified USDC payment and credit user account
 */
export async function processCryptoPayment(
  userId: string,
  verifiedTx: VerifiedTransaction,
  billingService: BillingService
): Promise<void> {
  // Check if transaction was already processed
  const alreadyProcessed = await billingService.isTransactionProcessed(verifiedTx.txHash);
  
  if (alreadyProcessed) {
    throw new Error(
      `Transaction ${verifiedTx.txHash} has already been processed`
    );
  }
  
  // Deposit credits to user account
  await billingService.depositCredits(
    userId,
    verifiedTx.cccAmount,
    'DEPOSIT_CRYPTO',
    {
      tx_hash: verifiedTx.txHash,
      chain_id: verifiedTx.chainId,
      from_address: verifiedTx.from,
      to_address: verifiedTx.to,
      usdc_amount: verifiedTx.amount,
      block_number: verifiedTx.blockNumber,
      confirmations: verifiedTx.confirmations,
      timestamp: verifiedTx.timestamp,
    }
  );
  
  console.log(
    `Successfully processed crypto payment for user ${userId}: ${verifiedTx.cccAmount} CCC from tx ${verifiedTx.txHash}`
  );
}

/**
 * Monitor blockchain for incoming USDC payments
 * This is a basic implementation - in production, use a more robust solution
 * like a dedicated indexer service or webhook from a blockchain API provider
 */
export class CryptoPaymentMonitor {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private platformWallet: string;
  private chainId: number;
  private isMonitoring: boolean = false;
  
  constructor(chainId: number, _billingService: BillingService) {
    this.chainId = chainId;
    this.provider = getProvider(chainId);
    this.platformWallet = getPlatformWalletAddress();
    
    const usdcAddress = getUSDCAddress(chainId);
    this.usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, this.provider);
  }
  
  /**
   * Start monitoring for incoming USDC transfers
   */
  async startMonitoring(onPaymentDetected: (tx: VerifiedTransaction) => Promise<void>): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Payment monitor is already running');
      return;
    }
    
    this.isMonitoring = true;
    
    console.log(
      `Starting USDC payment monitor on chain ${this.chainId} for wallet ${this.platformWallet}`
    );
    
    // Listen for Transfer events to platform wallet
    const filter = this.usdcContract.filters.Transfer(null, this.platformWallet);
    
    this.usdcContract.on(filter, async (_from, _to, _amount, event) => {
      try {
        console.log(`Detected USDC transfer: ${event.log.transactionHash}`);
        
        // Wait for confirmations
        await this.waitForConfirmations(event.log.transactionHash);
        
        // Verify transaction
        const verifiedTx = await verifyUSDCTransaction(
          event.log.transactionHash,
          this.chainId
        );
        
        // Call callback
        await onPaymentDetected(verifiedTx);
      } catch (error) {
        console.error('Error processing detected payment:', error);
      }
    });
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    this.usdcContract.removeAllListeners();
    this.isMonitoring = false;
    
    console.log(`Stopped USDC payment monitor on chain ${this.chainId}`);
  }
  
  /**
   * Wait for transaction to reach minimum confirmations
   */
  private async waitForConfirmations(txHash: string): Promise<void> {
    let confirmations = 0;
    
    while (confirmations < MIN_CONFIRMATIONS) {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error(`Transaction ${txHash} not found`);
      }
      
      const currentBlock = await this.provider.getBlockNumber();
      confirmations = currentBlock - receipt.blockNumber + 1;
      
      if (confirmations < MIN_CONFIRMATIONS) {
        // Wait for next block
        await new Promise(resolve => setTimeout(resolve, 12000)); // ~12s block time
      }
    }
  }
}

/**
 * Create and start payment monitors for all configured chains
 */
export function startPaymentMonitors(
  billingService: BillingService,
  onPaymentDetected: (tx: VerifiedTransaction, chainId: number) => Promise<void>
): CryptoPaymentMonitor[] {
  const monitors: CryptoPaymentMonitor[] = [];
  
  // Get configured chain IDs from environment
  const chainIds = [
    process.env.BASE_RPC_URL ? 8453 : null,
    process.env.BASE_SEPOLIA_RPC_URL ? 84532 : null,
    process.env.ETHEREUM_RPC_URL ? 1 : null,
    process.env.SEPOLIA_RPC_URL ? 11155111 : null,
  ].filter((id): id is number => id !== null);
  
  for (const chainId of chainIds) {
    try {
      const monitor = new CryptoPaymentMonitor(chainId, billingService);
      
      monitor.startMonitoring(async (tx) => {
        await onPaymentDetected(tx, chainId);
      });
      
      monitors.push(monitor);
    } catch (error) {
      console.error(`Failed to start monitor for chain ${chainId}:`, error);
    }
  }
  
  return monitors;
}
