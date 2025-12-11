# CCC Credit System - User Guide

## Welcome to the CCC Economy

The Anóteros Lógos platform uses **CCC (Causal Contribution Credits)** as its native currency. This guide will help you understand how to purchase, use, and manage your credits.

---

## Table of Contents

1. [What are CCC Credits?](#what-are-ccc-credits)
2. [Purchasing Credits](#purchasing-credits)
3. [Using Credits](#using-credits)
4. [Managing Your Balance](#managing-your-balance)
5. [Transaction History](#transaction-history)
6. [Subscription Migration](#subscription-migration)
7. [FAQ](#faq)

---

## What are CCC Credits?

**CCC (Causal Contribution Credits)** are the platform's currency tokens used for all services and operations.

### Key Facts

- **Anchor Price**: 100 CCC ≈ $20 USD
- **Cost per Credit**: $0.20 per CCC
- **Usage**: Pay-per-action model (no monthly subscriptions)
- **Flexibility**: Only pay for what you use
- **Transparency**: Every transaction is recorded and visible

### Why CCC?

The CCC system replaces rigid subscription tiers with flexible, usage-based pricing:

- ✅ **No Wasted Money**: Only pay for services you actually use
- ✅ **No Expiration**: Credits never expire
- ✅ **Transparent Pricing**: See exactly what each operation costs
- ✅ **Scalable**: Buy more credits as you need them
- ✅ **Fair**: Costs align directly with value delivered

---

## Purchasing Credits

### Credit Packages

We offer several credit packages with volume discounts:

| Package | CCC Amount | USD Cost | Cost per CCC | Best For |
|---------|-----------|----------|--------------|----------|
| **Starter Pack** | 100 CCC | $20.00 | $0.20 | Trying out the platform |
| **Pro Pack** | 500 CCC | $90.00 | $0.18 | Regular users |
| **Business Pack** | 1,000 CCC | $160.00 | $0.16 | Small teams |
| **Enterprise Pack** | 5,000 CCC | $700.00 | $0.14 | Large organizations |

💡 **Tip**: Larger packages offer better value per credit!

### How to Purchase (Stripe)

1. **Navigate to Dashboard**
   - Go to your dashboard at `/dashboard`
   - Look for the "Purchase Credits" button

2. **Select a Package**
   - Choose the package that fits your needs
   - Review the CCC amount and cost

3. **Complete Checkout**
   - Click "Purchase" to open Stripe checkout
   - Enter your payment details
   - Complete the purchase

4. **Confirmation**
   - Credits are added to your account immediately
   - You'll receive an email confirmation
   - Your new balance will be displayed on the dashboard

### How to Purchase (Cryptocurrency)

For users who prefer cryptocurrency payments:

1. **Get Platform Wallet Address**
   - Contact support or check the payment page
   - Platform accepts USDC on multiple chains

2. **Send USDC**
   - Send USDC to the platform wallet address
   - Supported chains: Ethereum, Base, Base Sepolia, Sepolia
   - Minimum amount: Equivalent to 10 CCC ($2 USD)

3. **Submit Transaction**
   - Go to `/dashboard/crypto-payment`
   - Enter your transaction hash
   - Select the blockchain network
   - Click "Verify and Credit"

4. **Verification**
   - System verifies transaction on-chain (requires 3 confirmations)
   - Credits are added automatically once verified
   - Typically takes 1-5 minutes depending on network

**Supported Chains:**
- Ethereum Mainnet (Chain ID: 1)
- Base Mainnet (Chain ID: 8453)
- Base Sepolia Testnet (Chain ID: 84532)
- Sepolia Testnet (Chain ID: 11155111)

**Important Notes:**
- Only USDC is accepted (not ETH or other tokens)
- Transaction must be sent to the correct platform wallet
- Each transaction can only be credited once
- Minimum 3 confirmations required

---

## Using Credits

### Operation Costs

Different operations cost different amounts of CCC:

| Operation | Cost | USD Equivalent | Description |
|-----------|------|----------------|-------------|
| **GEO Audit** | 50 CCC | ~$10 | Full site analysis with AI recommendations |
| **Agent Consensus** | 5 CCC | ~$1 | Multi-agent coordination and verification |
| **Citation Intelligence** | 2 CCC | ~$0.40 | Predictive citation recommendations |
| **Real-time Content Analysis** | 1 CCC | ~$0.20 | Live content scoring and feedback |
| **Competitive Intelligence** | 25 CCC | ~$5 | Market analysis and competitor tracking |
| **Causal Tracer** | 15 CCC | ~$3 | Counterfactual simulation |
| **Knowledge Graph Sync** | 10 CCC | ~$2 | Graph database updates |
| **Advanced API Call** | 0.5 CCC | ~$0.10 | Complex operations and AI inference |
| **Basic API Call** | 0.1 CCC | ~$0.02 | Simple read operations |
| **A2A Operation** | 0.2 CCC | ~$0.04 | Agent-to-agent messaging |

### How Credits are Charged

1. **Pre-Operation Check**
   - System checks your balance before each operation
   - If insufficient funds, operation is blocked
   - You'll see a clear error message with required amount

2. **Atomic Deduction**
   - Credits are deducted only if operation succeeds
   - Deduction and operation happen atomically
   - No partial charges or double-billing

3. **Transaction Recording**
   - Every charge is recorded in the ledger
   - You can view all transactions in your history
   - Includes timestamp, amount, and description

### Example: Running a GEO Audit

```
1. You click "Run GEO Audit" for example.com
2. System checks: Do you have 50 CCC? ✓
3. System deducts 50 CCC from your balance
4. Audit runs and completes
5. Results are displayed
6. Transaction appears in your history
```

If you only had 30 CCC:
```
1. You click "Run GEO Audit"
2. System checks: Do you have 50 CCC? ✗
3. Error message: "Insufficient funds. Need 50 CCC, have 30 CCC"
4. Prompt to purchase 20+ more CCC
5. No charge occurs, audit doesn't run
```

---

## Managing Your Balance

### Viewing Your Balance

Your current CCC balance is always visible:

- **Dashboard Header**: Large, prominent display
- **Real-time Updates**: Balance updates immediately after transactions
- **Multi-tab Sync**: Balance syncs across all open tabs

### Low Balance Warnings

The system will warn you when your balance is low:

- **Yellow Warning**: Balance < 100 CCC
- **Red Alert**: Balance < 50 CCC
- **Blocked Operations**: Can't run operations without sufficient funds

### Balance Calculation

Your balance is calculated as:

```
Balance = Sum of all deposits - Sum of all charges
```

The system maintains a cached balance for fast lookups, but you can always verify by checking your transaction history.

---

## Transaction History

### Viewing Transactions

Access your complete transaction history:

1. Go to `/dashboard/transactions`
2. View all deposits and charges
3. Filter by date range or transaction type
4. Export to CSV for accounting

### Transaction Details

Each transaction shows:

- **Date & Time**: When the transaction occurred
- **Type**: DEPOSIT or SPEND
- **Amount**: CCC amount (positive for deposits, negative for charges)
- **Description**: What the transaction was for
- **Balance After**: Your balance after this transaction
- **Metadata**: Additional details (operation type, package name, etc.)

### Transaction Types

**Deposits:**
- `DEPOSIT_STRIPE`: Credit purchase via Stripe
- `DEPOSIT_CRYPTO`: Cryptocurrency payment
- `MIGRATION_CREDIT`: Subscription migration credit

**Charges:**
- `SPEND_AUDIT`: GEO audit operation
- `SPEND_API`: API call
- `SPEND_CONSENSUS`: Agent consensus operation

### Filtering and Search

- **Date Range**: View transactions from specific time periods
- **Transaction Type**: Filter by deposits or specific charge types
- **Recent Activity**: Transactions from last 24 hours are highlighted
- **Pagination**: Navigate through large transaction histories

### Example Transaction History

```
Date                Type              Amount      Description                Balance
─────────────────────────────────────────────────────────────────────────────────
Dec 10, 2025 14:30  DEPOSIT_STRIPE    +100 CCC   Credit purchase (Starter)  100 CCC
Dec 10, 2025 14:35  SPEND_AUDIT       -50 CCC    GEO Audit: example.com     50 CCC
Dec 10, 2025 15:00  SPEND_API         -0.5 CCC   Citation Intelligence      49.5 CCC
Dec 10, 2025 15:30  DEPOSIT_CRYPTO    +500 CCC   Crypto deposit (0x123...)  549.5 CCC
```

---

## Subscription Migration

### For Existing Subscribers

If you had an active subscription before the CCC system launched, your subscription has been automatically migrated to credits.

### Migration Process

1. **Automatic Conversion**
   - Your subscription was converted to CCC credits
   - Credits calculated based on your tier and remaining time
   - No action required on your part

2. **Credit Calculation**
   - **Starter Plan** ($19/month): 95 CCC per month
   - **Pro Plan** ($49/month): 245 CCC per month
   - **Enterprise Plan** ($199/month): 995 CCC per month
   - Pro-rated based on remaining days in your billing period

3. **Email Notification**
   - You received an email with your credit amount
   - Credits were added to your account immediately
   - Old subscription was marked as expired

### Example Migration

If you had:
- **Pro Plan** ($49/month = 245 CCC)
- **15 days remaining** in billing period

You received:
- **~122 CCC** (half of 245, pro-rated)

### Checking Migration Status

1. Go to your transaction history
2. Look for a `MIGRATION_CREDIT` transaction
3. This shows your migrated credit amount

### Migration Benefits

- ✅ **No Value Lost**: You received full value of remaining subscription
- ✅ **More Flexibility**: Use credits as needed, not locked into monthly billing
- ✅ **Better Value**: Pay only for what you use
- ✅ **No Expiration**: Credits never expire

---

## FAQ

### General Questions

**Q: Do credits expire?**  
A: No, CCC credits never expire. Use them whenever you need them.

**Q: Can I get a refund?**  
A: Credit purchases are non-refundable, but credits never expire so you can use them anytime.

**Q: What happens if I don't have enough credits?**  
A: Operations will be blocked with a clear error message. You'll need to purchase more credits to continue.

**Q: Can I transfer credits to another user?**  
A: No, credits are tied to your account and cannot be transferred.

**Q: Is there a minimum purchase?**  
A: Yes, the minimum is the Starter Pack (100 CCC for $20).

### Pricing Questions

**Q: Why do larger packages cost less per credit?**  
A: We offer volume discounts to reward users who commit to larger purchases.

**Q: Will prices change?**  
A: The anchor price (100 CCC ≈ $20) is stable. Operation costs may be adjusted based on computational resources, but you'll always see current prices before operations.

**Q: Can I see a breakdown of my spending?**  
A: Yes, your transaction history shows every charge with full details.

### Technical Questions

**Q: How are credits deducted?**  
A: Credits are deducted atomically - the balance check and deduction happen in a single database transaction to prevent race conditions.

**Q: What if a payment fails?**  
A: Stripe payments are verified before credits are added. If a payment fails, no credits are added and you can retry.

**Q: How long does crypto verification take?**  
A: Typically 1-5 minutes after 3 blockchain confirmations. Depends on network congestion.

**Q: Can I use multiple payment methods?**  
A: Yes, you can purchase credits via Stripe (card) or cryptocurrency (USDC) at any time.

**Q: Is my payment information secure?**  
A: Yes, we use Stripe for card payments (PCI compliant) and never store your payment details. Crypto payments are verified on-chain.

### Account Questions

**Q: What happens to my balance if I delete my account?**  
A: Unused credits are forfeited upon account deletion. Make sure to use your credits before deleting your account.

**Q: Can I see my balance in USD?**  
A: Yes, multiply your CCC balance by $0.20 to get the USD equivalent.

**Q: How do I know if a transaction was successful?**  
A: Successful transactions appear immediately in your transaction history and your balance updates in real-time.

### Migration Questions

**Q: I had a subscription - where are my credits?**  
A: Check your transaction history for a `MIGRATION_CREDIT` entry. If you don't see one, contact support.

**Q: Can I go back to a subscription?**  
A: No, the platform has fully transitioned to the CCC credit system. This provides more flexibility and better value.

**Q: What if I was charged for my subscription after migration?**  
A: Contact support immediately. Subscriptions should have been cancelled during migration.

---

## Getting Help

### Support Channels

- **Email**: support@anoteros-logos.com
- **Documentation**: `/docs/billing`
- **Status Page**: status.anoteros-logos.com

### Common Issues

**Issue: Credits not showing after purchase**
- Check your transaction history
- Wait 1-2 minutes for processing
- Check your email for confirmation
- Contact support if still missing after 5 minutes

**Issue: Crypto payment not credited**
- Verify transaction has 3+ confirmations
- Check you sent to correct wallet address
- Verify you sent USDC (not ETH or other tokens)
- Submit transaction hash via `/dashboard/crypto-payment`

**Issue: Insufficient funds error**
- Check your current balance
- Calculate operation cost
- Purchase additional credits if needed

**Issue: Transaction history not loading**
- Refresh the page
- Clear browser cache
- Try a different browser
- Contact support if persists

---

## Tips for Maximizing Value

1. **Buy Larger Packages**: Save up to 30% with Enterprise Pack
2. **Monitor Your Balance**: Set reminders to top up before running low
3. **Use Transaction History**: Track spending patterns and optimize usage
4. **Plan Ahead**: Purchase credits in advance for large projects
5. **Crypto Payments**: Save on payment processing fees with USDC

---

## Updates and Changes

This guide is regularly updated. Check back for:
- New credit packages
- Additional payment methods
- New operations and costs
- Feature updates

**Last Updated**: December 2025  
**Version**: 1.0.0

---

**Thank you for using the Anóteros Lógos platform!**

For the latest updates and announcements, follow us on social media or check our blog.
