/**
 * POST /api/subscriptions/verify-payment
 * Verify USDC payment and activate subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { activateSubscription } from '../../../../lib/subscriptions/manager';

export async function POST(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { invoiceId, txHash } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Activate subscription using manager
    const result = await activateSubscription(invoiceId, txHash);

    if (!result.verified) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Payment not found or invalid'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      invoice: result.invoice,
    }, { status: 200 });
  } catch (error) {
    console.error('Verify payment endpoint error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Enable CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
