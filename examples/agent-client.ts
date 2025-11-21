/**
 * @file examples/agent-client.ts
 * @description Example AI agent client with automatic payment handling
 * @usage ts-node examples/agent-client.ts
 */

import { ethers } from "ethers";

// =====================================================
// Configuration
// =====================================================

const API_ENDPOINT = process.env.A2A_API_ENDPOINT || "http://localhost:3000/api/a2a";
const AGENT_KEY = process.env.AGENT_KEY || "ak_example_key_12345";
const AGENT_WALLET_PRIVATE_KEY = process.env.AGENT_WALLET_PRIVATE_KEY!;

if (!AGENT_WALLET_PRIVATE_KEY) {
  throw new Error("AGENT_WALLET_PRIVATE_KEY environment variable is required");
}

// Base L2 configuration
const BASE_RPC_URL = "https://mainnet.base.org";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;

// ERC-20 ABI (minimal - only transfer function)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// =====================================================
// Types
// =====================================================

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, any>;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

interface Invoice {
  invoice_id: string;
  amount: number;
  token: string;
  chain_id: number;
  recipient: string;
  expires_at: string;
  memo_hash: string;
}

// =====================================================
// Agent Client
// =====================================================

class AgentClient {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;

  constructor(privateKey: string) {
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, this.wallet);

    console.log(`[Agent] Initialized with address: ${this.wallet.address}`);
  }

  /**
   * Makes JSON-RPC request to A2A API
   * @param method - RPC method
   * @param params - Method parameters
   * @param paymentParams - Optional payment parameters (invoice_id or tx_hash)
   * @returns Response result
   */
  async callMethod(
    method: string,
    params: Record<string, any>,
    paymentParams?: { invoice_id?: string; tx_hash?: string }
  ): Promise<any> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params: { ...params, ...paymentParams },
      id: Date.now(),
    };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-key": AGENT_KEY,
      },
      body: JSON.stringify(request),
    });

    const rpcResponse: JsonRpcResponse = await response.json();

    // Handle errors
    if (rpcResponse.error) {
      // Payment required (HTTP 402)
      if (rpcResponse.error.code === -32001 && response.status === 402) {
        const invoice = rpcResponse.error.data?.invoice as Invoice | undefined;

        if (!invoice) {
          throw new Error("Payment required but no invoice provided");
        }

        console.log(`[Agent] Payment required: ${invoice.amount} ${invoice.token}`);
        console.log(`[Agent] Invoice ID: ${invoice.invoice_id}`);

        // Pay invoice
        const txHash = await this.payInvoice(invoice);

        // Retry request with payment proof
        console.log(`[Agent] Retrying request with tx_hash: ${txHash}`);
        return this.callMethod(method, params, { tx_hash: txHash });
      }

      // Other errors
      throw new Error(`RPC Error [${rpcResponse.error.code}]: ${rpcResponse.error.message}`);
    }

    return rpcResponse.result;
  }

  /**
   * Pays an invoice by sending USDC on Base L2
   * @param invoice - Invoice to pay
   * @returns Transaction hash
   */
  async payInvoice(invoice: Invoice): Promise<string> {
    console.log(`[Agent] Paying invoice ${invoice.invoice_id}...`);

    // Check USDC balance
    const balance = await this.usdcContract.balanceOf(this.wallet.address);
    const requiredAmount = ethers.parseUnits(invoice.amount.toString(), USDC_DECIMALS);

    console.log(`[Agent] USDC Balance: ${ethers.formatUnits(balance, USDC_DECIMALS)}`);
    console.log(`[Agent] Required: ${invoice.amount} USDC`);

    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient USDC balance: have ${ethers.formatUnits(balance, USDC_DECIMALS)}, need ${invoice.amount}`
      );
    }

    // Send USDC transfer
    console.log(`[Agent] Sending ${invoice.amount} USDC to ${invoice.recipient}...`);

    const tx = await this.usdcContract.transfer(invoice.recipient, requiredAmount);

    console.log(`[Agent] Transaction sent: ${tx.hash}`);
    console.log(`[Agent] Waiting for 2 confirmations...`);

    // Wait for 2 confirmations
    const receipt = await tx.wait(2);

    if (receipt.status === 0) {
      throw new Error("Transaction failed");
    }

    console.log(`[Agent] Payment confirmed! Block: ${receipt.blockNumber}`);

    return tx.hash;
  }

  /**
   * Gets USDC balance
   * @returns Balance in USDC
   */
  async getUSDCBalance(): Promise<number> {
    const balance = await this.usdcContract.balanceOf(this.wallet.address);
    return Number(ethers.formatUnits(balance, USDC_DECIMALS));
  }
}

// =====================================================
// Example Usage
// =====================================================

async function main() {
  console.log("=".repeat(60));
  console.log("AI Agent Client - APA Payment Integration Example");
  console.log("=".repeat(60));
  console.log();

  // Initialize agent
  const agent = new AgentClient(AGENT_WALLET_PRIVATE_KEY);

  // Check balance
  const balance = await agent.getUSDCBalance();
  console.log(`[Agent] Current USDC balance: ${balance.toFixed(2)}`);
  console.log();

  try {
    // Example 1: Call geo.audit.request (costs $0.10 for basic tier)
    console.log("--- Example 1: geo.audit.request ---");
    const auditResult = await agent.callMethod("geo.audit.request", {
      url: "https://example.com",
    });

    console.log("[Agent] Audit result:", JSON.stringify(auditResult, null, 2));
    console.log();

    // Example 2: Call causal_citation_trace (costs $0.50 for basic tier)
    console.log("--- Example 2: causal_citation_trace ---");
    const traceResult = await agent.callMethod("causal_citation_trace", {
      claim_id: "claim_12345",
    });

    console.log("[Agent] Citation trace result:", JSON.stringify(traceResult, null, 2));
    console.log();

    // Final balance
    const finalBalance = await agent.getUSDCBalance();
    console.log(`[Agent] Final USDC balance: ${finalBalance.toFixed(2)}`);
    console.log(`[Agent] Total spent: $${(balance - finalBalance).toFixed(2)}`);
  } catch (error) {
    console.error("[Agent] Error:", error);
    process.exit(1);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("✅ Example completed successfully");
  console.log("=".repeat(60));
}

// Run example
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { AgentClient };
