/**
 * AUX Audit Database Integration Tests
 * 
 * Tests that audit results are correctly saved to the database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = !!(supabaseUrl && supabaseKey);

describe('AUX Audit Database Integration', () => {
  let supabase: SupabaseClient;
  let testAuditId: string | null = null;

  beforeAll(() => {
    if (!hasSupabase) {
      console.warn('Skipping database tests: Supabase not configured');
      return;
    }
    supabase = createClient(supabaseUrl!, supabaseKey!);
  });

  afterAll(async () => {
    if (!hasSupabase || !testAuditId) return;
    
    // Clean up test data
    try {
      await supabase
        .from('aux_audits')
        .delete()
        .eq('id', testAuditId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  it('should have aux_audits table with correct schema', async () => {
    if (!hasSupabase) {
      console.log('Skipping: Supabase not configured');
      return;
    }

    const { data, error } = await supabase
      .from('aux_audits')
      .select('*')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should insert audit results into database', async () => {
    if (!hasSupabase) {
      console.log('Skipping: Supabase not configured');
      return;
    }

    const testAudit = {
      url: 'https://example.com/test',
      normalized_url: 'https://example.com/test',
      domain: 'example.com',
      analyzed_at: new Date().toISOString(),
      aux_score: 75,
      classification: 'Agent-Capable',
      aria_score: 60,
      risk_level: 'medium',
      protocols: [
        { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' }
      ],
      interactive_elements: [
        { tag: 'button', selector: 'button.submit', hasAriaLabel: true }
      ],
      friction_points: [
        { type: 'captcha', description: 'CAPTCHA detected', severity: 'high' }
      ],
      recommendations: [
        { title: 'Add ARIA labels', description: 'Improve accessibility', priority: 'high', impact: 15 }
      ],
      intent_triggers: [
        { intent: 'submit', selector: 'button.submit', confidence: 'high' }
      ],
      summary: 'Test audit summary',
      duration_ms: 1500,
    };

    const { data, error } = await supabase
      .from('aux_audits')
      .insert(testAudit)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.aux_score).toBe(75);
    expect(data?.classification).toBe('Agent-Capable');
    expect(data?.domain).toBe('example.com');

    // Store ID for cleanup
    if (data) {
      testAuditId = data.id;
    }
  });

  it('should query audit results by domain', async () => {
    if (!hasSupabase || !testAuditId) {
      console.log('Skipping: Supabase not configured or no test data');
      return;
    }

    const { data, error } = await supabase
      .from('aux_audits')
      .select('*')
      .eq('domain', 'example.com')
      .eq('id', testAuditId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.domain).toBe('example.com');
  });

  it('should use aux_audits_summary view', async () => {
    if (!hasSupabase || !testAuditId) {
      console.log('Skipping: Supabase not configured or no test data');
      return;
    }

    const { data, error } = await supabase
      .from('aux_audits_summary')
      .select('*')
      .eq('id', testAuditId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.protocol_count).toBeGreaterThan(0);
    expect(data?.friction_point_count).toBeGreaterThan(0);
  });

  it('should call get_user_aux_audit_stats function', async () => {
    if (!hasSupabase) {
      console.log('Skipping: Supabase not configured');
      return;
    }

    // Use a test user ID (will return empty stats if user doesn't exist)
    const testUserId = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase
      .rpc('get_user_aux_audit_stats', { p_user_id: testUserId });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('total_audits');
    expect(data).toHaveProperty('avg_aux_score');
  });

  it('should call get_domain_aux_audit_history function', async () => {
    if (!hasSupabase) {
      console.log('Skipping: Supabase not configured');
      return;
    }

    const { data, error } = await supabase
      .rpc('get_domain_aux_audit_history', {
        p_domain: 'example.com',
        p_user_id: null,
        p_limit: 10
      });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should call get_protocol_adoption_stats function', async () => {
    if (!hasSupabase) {
      console.log('Skipping: Supabase not configured');
      return;
    }

    const { data, error } = await supabase
      .rpc('get_protocol_adoption_stats', { p_user_id: null });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });
});
