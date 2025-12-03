**# Agent-Pay-Agent (APA) - Deployment Guide

**Version:** 1.0.0  
**Date:** 2025-11-21  
**Status:** ✅ PRODUCTION READY (9/10)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Application Deployment](#application-deployment)
5. [Background Jobs](#background-jobs)
6. [Testing & Verification](#testing--verification)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Vercel account (for Next.js deployment + Cron jobs)
- [ ] Supabase project (Postgres database)
- [ ] Base L2 wallet (for receiving USDC payments)
- [ ] RPC endpoints (Base mainnet + optional: Alchemy, Infura)
- [ ] KMS or secure key storage (for wallet encryption key)

### Development Tools

```bash
# Required tools
node --version  # v18.0.0+
npm --version   # v9.0.0+
git --version   # Any recent version
psql --version  # PostgreSQL client

# Optional (for testing)
ts-node --version
```

---

## Database Setup

### Step 1: Apply Migrations

Apply all APA migrations in order:

```bash
# Set database URL
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# Migration 1: Core APA schema (wallets, invoices, ledger, chain watcher)
psql $DATABASE_URL < supabase/migrations/004_apa_payments_schema.sql

# Migration 2: Database-driven pricing
psql $DATABASE_URL < supabase/migrations/005_pricing_matrix_table.sql

# Migration 3: Payment auto-detection
psql $DATABASE_URL < supabase/migrations/006_payment_correlation_index.sql
```

### Step 2: Verify Tables

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'a2a_%';

-- Expected output:
-- a2a_wallets
-- a2a_invoices
-- a2a_ledger
-- a2a_chain_watchers
-- a2a_pricing
-- a2a_payment_detections
```

### Step 3: Verify Functions

```sql
-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%ledger%' OR routine_name LIKE '%pricing%';

-- Expected output:
-- get_user_balance
-- credit_ledger_atomic
-- debit_ledger_atomic
-- get_current_price
-- record_payment_detection
-- find_matching_invoice
```

### Step 4: Seed Pricing Data

```sql
-- Verify pricing data was seeded
SELECT method, tier, price_usd, is_active 
FROM a2a_pricing 
ORDER BY method, tier;

-- Expected output:
-- geo.audit.request | free  | 0.00
-- geo.audit.request | basic | 0.10
-- geo.audit.request | pro   | 0.00
-- causal_citation_trace | free  | 0.00
-- causal_citation_trace | basic | 0.50
-- causal_citation_trace | pro   | 0.25
```

---

## Environment Configuration

### Step 1: Generate Wallet Encryption Key

```bash
# Generate secure 32-byte key (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### Step 2: Create Platform Wallet

```bash
# Option A: Generate new wallet (RECOMMENDED)
node -e "console.log(require('ethers').Wallet.createRandom().address)"
# Save private key in KMS/Vault, never commit to git

# Option B: Use existing wallet
# Ensure it's a Base L2 address you control
```

### Step 3: Configure Environment Variables

Create `.env.production` file:

```bash
# ================================================
# Supabase Configuration (REQUIRED)
# ================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ================================================
# APA Payment System (REQUIRED)
# ================================================

# Platform wallet address (receives all USDC payments)
# CRITICAL: This wallet receives real money - secure the private key!
PLATFORM_WALLET_ADDRESS=0x... # Your Base L2 wallet address

# Wallet encryption key (32-byte hex, 64 chars)
# CRITICAL: Used to encrypt custodial wallet private keys
WALLET_ENCRYPTION_KEY=0123456789abcdef... # Generated in Step 1

# ================================================
# Base L2 RPC Configuration (OPTIONAL)
# ================================================

# Primary RPC (defaults to https://mainnet.base.org if not set)
BASE_RPC_URL=https://mainnet.base.org

# Fallback RPCs (optional, for resilience)
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
INFURA_BASE_URL=https://base-mainnet.infura.io/v3/YOUR_API_KEY
QUICKNODE_BASE_URL=https://xxx.base-mainnet.quiknode.pro/YOUR_API_KEY/

# ================================================
# Vercel Cron Secret (REQUIRED for cron jobs)
# ================================================
CRON_SECRET=<random-secret-string>

# Generate cron secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 4: Validate Configuration

```bash
# Test Supabase connection
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/a2a_wallets?select=count"

# Expected: {"count": 0} or {"count": N}

# Test Base RPC connection
curl -X POST $BASE_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Expected: {"jsonrpc":"2.0","id":1,"result":"0x..."}
```

---

## Application Deployment

### Step 1: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy production
vercel --prod

# Set environment variables via Vercel dashboard or CLI:
vercel env add PLATFORM_WALLET_ADDRESS production
vercel env add WALLET_ENCRYPTION_KEY production
vercel env add CRON_SECRET production
# ... (repeat for all env vars)
```

### Step 2: Verify Deployment

```bash
# Test API endpoint
curl https://your-app.vercel.app/api/a2a

# Expected JSON response with API metadata
```

### Step 3: Configure Vercel Cron Job

Verify `vercel.json` contains:

```json
{
  "crons": [
    {
      "path": "/api/cron/reorg-monitor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Vercel will automatically trigger this endpoint every 5 minutes.

---

## Background Jobs

### Reorg Monitor (Vercel Cron)

**Purpose:** Re-verify invoices with <12 confirmations to protect against blockchain reorgs

**Schedule:** Every 5 minutes  
**Endpoint:** `/api/cron/reorg-monitor`  
**Authentication:** Bearer token via `CRON_SECRET`

**Manual trigger (testing):**

```bash
curl -X GET https://your-app.vercel.app/api/cron/reorg-monitor \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "result": {
#     "checkedInvoices": 5,
#     "reVerifiedInvoices": 5,
#     "invalidatedInvoices": 0,
#     "errors": [],
#     "duration": 1234
#   },
#   "timestamp": "2025-11-21T12:00:00.000Z"
# }
```

### Chain Watcher (Optional - For Testnet)

**Purpose:** Scan blockchain for USDC transfers and auto-detect payments

**For production:** Use automatic detection via Vercel Cron (already configured)  
**For testnet:** Run manually for testing

```bash
# Create scripts/run-chain-watcher.ts
ts-node scripts/run-chain-watcher.ts
```

Example `run-chain-watcher.ts`:

```typescript
import { runChainWatcher } from "@/lib/payments/chainWatcher";

async function main() {
  console.log("Starting chain watcher...");
  
  await runChainWatcher({
    interval: 12000, // 12 seconds
  });
}

main().catch(console.error);
```

---

## Testing & Verification

### Step 1: Test with Testnet (Base Sepolia)

```bash
# Get Base Sepolia testnet USDC
# Faucet: https://faucet.circle.com/

# Set testnet env vars
export BASE_RPC_URL=https://sepolia.base.org
export PLATFORM_WALLET_ADDRESS=0x... # Your testnet wallet

# Deploy to Vercel preview
vercel

# Test payment flow
ts-node examples/agent-client.ts
```

### Step 2: Manual API Test

```bash
# 1. Request without payment (should return 402)
curl -X POST https://your-app.vercel.app/api/a2a \
  -H "Content-Type: application/json" \
  -H "x-agent-key: ak_test_12345" \
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {"url": "https://example.com"},
    "id": 1
  }'

# Expected: HTTP 402 with invoice JSON

# 2. Pay invoice on Base L2
# Send USDC to invoice.recipient

# 3. Retry with tx_hash
curl -X POST https://your-app.vercel.app/api/a2a \
  -H "Content-Type: application/json" \
  -H "x-agent-key: ak_test_12345" \
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {
      "url": "https://example.com",
      "tx_hash": "0x..."
    },
    "id": 1
  }'

# Expected: HTTP 200 with result
```

### Step 3: Verify Auto-Detection

```bash
# 1. Create invoice
# 2. Send USDC payment (DON'T provide tx_hash)
# 3. Wait 12-60 seconds for chain watcher
# 4. Check detection stats

curl https://your-app.vercel.app/api/detection-stats

# Expected: match rate >90%
```

### Step 4: Load Test

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Create load-test.js
cat > load-test.js << 'EOF'
import http from 'k6/http';

export default function () {
  http.post('https://your-app.vercel.app/api/a2a', JSON.stringify({
    jsonrpc: "2.0",
    method: "geo.audit.request",
    params: {url: "https://example.com"},
    id: __ITER
  }), {
    headers: {'Content-Type': 'application/json', 'x-agent-key': 'ak_test'}
  });
}
EOF

# Run load test: 10 VUs, 30 seconds
k6 run --vus 10 --duration 30s load-test.js
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Payment Detection Accuracy**
```typescript
import { getDetectionStats } from "@/lib/payments/detectionAnalytics";

const stats = await getDetectionStats();
console.log(`Match Rate: ${stats.matchRate}%`); // Alert if <90%
console.log(`Avg Confidence: ${stats.avgConfidenceScore}`); // Alert if <80
```

2. **Invoice Status Distribution**
```sql
SELECT status, COUNT(*) 
FROM a2a_invoices 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

3. **Ledger Integrity**
```typescript
import { validateLedgerIntegrity } from "@/lib/payments/ledger";

const valid = await validateLedgerIntegrity(userId, "USDC");
// Alert if false
```

4. **RPC Health**
```typescript
import { getRpcEndpointStatus } from "@/lib/payments/rpcProvider";

const endpoints = getRpcEndpointStatus();
const healthy = endpoints.filter(e => e.isHealthy).length;
// Alert if healthy < 1
```

### Recommended Alerts

**Critical Alerts (PagerDuty/OpsGenie):**
- Detection match rate <85% for >1 hour
- All RPC endpoints unhealthy
- Ledger integrity check failed
- Platform wallet USDC balance <$100

**Warning Alerts (Slack/Email):**
- Detection match rate <90% for >1 hour
- >10 detection errors in 10 minutes
- Average confidence score <80 for >1 hour
- Reorg monitor hasn't run in >10 minutes

### Logging Setup

All APA modules use `console.log/warn/error` with prefixes:

- `[Invoice]` - Invoice operations
- `[ChainWatcher]` - Block scanning, payment detection
- `[ReorgMonitor]` - Reorg re-verification
- `[RpcProvider]` - RPC failover, health checks
- `[Ledger]` - Balance operations
- `[A2A]` - API endpoint

**Recommended:** Stream logs to Datadog, LogDNA, or Vercel Analytics

---

## Troubleshooting

### Issue: Invoice payment not detected

**Symptoms:**
- Agent pays invoice but still gets HTTP 402
- Invoice status stuck on `pending`

**Diagnosis:**
```sql
-- Check if payment was detected
SELECT * FROM a2a_payment_detections 
WHERE to_address = '<PLATFORM_WALLET_ADDRESS>' 
ORDER BY created_at DESC LIMIT 10;

-- Check invoice status
SELECT invoice_id, status, tx_hash, confirmations 
FROM a2a_invoices 
WHERE invoice_id = 'inv_...';
```

**Solutions:**
1. Verify chain watcher is running (check Vercel Cron logs)
2. Check if tx is on Base mainnet (not testnet)
3. Wait for 2 confirmations (~4-6 seconds)
4. Check detection confidence: `SELECT confidence_score FROM a2a_payment_detections WHERE tx_hash = '0x...'`
5. If confidence <60: invoice might have expired or amount mismatch

### Issue: "PLATFORM_WALLET_ADDRESS environment variable is required"

**Symptoms:**
- App crashes on startup
- Invoice creation fails

**Solution:**
```bash
# Set environment variable
vercel env add PLATFORM_WALLET_ADDRESS production

# Verify it's set
vercel env ls
```

### Issue: Race condition in balance deduction

**Symptoms:**
- Concurrent requests cause negative balance
- Ledger integrity validation fails

**Diagnosis:**
```sql
-- Check for negative balances
SELECT user_id, token, balance_after 
FROM a2a_ledger 
WHERE balance_after < 0;
```

**Solution:**
- ✅ Already fixed via `credit_ledger_atomic` and `debit_ledger_atomic`
- If issue persists: check Postgres logs for deadlocks
- Increase connection pool size in Supabase settings

### Issue: Detection match rate <90%

**Symptoms:**
- Many payments not auto-detected
- `no_match` status in `a2a_payment_detections`

**Diagnosis:**
```typescript
const failed = await getFailedDetections(100);
console.log("Failed detections:", failed);

// Check common patterns
const criteria = await getMostCommonMatchCriteria();
console.log("Match criteria:", criteria);
```

**Solutions:**
1. Check if invoices are expiring too quickly (increase TTL)
2. Verify time window (±15 min) is sufficient
3. Check for amount rounding issues (±0.01 USDC tolerance)
4. Adjust confidence threshold in migration 006 (currently 60%)

### Issue: RPC endpoint failures

**Symptoms:**
- "RPC request failed" errors
- Chain watcher stalled

**Diagnosis:**
```typescript
const status = getRpcEndpointStatus();
console.log("RPC status:", status);
// Check which endpoints are unhealthy
```

**Solutions:**
1. Add fallback RPCs (Alchemy, Infura)
2. Increase RPC timeout in `rpcProvider.ts`
3. Check rate limits on RPC provider
4. Switch to premium RPC tier

---

## Post-Deployment Checklist

- [ ] All database migrations applied successfully
- [ ] Environment variables configured in Vercel
- [ ] API endpoint responds with metadata (GET /api/a2a)
- [ ] Test payment flow works end-to-end
- [ ] Reorg monitor cron job running every 5 minutes
- [ ] Auto-detection match rate >90%
- [ ] Monitoring dashboards configured
- [ ] Alerts configured (critical + warning)
- [ ] Platform wallet has sufficient USDC for change
- [ ] Documentation shared with team
- [ ] Backup procedures established
- [ ] Incident response plan documented

---

## Support

**Documentation:** https://docs.anoteroslogos.ai/apa  
**Discord:** https://discord.gg/anoteroslogos  
**Email:** support@anoteroslogos.ai

For production incidents, escalate to DevOps team via PagerDuty.

---

**Last Updated:** 2025-11-21  
**Next Review:** After 1 week of production monitoring
