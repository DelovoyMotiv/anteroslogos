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
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
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
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: 8453,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 'auto',
      verify: {
        etherscan: {
          apiUrl: 'https://api.basescan.org',
          apiKey: process.env.BASESCAN_API_KEY || '',
        },
      },
    },

    // Base Sepolia Testnet
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      gasPrice: 'auto',
      verify: {
        etherscan: {
          apiUrl: 'https://api-sepolia.basescan.org',
          apiKey: process.env.BASESCAN_API_KEY || '',
        },
      },
    },
  },

  // Etherscan verification
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || '',
      baseSepolia: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
    ],
  },

  // Gas reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'ETH',
    gasPriceApi: 'https://api.basescan.org/api?module=proxy&action=eth_gasPrice',
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
