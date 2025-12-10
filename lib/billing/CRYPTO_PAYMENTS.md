# Cryptocurrency Payment Integration

This document describes the USDC payment integration for the CCC economy.

## Overview

Users can purchase CCC credits by sending USDC to the platform wallet. The system verifies transactions on-chain and automatically credits user accounts.

## Supported Chains

- **Ethereum Mainnet** (Chain ID: 1)
- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia** (Chain ID: 84532) - Testnet
- **Sepolia** (Chain ID: 11155111) - Testnet

## Architecture

### Components

1. **Transaction Verification** (`verifyUSDCTransaction`)
   - Verifies transaction exists on-chain
   - Checks minimum confirmations (3 blocks)
   - Validates USDC transfer to platform wallet
   - Calculates CCC amount from USDC

2. **Payment Processing** (`processCryptoPayment`)
   - Checks for duplicate transactions
   - Credits user account via BillingService
   - Records transaction in ledger with metadata

3. **Payment Monitor** (`CryptoPaymentMonitor`)
   - Listens for USDC Transfer events
   - Waits for confirmations
   - Triggers payment processing

4. **API Endpoint** (`/api/crypto-payment`)
   - Allows users to submit transaction hashes
   - Verifies and processes payments
   - Returns updated balance

## Configuration

### Environment Variables

Required:
```bash
# Platform wallet address (receives USDC payments)
PLATFORM_WALLET_ADDRESS=0x...

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# At least one RPC URL
BASE_RPC_URL=https://...
# or
BASE_SEPOLIA_RPC_URL=https://...
# or
ETHEREUM_RPC_URL=https://...
# or
SEPOLIA_RPC_URL=https://...
```

Optional:
```bash
# Stripe webhook secret (for Stripe payments)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Usage

### User Flow

1. User sends USDC to platform wallet address
2. User submits transaction hash via API or UI
3. System verifies transaction on-chain
4. System credits CCC to user account
5. User receives confirmation with new balance

### API Usage

**Endpoint:** `POST /api/crypto-payment`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "txHash": "0x1234567890abcdef...",
  "chainId": 8453
}
```

**Success Response (200):**
```json
{
  "success": true,
  "transaction": {
    "txHash": "0x1234567890abcdef...",
    "usdcAmount": 100.0,
    "cccAmount": 500.0,
    "confirmations": 5,
    "blockNumber": 12345678
  },
  "newBalance": 1500.0
}
```

**Error Responses:**

- `400` - Invalid request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing token)
- `409` - Transaction already processed
- `500` - Server error

### Programmatic Usage

```typescript
import {
  verifyUSDCTransaction,
  processCryptoPayment,
  getBillingService,
} from '@/lib/billing';

// Verify transaction
const verifiedTx = await verifyUSDCTransaction(
  '0x1234567890abcdef...',
  8453 // Base mainnet
);

// Process payment
const billingService = getBillingService();
await processCryptoPayment(userId, verifiedTx, billingService);
```

## Payment Monitoring

### Automatic Monitoring

Run the payment monitor as a background service:

```bash
npx tsx scripts/start-crypto-monitors.ts
```

This will:
- Listen for USDC transfers to platform wallet
- Wait for confirmations
- Automatically process payments (if user mapping exists)

### Manual Processing

For transactions that require manual processing:

1. Check pending transactions in logs
2. Verify user ownership of sending wallet
3. Process via API or admin interface

## Security Considerations

### Transaction Verification

- Minimum 3 block confirmations required
- Verifies transaction success status
- Validates USDC contract address
- Checks transfer recipient matches platform wallet

### Duplicate Prevention

- Checks ledger for existing transaction hash
- Returns error if already processed
- Prevents double-crediting

### Authentication

- All API endpoints require valid JWT token
- User ID extracted from authenticated session
- RLS policies enforce data isolation

## Conversion Rate

USDC is pegged 1:1 with USD, so:

```
CCC Amount = USDC Amount / 0.20
```

Example:
- 100 USDC = 500 CCC
- 20 USDC = 100 CCC
- 1 USDC = 5 CCC

## Testing

### Testnet Testing

Use Base Sepolia or Sepolia testnet:

1. Get testnet USDC from faucet
2. Send to platform wallet
3. Submit transaction via API
4. Verify credits appear in account

### Property-Based Testing

See `lib/billing/__tests__/crypto.property.test.ts` for comprehensive tests.

## Troubleshooting

### Transaction Not Found

- Ensure correct chain ID
- Wait for transaction to be mined
- Check RPC URL is configured

### Insufficient Confirmations

- Wait for more blocks
- Current requirement: 3 confirmations
- Approximately 36 seconds on Base

### Transaction Already Processed

- Check transaction history
- Verify transaction hash is correct
- Contact support if credits missing

### No User Found

- Ensure wallet address is registered
- Use manual processing flow
- Contact support for assistance

## Future Enhancements

1. **Wallet Registration**
   - Allow users to register wallet addresses
   - Automatic user lookup from address

2. **Multi-Token Support**
   - Support other stablecoins (USDT, DAI)
   - Support native tokens (ETH, etc.)

3. **Payment Intents**
   - Generate unique payment addresses
   - Automatic user association

4. **Refunds**
   - On-chain refund mechanism
   - Automated refund processing

5. **Advanced Monitoring**
   - Use blockchain indexer (The Graph, Alchemy)
   - Webhook-based notifications
   - Real-time balance updates

## Support

For issues or questions:
- Check logs for error messages
- Review transaction on block explorer
- Contact support with transaction hash
