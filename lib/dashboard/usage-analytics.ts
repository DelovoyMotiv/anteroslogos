// @ts-nocheck
/**
 * Usage Analytics
 * Query aggregations and real-time usage statistics
 */

import { supabase, isSupabaseConfigured } from '../supabase';

export interface UsageStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  rate_limited_calls: number;
  total_tokens: number;
  total_cost: number;
  unique_tools: number;
  ucpt_verified_calls: number;
  avg_duration_ms: number;
}

export interface DailyUsage {
  date: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  rate_limited_calls: number;
  total_tokens: number;
  total_cost: number;
  unique_tools: number;
  ucpt_verified_calls: number;
  avg_duration_ms: number;
}

export interface ToolUsage {
  tool_name: string;
  usage_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  api_key_id: string | null;
  tool_name: string;
  status: 'success' | 'error' | 'rate_limited' | 'unauthorized';
  error_message: string | null;
  duration_ms: number | null;
  tokens_used: number;
  cost_usd: number;
  timestamp: string;
}

/**
 * Get usage stats for date range
 */
export async function getUsageStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageStats | { error: string }> {
  try {
    // Dev mode: return mock data if supabase not configured (local only)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && !supabase) {
      console.warn('[DEV MODE] getUsageStats: Returning mock data (LOCAL ONLY)');
      return {
        total_calls: 156,
        successful_calls: 142,
        failed_calls: 14,
        rate_limited_calls: 0,
        total_tokens: 45280,
        total_cost: 4.52,
        unique_tools: 5,
        ucpt_verified_calls: 98,
        avg_duration_ms: 247,
      };
    }
    
    const { data, error } = await supabase.rpc('get_usage_stats', {
      p_user_id: userId,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      // Fallback to manual query if RPC not available
      return await getUsageStatsManual(userId, startDate, endDate);
    }

    return data[0] || {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      rate_limited_calls: 0,
      total_tokens: 0,
      total_cost: 0,
      unique_tools: 0,
      ucpt_verified_calls: 0,
      avg_duration_ms: 0,
    };
  } catch (error) {
    console.error('getUsageStats error:', error);
    return { error: 'Failed to fetch usage stats' };
  }
}

/**
 * Manual aggregation (fallback)
 */
async function getUsageStatsManual(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageStats> {
  const { data: events } = await supabase
    .from('usage_events')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  if (!events || events.length === 0) {
    return {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      rate_limited_calls: 0,
      total_tokens: 0,
      total_cost: 0,
      unique_tools: 0,
      ucpt_verified_calls: 0,
      avg_duration_ms: 0,
    };
  }

  const stats = {
    total_calls: events.length,
    successful_calls: events.filter(e => e.status === 'success').length,
    failed_calls: events.filter(e => e.status === 'error').length,
    rate_limited_calls: events.filter(e => e.status === 'rate_limited').length,
    total_tokens: events.reduce((sum, e) => sum + (e.tokens_used || 0), 0),
    total_cost: events.reduce((sum, e) => sum + parseFloat(String(e.cost_usd || 0)), 0),
    unique_tools: new Set(events.map(e => e.tool_name)).size,
    ucpt_verified_calls: events.filter(e => e.ucpt_hash).length,
    avg_duration_ms: Math.round(
      events.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / events.length
    ),
  };

  return stats;
}

/**
 * Get daily usage breakdown
 */
export async function getDailyUsage(
  userId: string,
  days: number = 30
): Promise<DailyUsage[] | { error: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use the view if available
    const { data, error } = await supabase
      .from('user_usage_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      // Fallback to manual aggregation
      return await getDailyUsageManual(userId, days);
    }

    return data || [];
  } catch (error) {
    console.error('getDailyUsage error:', error);
    return { error: 'Failed to fetch daily usage' };
  }
}

/**
 * Manual daily aggregation (fallback)
 */
async function getDailyUsageManual(
  userId: string,
  days: number
): Promise<DailyUsage[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: events } = await supabase
    .from('usage_events')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: false });

  if (!events || events.length === 0) {
    return [];
  }

  // Group by date
  const grouped = new Map<string, UsageEvent[]>();
  for (const event of events) {
    const date = event.timestamp.split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(event);
  }

  // Aggregate
  const daily: DailyUsage[] = [];
  for (const [date, dayEvents] of grouped.entries()) {
    daily.push({
      date,
      total_calls: dayEvents.length,
      successful_calls: dayEvents.filter(e => e.status === 'success').length,
      failed_calls: dayEvents.filter(e => e.status === 'error').length,
      rate_limited_calls: dayEvents.filter(e => e.status === 'rate_limited').length,
      total_tokens: dayEvents.reduce((sum, e) => sum + (e.tokens_used || 0), 0),
      total_cost: dayEvents.reduce((sum, e) => sum + parseFloat(String(e.cost_usd || 0)), 0),
      unique_tools: new Set(dayEvents.map(e => e.tool_name)).size,
      ucpt_verified_calls: dayEvents.filter(e => e.ucpt_hash).length,
      avg_duration_ms: Math.round(
        dayEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / dayEvents.length
      ),
    });
  }

  return daily.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get top tools by usage
 */
export async function getTopTools(
  userId: string,
  limit: number = 10,
  days: number = 7
): Promise<ToolUsage[] | { error: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await supabase
      .from('usage_events')
      .select('tool_name, status, duration_ms, tokens_used')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString());

    if (!events || events.length === 0) {
      return [];
    }

    // Group by tool
    const grouped = new Map<string, UsageEvent[]>();
    for (const event of events as UsageEvent[]) {
      if (!grouped.has(event.tool_name)) {
        grouped.set(event.tool_name, []);
      }
      grouped.get(event.tool_name)!.push(event);
    }

    // Aggregate
    const tools: ToolUsage[] = [];
    for (const [tool_name, toolEvents] of grouped.entries()) {
      const successCount = toolEvents.filter(e => e.status === 'success').length;
      tools.push({
        tool_name,
        usage_count: toolEvents.length,
        success_rate: Math.round((successCount / toolEvents.length) * 100),
        avg_duration_ms: Math.round(
          toolEvents.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / toolEvents.length
        ),
        total_tokens: toolEvents.reduce((sum, e) => sum + (e.tokens_used || 0), 0),
      });
    }

    // Sort by usage and limit
    return tools.sort((a, b) => b.usage_count - a.usage_count).slice(0, limit);
  } catch (error) {
    console.error('getTopTools error:', error);
    return { error: 'Failed to fetch top tools' };
  }
}

/**
 * Get recent usage events
 */
export async function getRecentUsage(
  userId: string,
  limit: number = 50
): Promise<UsageEvent[] | { error: string }> {
  try {
    const { data: events, error } = await supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getRecentUsage error:', error);
      return { error: 'Failed to fetch recent usage' };
    }

    return events || [];
  } catch (error) {
    console.error('getRecentUsage error:', error);
    return { error: 'Failed to fetch recent usage' };
  }
}

/**
 * Get usage for specific API key
 */
export async function getAPIKeyUsage(
  userId: string,
  apiKeyId: string,
  days: number = 30
): Promise<UsageStats | { error: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', userId)
      .eq('api_key_id', apiKeyId)
      .gte('timestamp', startDate.toISOString());

    if (!events || events.length === 0) {
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        rate_limited_calls: 0,
        total_tokens: 0,
        total_cost: 0,
        unique_tools: 0,
        ucpt_verified_calls: 0,
        avg_duration_ms: 0,
      };
    }

    return {
      total_calls: events.length,
      successful_calls: events.filter(e => e.status === 'success').length,
      failed_calls: events.filter(e => e.status === 'error').length,
      rate_limited_calls: events.filter(e => e.status === 'rate_limited').length,
      total_tokens: events.reduce((sum, e) => sum + (e.tokens_used || 0), 0),
      total_cost: events.reduce((sum, e) => sum + parseFloat(String(e.cost_usd || 0)), 0),
      unique_tools: new Set(events.map(e => e.tool_name)).size,
      ucpt_verified_calls: events.filter(e => e.ucpt_hash).length,
      avg_duration_ms: Math.round(
        events.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / events.length
      ),
    };
  } catch (error) {
    console.error('getAPIKeyUsage error:', error);
    return { error: 'Failed to fetch API key usage' };
  }
}

/**
 * Log usage event (called from API endpoints)
 */
export async function logUsageEvent(params: {
  user_id: string;
  api_key_id?: string;
  tool_name: string;
  input_hash?: string;
  ucpt_hash?: string;
  status: 'success' | 'error' | 'rate_limited' | 'unauthorized';
  error_message?: string;
  duration_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('usage_events').insert({
      user_id: params.user_id,
      api_key_id: params.api_key_id || null,
      tool_name: params.tool_name,
      input_hash: params.input_hash || null,
      ucpt_hash: params.ucpt_hash || null,
      status: params.status,
      error_message: params.error_message || null,
      duration_ms: params.duration_ms || null,
      tokens_used: params.tokens_used || 0,
      cost_usd: params.cost_usd || 0,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('logUsageEvent error:', error);
      return { success: false, error: 'Failed to log usage event' };
    }

    return { success: true };
  } catch (error) {
    console.error('logUsageEvent error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get UCPT verification rate
 */
export async function getUCPTRate(
  userId: string,
  days: number = 7
): Promise<number | { error: string }> {
  try {
    // Dev mode: return mock data (local only)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && (!supabase || !isSupabaseConfigured())) {
      console.warn('[DEV MODE] getUCPTRate: Returning mock rate (LOCAL ONLY)');
      return 63; // 63% verified
    }

    if (!supabase) {
      console.error('getUCPTRate: Supabase client not available');
      return { error: 'Database client not configured' };
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events } = await supabase
      .from('usage_events')
      .select('ucpt_hash')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString());

    if (!events || events.length === 0) {
      return 0;
    }

    const verifiedCount = events.filter(e => e.ucpt_hash).length;
    return Math.round((verifiedCount / events.length) * 100);
  } catch (error) {
    console.error('getUCPTRate error:', error);
    return { error: 'Failed to calculate UCPT rate' };
  }
}

/**
 * Get current billing cycle usage
 */
export async function getCurrentCycleUsage(
  userId: string
): Promise<UsageStats | { error: string }> {
  try {
    // Dev mode: return mock data (local only)
    const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalDev && (!supabase || !isSupabaseConfigured())) {
      console.warn('[DEV MODE] getCurrentCycleUsage: Returning mock data (LOCAL ONLY)');
      return {
        total_calls: 78,
        successful_calls: 71,
        failed_calls: 7,
        rate_limited_calls: 0,
        total_tokens: 22140,
        total_cost: 2.21,
        unique_tools: 4,
        ucpt_verified_calls: 45,
        avg_duration_ms: 234,
      };
    }

    if (!supabase) {
      console.error('getCurrentCycleUsage: Supabase client not available');
      return { error: 'Database client not configured' };
    }
    
    // Get subscription to determine cycle dates
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('current_period_start, current_period_end')
      .eq('user_id', userId)
      .single();

    const startDate = subscription?.current_period_start
      ? new Date(subscription.current_period_start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1); // First of month

    const endDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : new Date(); // Now

    return await getUsageStats(userId, startDate, endDate);
  } catch (error) {
    console.error('getCurrentCycleUsage error:', error);
    return { error: 'Failed to fetch cycle usage' };
  }
}
