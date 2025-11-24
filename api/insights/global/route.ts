/**
 * GET /api/insights/global
 * Global audit insights, industry benchmarks, and percentile rankings
 * Requires service role or tenant context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  aggregateGlobalInsights,
  calculateIndustryBenchmarks,
  calculatePercentileRanking,
  calculateCategoryBenchmarks,
  calculateTrendAnalysis,
} from '@/lib/insights/globalAggregator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/insights/global
 * Query params:
 * - timeRange: '7d' | '30d' | '90d' (default: '30d')
 * - includeIndustry: 'true' | 'false' (default: 'false')
 * - tenantId: UUID (optional, for percentile ranking)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = (searchParams.get('timeRange') || '30d') as '7d' | '30d' | '90d';
    const includeIndustry = searchParams.get('includeIndustry') === 'true';
    const tenantId = searchParams.get('tenantId');

    // Validate time range
    if (!['7d', '30d', '90d'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange. Must be 7d, 30d, or 90d.' },
        { status: 400 }
      );
    }

    // Create service role client (bypass RLS for global stats)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Aggregate global insights
    const globalInsights = await aggregateGlobalInsights(supabase, timeRange);

    if (!globalInsights) {
      return NextResponse.json(
        { error: 'No audit data available' },
        { status: 404 }
      );
    }

    // 2. Calculate industry benchmarks (optional)
    let industryBenchmarks = undefined;
    if (includeIndustry) {
      industryBenchmarks = await calculateIndustryBenchmarks(
        supabase,
        timeRange === '7d' ? '30d' : timeRange // Min 30d for industry stats
      );
    }

    // 3. Calculate tenant-specific insights (if tenantId provided)
    let tenantInsights = undefined;
    if (tenantId) {
      const [percentileRanking, categoryBenchmarks, trendAnalysis] = await Promise.all([
        calculatePercentileRanking(supabase, tenantId),
        calculateCategoryBenchmarks(supabase, tenantId),
        calculateTrendAnalysis(supabase, tenantId),
      ]);

      tenantInsights = {
        percentileRanking,
        categoryBenchmarks,
        trendAnalysis,
      };
    }

    // Format response
    const response = {
      global: globalInsights,
      industry: industryBenchmarks,
      tenant: tenantInsights,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataFreshness: globalInsights.lastUpdated,
        timeRange,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache 5min, stale 10min
      },
    });
  } catch (error) {
    console.error('[API] Failed to get global insights:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/insights/global/refresh
 * Manually refresh materialized view (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin token required.' },
        { status: 401 }
      );
    }

    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Refresh materialized view
    const { error } = await supabase.rpc('refresh_global_insights');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Global insights materialized view refreshed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to refresh global insights:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
