/**
 * GET /api/jobs/[jobId]
 * Get audit job status and result
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TenantContextManager } from '@/lib/tenancy/context';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/jobs/:jobId
 * Returns job status, progress, and result (if completed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  try {
    // Extract tenant context
    const authHeader = request.headers.get('authorization');
    const tenantHeader = request.headers.get('x-tenant-id');

    if (!authHeader && !tenantHeader) {
      return NextResponse.json(
        { error: 'Missing authentication. Provide Authorization or X-Tenant-ID header.' },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Set tenant context for RLS
    if (tenantHeader) {
      await supabase.rpc('set_config', {
        key: 'app.current_tenant_id',
        value: tenantHeader,
      });
    }

    // Query job from database
    const { data: job, error } = await supabase
      .from('audit_jobs')
      .select(
        `
        id,
        url,
        priority,
        status,
        depth,
        created_at,
        started_at,
        completed_at,
        progress,
        result,
        error,
        retry_count,
        max_retries,
        metadata
      `
      )
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
    }

    // Get webhook status if exists
    const { data: webhooks } = await supabase
      .from('job_webhooks')
      .select('webhook_url, status, attempts, last_attempt_at, response_code')
      .eq('job_id', jobId);

    // Format response
    const response = {
      id: job.id,
      url: job.url,
      priority: job.priority,
      status: job.status,
      depth: job.depth,
      progress: job.progress,
      result: job.result,
      error: job.error,
      timestamps: {
        created: job.created_at,
        started: job.started_at,
        completed: job.completed_at,
      },
      retries: {
        count: job.retry_count,
        max: job.max_retries,
      },
      metadata: job.metadata,
      webhooks: webhooks || [],
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API] Failed to get job:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
