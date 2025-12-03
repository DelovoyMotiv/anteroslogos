/**
 * Hardhat Configuration for ReputationSlashing Contract
 * 
 * Supports:
 * - Base Mainnet (chainId: 8453)
 * - Base Sepolia (chainId: 84532)
 * 
 * @module hardhat.config
 */

import { HardhatUserConfig } from 'hardhat/config';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },

  networks: {
    hardhat: {
      type: 'edr-simulated',
      chainId: 31337,
      forking: process.env.BASE_RPC_URL
        ? {
            url: process.env.BASE_RPC_URL,
            blockNumber: undefined,
          }
        : undefined,
    },

    // Base Mainnet
    base: {
      type: 'http',
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: 8453,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 'auto',
    },

    // Base Sepolia Testnet
    baseSepolia: {
      type: 'http',
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 'auto',
    },
  },


  // Paths
  paths: {
    sources: './contracts',
    tests: './test/contracts',
    cache: './cache/hardhat',
    artifacts: './artifacts',
  },

  // Mocha test configuration
  mocha: {
    timeout: 60000, // 60s for network calls
  },
};

export default config;
