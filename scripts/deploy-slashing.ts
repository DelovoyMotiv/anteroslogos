/**
 * Deploy ReputationSlashing Contract to Base Sepolia/Mainnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-slashing.ts --network baseSepolia
 *   npx hardhat run scripts/deploy-slashing.ts --network base
 * 
 * @module scripts/deploy-slashing
 */

import { ethers } from 'hardhat';
import { formatUnits, parseUnits } from 'viem';

async function main() {
  console.log('='.repeat(60));
  console.log('ReputationSlashing Contract Deployment');
  console.log('='.repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${formatUnits(balance, 18)} ETH`);

  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`Network: ${network.name} (chainId: ${chainId})`);

  // USDC address based on network
  const usdcAddresses: Record<number, string> = {
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base mainnet
    84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  };

  const usdcAddress = usdcAddresses[chainId];
  if (!usdcAddress) {
    throw new Error(`Unsupported network chainId: ${chainId}`);
  }

  console.log(`USDC Address: ${usdcAddress}`);

  // Configuration
  const MIN_STAKE = parseUnits('100', 6); // 100 USDC
  const SLASH_PERCENTAGE = 50; // 50%
  const WITHDRAWAL_COOLDOWN = 7 * 24 * 60 * 60; // 7 days

  console.log('\nConfiguration:');
  console.log(`  Min Stake: ${formatUnits(MIN_STAKE, 6)} USDC`);
  console.log(`  Slash Percentage: ${SLASH_PERCENTAGE}%`);
  console.log(`  Withdrawal Cooldown: ${WITHDRAWAL_COOLDOWN / 86400} days`);

  // Deploy contract
  console.log('\n[1/4] Deploying ReputationSlashing contract...');
  const ReputationSlashing = await ethers.getContractFactory('ReputationSlashing');
  
  const contract = await ReputationSlashing.deploy(
    usdcAddress,
    MIN_STAKE,
    SLASH_PERCENTAGE,
    WITHDRAWAL_COOLDOWN
  );

  console.log(`Transaction hash: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for confirmations...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`\n[2/4] Contract deployed at: ${contractAddress}`);

  // Wait for additional confirmations before verification
  console.log('\n[3/4] Waiting for 5 block confirmations...');
  const receipt = await contract.deploymentTransaction()?.wait(5);
  console.log(`Confirmed at block: ${receipt?.blockNumber}`);

  // Verify contract on Basescan
  if (process.env.BASESCAN_API_KEY) {
    console.log('\n[4/4] Verifying contract on Basescan...');
    try {
      await run('verify:verify', {
        address: contractAddress,
        constructorArguments: [
          usdcAddress,
          MIN_STAKE,
          SLASH_PERCENTAGE,
          WITHDRAWAL_COOLDOWN,
        ],
      });
      console.log('Contract verified successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message.includes('Already Verified')) {
        console.log('Contract already verified');
      } else {
        console.error('Verification failed:', err.message);
      }
    }
  } else {
    console.log('\n[4/4] Skipping verification (BASESCAN_API_KEY not set)');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Deployment Summary');
  console.log('='.repeat(60));
  console.log(`Network: ${network.name} (${chainId})`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`USDC: ${usdcAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log('='.repeat(60));

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: network.name,
    chainId,
    contractAddress,
    usdcAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: receipt?.blockNumber,
    transactionHash: contract.deploymentTransaction()?.hash,
    config: {
      minStake: formatUnits(MIN_STAKE, 6),
      slashPercentage: SLASH_PERCENTAGE,
      withdrawalCooldown: WITHDRAWAL_COOLDOWN,
    },
  };

  const filename = `deployments/ReputationSlashing-${network.name}-${Date.now()}.json`;
  fs.mkdirSync('deployments', { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filename}`);

  // Next steps
  console.log('\nNext Steps:');
  console.log('1. Update .env with contract address:');
  console.log(`   REPUTATION_SLASHING_ADDRESS=${contractAddress}`);
  console.log('2. Fund deployer with USDC for testing');
  console.log('3. Run integration tests:');
  console.log(`   npm test -- --grep "ReputationSlashing"`);
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Helper function for Hardhat runtime
function run(task: string, params: unknown): Promise<unknown> {
  const hre = require('hardhat');
  return hre.run(task, params);
}
