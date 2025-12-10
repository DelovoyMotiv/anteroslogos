/**
 * Next.js API Route: Crypto Payment Verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyUSDCTransaction, processCryptoPayment } from '../../../lib/billing/crypto';
import { getBillingService } from '../../../lib/billing/BillingService';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify JWT token and extract user ID
 */
async function verifyAuth(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  
  // Verify token with Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }
  
  return user.id;
}

/**
 * POST /api/crypto-payment
 * Submit a USDC transaction for verification and crediting
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const userId = await verifyAuth(req);
    
    // Parse request body
    const body = await req.json();
    const { txHash, chainId } = body;
    
    if (!txHash || typeof txHash !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid txHash' },
        { status: 400 }
      );
    }
    
    if (!chainId || typeof chainId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid chainId' },
        { status: 400 }
      );
    }
    
    // Verify transaction on-chain
    console.log(`Verifying transaction ${txHash} on chain ${chainId} for user ${userId}`);
    
    const verifiedTx = await verifyUSDCTransaction(txHash, chainId);
    
    // Process payment and credit account
    const billingService = getBillingService();
    
    await processCryptoPayment(userId, verifiedTx, billingService);
    
    // Return success response
    return NextResponse.json({
      success: true,
      transaction: {
        txHash: verifiedTx.txHash,
        usdcAmount: verifiedTx.amount,
        cccAmount: verifiedTx.cccAmount,
        confirmations: verifiedTx.confirmations,
        blockNumber: verifiedTx.blockNumber,
      },
      newBalance: (await billingService.getBalance(userId)),
    });
  } catch (error) {
    console.error('Crypto payment verification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Determine appropriate status code
    let statusCode = 500;
    
    if (errorMessage.includes('not found') || errorMessage.includes('Invalid')) {
      statusCode = 400;
    } else if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      statusCode = 401;
    } else if (errorMessage.includes('already been processed')) {
      statusCode = 409; // Conflict
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
