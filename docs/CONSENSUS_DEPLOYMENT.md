# BFT Consensus & APA Micropayments - Deployment Guide

Production-grade HotStuff BFT consensus with OCCO weighting and on-chain slashing on Base L2.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     HotStuff Consensus                       │
│  - BLS12-381 signature aggregation                          │
│  - 4-phase consensus (PREPARE → PRE_COMMIT → COMMIT → DECIDE)│
│  - O(n) message complexity                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    OCCO Weighting Oracle                     │
│  weight = log(E-E-A-T + 1) × freshness_decay(t) × stake     │
│  - Experience, Expertise, Authoritativeness, Trustworthiness │
│  - Exponential freshness decay (7-day half-life)            │
│  - Byzantine penalty: 50% per report                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Integration (viem)                   │
│  - ReputationSlashing.sol on Base L2                        │
│  - Stake management (100 USDC minimum)                      │
│  - Byzantine evidence submission                             │
│  - Automatic slashing (50% penalty)                          │
│  - 7-day withdrawal cooldown                                 │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools
- Node.js 18+ and npm 9+
- Hardhat for Solidity deployment
- Git

### Required Accounts
1. **Ethereum Wallet**
   - Create a new wallet for deployment (use MetaMask or similar)
   - Fund with ETH on Base Sepolia for gas fees
   - Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

2. **RPC Provider**
   - Public RPC: `https://sepolia.base.org` (free, rate-limited)
   - Alchemy: [Get API key](https://www.alchemy.com/) (recommended)
   - Infura: [Get API key](https://www.infura.io/)

3. **Basescan API Key**
   - Sign up at [Basescan](https://basescan.org/myapikey)
   - Required for contract verification

## Installation

### 1. Install Dependencies

```bash
# Install project dependencies
npm install

# Install Hardhat and plugins
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify hardhat-gas-reporter solidity-coverage

# Install consensus dependencies (already in package.json)
# - viem: Ethereum client
# - @noble/curves: BLS12-381 signatures
# - @account-kit/core: Account abstraction
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Base Sepolia RPC (for testing)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# Or use Alchemy:
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployer wallet private key (0x...)
# WARNING: Use a dedicated testnet wallet, NOT your main wallet!
DEPLOYER_PRIVATE_KEY=0x...

# Basescan API key
BASESCAN_API_KEY=...
```

### 3. Verify Configuration

```bash
# Check Hardhat config
npx hardhat config

# Check deployer balance
npx hardhat run scripts/check-balance.ts --network baseSepolia
```

## Deployment

### 1. Deploy ReputationSlashing Contract

Deploy to Base Sepolia testnet:

```bash
npx hardhat run scripts/deploy-slashing.ts --network baseSepolia
```

Expected output:
```
============================================================
ReputationSlashing Contract Deployment
============================================================

Deployer: 0x...
Balance: 0.05 ETH
Network: base-sepolia (84532)
USDC Address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e

Configuration:
  Min Stake: 100 USDC
  Slash Percentage: 50%
  Withdrawal Cooldown: 7 days

[1/4] Deploying ReputationSlashing contract...
Transaction hash: 0x...
Waiting for confirmations...

[2/4] Contract deployed at: 0xABCD...

[3/4] Waiting for 5 block confirmations...
Confirmed at block: 12345678

[4/4] Verifying contract on Basescan...
Contract verified successfully!

============================================================
Deployment Summary
============================================================
Network: base-sepolia (84532)
Contract: 0xABCD...
USDC: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Deployer: 0x...
============================================================

Next Steps:
1. Update .env with contract address:
   REPUTATION_SLASHING_ADDRESS_SEPOLIA=0xABCD...
2. Fund deployer with USDC for testing
3. Run integration tests:
   npm test -- --grep "ReputationSlashing"
```

### 2. Update Environment

Add the deployed contract address to `.env`:

```bash
REPUTATION_SLASHING_ADDRESS_SEPOLIA=0xABCD... (from deployment output)
```

### 3. Verify on Basescan

Check your contract on [Base Sepolia Basescan](https://sepolia.basescan.org/):
- Search for your contract address
- Verify source code is visible (green checkmark)
- Check "Contract" tab for verified ABI

## Testing

### 1. Unit Tests

Run OCCO oracle tests:

```bash
npm test test/consensus/integration.test.ts
```

Expected: All tests pass (>95% coverage)

### 2. Integration Tests

Test HotStuff + OCCO + Blockchain integration:

```bash
# Run with verbose logging
npm test -- --reporter=verbose

# Run specific test suite
npm test -- --grep "HotStuff + OCCO Integration"
```

### 3. Gas Profiling

Measure gas costs for contract operations:

```bash
REPORT_GAS=true npm test
```

Expected gas costs (Base Sepolia):
- `stake()`: ~80,000 gas (~$0.01)
- `submitEvidence()`: ~60,000 gas (~$0.008)
- `executeSlash()`: ~90,000 gas (~$0.012)

### 4. Local Hardhat Network

Test against local fork of Base mainnet:

```bash
# Start Hardhat node (forking Base mainnet)
npx hardhat node

# In another terminal, run tests
npx hardhat test --network localhost
```

## Usage Examples

### 1. Initialize HotStuff Consensus with Blockchain

```typescript
import { createHotstuffConsensus } from './lib/consensus/hotstuff';
import { bls12_381 as bls } from '@noble/curves/bls12-381';
import type { MeshNetworkRouter } from './lib/mesh/network';

// Generate BLS key pair
const blsPrivateKey = bls.utils.randomPrivateKey();

// Create consensus engine with Base Sepolia integration
const consensus = createHotstuffConsensus(
  'node-1',
  blsPrivateKey,
  meshRouter,
  {
    viewTimeout: 30000,
    f: 2, // Tolerates 2 Byzantine nodes
    minStake: 100, // 100 USDC minimum
    blockchain: {
      chainId: 84532, // Base Sepolia
      rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
      contractAddress: process.env.REPUTATION_SLASHING_ADDRESS_SEPOLIA!,
      privateKey: process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
    },
  }
);

// Update validator set (queries on-chain stakes)
await consensus.updateValidatorSet();

// Get validator weights from OCCO
const weights = consensus.getValidatorWeights();
console.log('Top 5 validators:', weights.slice(0, 5));
```

### 2. Stake USDC

```typescript
import { createBlockchainIntegration } from './lib/consensus/blockchainIntegration';

const blockchain = createBlockchainIntegration({
  chainId: 84532,
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL!,
  contractAddress: process.env.REPUTATION_SLASHING_ADDRESS_SEPOLIA!,
  privateKey: process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`,
});

// Stake 100 USDC (requires approval)
const txHash = await blockchain.stake(100);
console.log('Staked 100 USDC:', txHash);

// Check stake
const stakeInfo = await blockchain.getStake('0xYourAddress');
console.log('Current stake:', stakeInfo.amountFormatted, 'USDC');
```

### 3. Submit Byzantine Evidence

```typescript
// Detect Byzantine behavior (e.g., double voting)
const evidenceData = JSON.stringify({
  type: 'double_vote',
  proposal1: 'ulid_1',
  proposal2: 'ulid_2',
  signature1: '0x...',
  signature2: '0x...',
  timestamp: Date.now(),
});

// Submit evidence on-chain
await consensus.submitByzantineEvidence(
  '0xAccusedValidatorAddress',
  evidenceData
);

// Evidence recorded, validator weight automatically reduced
// After 3 reports, validator excluded from consensus
```

### 4. Monitor Events

```typescript
// Watch for slashing events
const unwatch = blockchain.watchSlashEvents((validator, amount) => {
  console.log(`Validator ${validator} slashed ${amount} USDC`);
});

// Watch for stake changes
blockchain.watchStakeEvents((validator, amount, type) => {
  console.log(`Validator ${validator} ${type}: ${amount} USDC`);
});

// Stop watching
unwatch();
```

## Production Deployment (Base Mainnet)

### Prerequisites
1. **Sufficient ETH**: At least 0.1 ETH on Base mainnet for gas fees
2. **USDC for Testing**: Minimum 100 USDC for initial stake
3. **Audited Contract**: Complete security audit (recommended: Trail of Bits, OpenZeppelin)

### Steps

1. **Update Configuration**

```bash
# .env
BASE_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=0x... (mainnet wallet)
```

2. **Deploy to Mainnet**

```bash
npx hardhat run scripts/deploy-slashing.ts --network base
```

3. **Verify Contract**

```bash
npx hardhat verify --network base CONTRACT_ADDRESS \
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" \ # USDC mainnet
  "100000000" \ # 100 USDC (6 decimals)
  "50" \ # 50% slash
  "604800" # 7 days
```

4. **Transfer Ownership**

Use a multisig wallet (Gnosis Safe recommended):

```typescript
// Transfer contract ownership to multisig
const contract = await ethers.getContractAt(
  'ReputationSlashing',
  contractAddress
);
await contract.transferOwnership('0xMultisigAddress');
```

5. **Initialize Validator Set**

```bash
# Fund initial validators with USDC
# Each validator stakes minimum 100 USDC
```

## Monitoring & Maintenance

### 1. Grafana Dashboard

Monitor consensus metrics (requires Prometheus):

```bash
# Install Prometheus exporter
npm install prom-client

# Expose metrics endpoint
# http://localhost:9090/metrics
```

Key metrics:
- `consensus_proposals_total`: Proposals created
- `consensus_votes_total`: Votes cast
- `consensus_qc_total`: Quorum certificates formed
- `consensus_view_changes_total`: View changes (leader failover)
- `consensus_byzantine_reports_total`: Byzantine reports submitted
- `validator_weight_avg`: Average validator weight
- `validator_stake_total`: Total staked USDC

### 2. Alerting

Set up alerts for:
- Byzantine reports > 3 per hour
- View change rate > 10 per hour
- Stake below minimum threshold
- Slashing events

### 3. Logs

Enable structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'consensus.log' }),
  ],
});
```

## Troubleshooting

### Error: Insufficient USDC Balance

**Solution**: Fund wallet with USDC on Base Sepolia
```bash
# Get testnet USDC from Base Sepolia faucet
# Or swap ETH for USDC on testnet DEX
```

### Error: Contract Not Verified

**Solution**: Manually verify on Basescan
```bash
npx hardhat verify --network baseSepolia CONTRACT_ADDRESS ...
```

### Error: View Timeout

**Cause**: Network latency or offline validators
**Solution**: Increase `viewTimeout` in config:
```typescript
viewTimeout: 60000 // 60 seconds
```

### Error: BLS Signature Verification Failed

**Cause**: Mismatched BLS keys or corrupted signatures
**Solution**: Regenerate BLS keys and re-register validators

## Security Considerations

### 1. Private Key Management
- **NEVER** commit private keys to git
- Use environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys regularly (every 90 days)

### 2. Stake Requirements
- Minimum 100 USDC enforced by contract
- Recommended: 500-1000 USDC for production validators
- Monitor stake balances to prevent accidental exclusion

### 3. Slashing Risks
- 50% stake slashed for Byzantine behavior
- Evidence required for slashing (cryptographic proof)
- 7-day withdrawal cooldown to prevent flash attacks

### 4. DOS Protection
- Rate limiting on evidence submission (1 per block per reporter)
- View change timeout prevents infinite loops
- Quorum threshold (2f+1) ensures liveness

## Cost Analysis

### Base Sepolia (Testnet)
- Gas price: ~0.001 gwei
- Deployment: ~$0.50
- Per-stake operation: ~$0.01
- Per-slash operation: ~$0.012

### Base Mainnet (Production)
- Gas price: ~0.05-0.1 gwei
- Deployment: ~$50-100
- Per-stake operation: ~$1-2
- Per-slash operation: ~$1.5-3
- Monthly operating cost: ~$100-200 (7-node network)

## References

- [HotStuff Paper](https://arxiv.org/abs/1803.05069) - Yin et al., 2019
- [BLS Signatures](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-05)
- [ERC-7683 Cross-Chain Intents](https://eips.ethereum.org/EIPS/eip-7683)
- [Base L2 Documentation](https://docs.base.org/)
- [Viem Documentation](https://viem.sh/)

## Support

For issues or questions:
1. Check [GitHub Issues](https://github.com/yourusername/anteroslogos/issues)
2. Join [Discord](https://discord.gg/anteroslogos)
3. Email: support@anteroslogos.com
