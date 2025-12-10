/**
 * Script to start cryptocurrency payment monitors
 * This should be run as a background service in production
 */

import { getBillingService } from '../lib/billing/BillingService';
import { startPaymentMonitors, type VerifiedTransaction } from '../lib/billing/crypto';
import { createClient } from '@supabase/supabase-js';

/**
 * Find user ID from blockchain address
 * In production, you'd maintain a mapping of wallet addresses to user IDs
 */
async function findUserByWalletAddress(address: string): Promise<string | null> {
  // This is a placeholder - implement proper wallet-to-user mapping
  // Options:
  // 1. Store wallet addresses in user profiles
  // 2. Require users to register their wallet addresses
  // 3. Use a separate wallet_addresses table
  
  console.log(`Looking up user for wallet address: ${address}`);
  
  // For now, return null and require manual processing
  return null;
}

/**
 * Handle detected payment
 */
async function handlePaymentDetected(
  tx: VerifiedTransaction,
  chainId: number
): Promise<void> {
  console.log('\n=== New Payment Detected ===');
  console.log(`Chain ID: ${chainId}`);
  console.log(`Transaction: ${tx.txHash}`);
  console.log(`From: ${tx.from}`);
  console.log(`Amount: ${tx.amount} USDC`);
  console.log(`CCC: ${tx.cccAmount}`);
  console.log(`Confirmations: ${tx.confirmations}`);
  console.log('===========================\n');
  
  // Try to find user
  const userId = await findUserByWalletAddress(tx.from);
  
  if (!userId) {
    console.warn(
      `No user found for wallet ${tx.from}. Transaction ${tx.txHash} requires manual processing.`
    );
    
    // In production, you'd:
    // 1. Store in a pending_payments table
    // 2. Send notification to admin
    // 3. Allow user to claim via UI by proving wallet ownership
    
    return;
  }
  
  // Process payment
  try {
    const billingService = getBillingService();
    const { processCryptoPayment } = await import('../lib/billing/crypto');
    
    await processCryptoPayment(userId, tx, billingService);
    
    console.log(`✓ Successfully credited ${tx.cccAmount} CCC to user ${userId}`);
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting cryptocurrency payment monitors...\n');
  
  // Check required environment variables
  const requiredVars = [
    'PLATFORM_WALLET_ADDRESS',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }
  
  // Check for at least one RPC URL
  const rpcUrls = [
    process.env.BASE_RPC_URL,
    process.env.BASE_SEPOLIA_RPC_URL,
    process.env.ETHEREUM_RPC_URL,
    process.env.SEPOLIA_RPC_URL,
  ].filter(Boolean);
  
  if (rpcUrls.length === 0) {
    console.error('No RPC URLs configured. Set at least one of:');
    console.error('  - BASE_RPC_URL');
    console.error('  - BASE_SEPOLIA_RPC_URL');
    console.error('  - ETHEREUM_RPC_URL');
    console.error('  - SEPOLIA_RPC_URL');
    process.exit(1);
  }
  
  console.log(`Platform wallet: ${process.env.PLATFORM_WALLET_ADDRESS}`);
  console.log(`Monitoring ${rpcUrls.length} chain(s)\n`);
  
  // Start monitors
  const billingService = getBillingService();
  const monitors = startPaymentMonitors(billingService, handlePaymentDetected);
  
  console.log(`Started ${monitors.length} payment monitor(s)`);
  console.log('Listening for USDC transfers...\n');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nShutting down monitors...');
    monitors.forEach(m => m.stopMonitoring());
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down monitors...');
    monitors.forEach(m => m.stopMonitoring());
    process.exit(0);
  });
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
