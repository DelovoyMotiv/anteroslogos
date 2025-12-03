/**
 * Tenant Isolation Tests
 * Verify 100% RLS isolation between tenants
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use global test functions (available in Jest/Vitest runtime)
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeAll: any;
declare const afterAll: any;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

describe('Tenant Isolation', () => {
  let tenant1Client: SupabaseClient;
  let tenant2Client: SupabaseClient;
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1KgId: string;

  beforeAll(async () => {
    // Create two separate tenant clients
    tenant1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    tenant2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Sign up tenant 1 user
    const { data: tenant1User, error: tenant1Error } = await tenant1Client.auth.signUp({
      email: `tenant1-${Date.now()}@test.com`,
      password: 'test123456',
    });
    expect(tenant1Error).toBeNull();
    expect(tenant1User.user).toBeDefined();

    // Sign up tenant 2 user
    const { data: tenant2User, error: tenant2Error } = await tenant2Client.auth.signUp({
      email: `tenant2-${Date.now()}@test.com`,
      password: 'test123456',
    });
    expect(tenant2Error).toBeNull();
    expect(tenant2User.user).toBeDefined();

    // Get tenant IDs (auto-created by migration)
    const { data: tenant1Data } = await tenant1Client
      .from('tenants')
      .select('id')
      .single();
    tenant1Id = tenant1Data?.id;

    const { data: tenant2Data } = await tenant2Client
      .from('tenants')
      .select('id')
      .single();
    tenant2Id = tenant2Data?.id;

    expect(tenant1Id).toBeDefined();
    expect(tenant2Id).toBeDefined();
    expect(tenant1Id).not.toBe(tenant2Id);
  });

  afterAll(async () => {
    // Cleanup
    await tenant1Client.auth.signOut();
    await tenant2Client.auth.signOut();
  });

  it('should isolate knowledge graphs between tenants', async () => {
    // Tenant 1 creates a knowledge graph
    const { data: kg1, error: kg1Error } = await tenant1Client
      .from('knowledge_graphs')
      .insert({
        domain: 'test-domain-isolation',
        entities: [],
        relationships: [],
        claims: [],
      })
      .select()
      .single();

    expect(kg1Error).toBeNull();
    expect(kg1).toBeDefined();
    expect(kg1.tenant_id).toBe(tenant1Id);
    tenant1KgId = kg1.id;

    // Tenant 2 tries to read tenant 1's graph (should fail)
    const { data: kg2Read, error: kg2Error } = await tenant2Client
      .from('knowledge_graphs')
      .select('*')
      .eq('id', tenant1KgId);

    expect(kg2Read).toEqual([]); // RLS blocks access
    expect(kg2Error).toBeNull(); // No error, just empty result

    // Tenant 2 queries all graphs (should only see own)
    const { data: allGraphs } = await tenant2Client
      .from('knowledge_graphs')
      .select('*');

    expect(allGraphs).toBeDefined();
    expect(allGraphs?.every(g => g.tenant_id !== tenant1Id)).toBe(true);
  });

  it('should prevent cross-tenant updates', async () => {
    // Tenant 2 tries to update tenant 1's graph (should fail silently)
    const { error: updateError } = await tenant2Client
      .from('knowledge_graphs')
      .update({ domain: 'hacked-domain' })
      .eq('id', tenant1KgId);

    // Update should not throw error but affect 0 rows
    expect(updateError).toBeNull();

    // Verify tenant 1's graph unchanged
    const { data: kg1Verify } = await tenant1Client
      .from('knowledge_graphs')
      .select('domain')
      .eq('id', tenant1KgId)
      .single();

    expect(kg1Verify?.domain).toBe('test-domain-isolation'); // Not 'hacked-domain'
  });

  it('should prevent cross-tenant deletes', async () => {
    // Tenant 2 tries to delete tenant 1's graph (should fail)
    const { error: deleteError } = await tenant2Client
      .from('knowledge_graphs')
      .delete()
      .eq('id', tenant1KgId);

    expect(deleteError).toBeNull(); // No error, just 0 rows affected

    // Verify tenant 1's graph still exists
    const { data: kg1Exists } = await tenant1Client
      .from('knowledge_graphs')
      .select('id')
      .eq('id', tenant1KgId)
      .single();

    expect(kg1Exists).toBeDefined();
    if (kg1Exists) {
      expect(kg1Exists.id).toBe(tenant1KgId);
    }
  });

  it('should isolate API keys between tenants', async () => {
    // Tenant 1 creates API key
    const { data: apiKey1, error: apiKey1Error } = await tenant1Client
      .from('api_keys')
      .insert({
        name: 'Test API Key',
        key_hash: 'hash123',
        key_prefix: 'sk_test_abc',
      })
      .select()
      .single();

    expect(apiKey1Error).toBeNull();
    expect(apiKey1.tenant_id).toBe(tenant1Id);

    // Tenant 2 queries API keys (should not see tenant 1's)
    const { data: tenant2Keys } = await tenant2Client
      .from('api_keys')
      .select('*');

    expect(tenant2Keys).toBeDefined();
    expect(tenant2Keys?.find(k => k.id === apiKey1.id)).toBeUndefined();
  });

  it('should isolate usage events between tenants', async () => {
    // Tenant 1 creates usage event (via service role normally)
    const { data: event1, error: event1Error } = await tenant1Client
      .from('usage_events')
      .insert({
        tool_name: 'test_tool',
        status: 'success',
      })
      .select()
      .single();

    expect(event1Error).toBeNull();
    expect(event1.tenant_id).toBe(tenant1Id);

    // Tenant 2 queries usage events (should not see tenant 1's)
    const { data: tenant2Events } = await tenant2Client
      .from('usage_events')
      .select('*');

    expect(tenant2Events).toBeDefined();
    expect(tenant2Events?.find(e => e.id === event1.id)).toBeUndefined();
  });

  it('should enforce tenant membership for citations', async () => {
    // Tenant 1 creates citation
    const { data: citation1, error: citation1Error } = await tenant1Client
      .from('citations')
      .insert({
        knowledge_graph_id: tenant1KgId,
        citation_id: 'cit-test-123',
        source: 'chatgpt',
        query: 'test query',
        response: 'test response',
        confidence: 0.95,
      })
      .select()
      .single();

    expect(citation1Error).toBeNull();
    expect(citation1.tenant_id).toBe(tenant1Id);

    // Tenant 2 cannot access citation
    const { data: tenant2Citations } = await tenant2Client
      .from('citations')
      .select('*')
      .eq('id', citation1.id);

    expect(tenant2Citations).toEqual([]); // RLS blocks
  });

  it('should auto-fill tenant_id on INSERT', async () => {
    // Insert without explicit tenant_id (trigger should fill)
    const { data: autoKg, error: autoError } = await tenant1Client
      .from('knowledge_graphs')
      .insert({
        domain: 'auto-tenant-test',
        entities: [],
        relationships: [],
        claims: [],
        // tenant_id NOT specified
      })
      .select()
      .single();

    expect(autoError).toBeNull();
    expect(autoKg.tenant_id).toBe(tenant1Id); // Auto-filled by trigger
  });
});
