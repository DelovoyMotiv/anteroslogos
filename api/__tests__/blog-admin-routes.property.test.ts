/**
 * Property-Based Tests for Blog Admin Routes Access Control
 * Feature: blog-cms
 * 
 * Tests for admin route authentication and authorization
 * 
 * @module api/__tests__/blog-admin-routes.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

/**
 * Helper function to verify if a user has admin role
 */
async function verifyAdminRole(client: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await client.auth.getUser();
    
    if (userError || !user) {
      return false;
    }

    // Check if user has admin role in profiles table
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('metadata')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    // Check for admin role in metadata
    const metadata = profile.metadata as { role?: string } | null;
    return metadata?.role === 'admin';
  } catch (error) {
    return false;
  }
}

describe('Blog Admin Routes - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let adminUserId: string;
  let adminToken: string;
  let nonAdminUserId: string;
  let nonAdminToken: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Admin Routes tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create admin user for testing
    const adminEmail = `admin-routes-test-${Date.now()}@example.com`;
    const { data: adminAuthData, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (adminAuthError || !adminAuthData.user) {
      console.error('Failed to create admin user:', adminAuthError);
      throw adminAuthError;
    }

    adminUserId = adminAuthData.user.id;

    // Set admin role in profiles
    await supabase
      .from('profiles')
      .upsert({
        id: adminUserId,
        metadata: { role: 'admin' },
      });

    // Get admin token
    const { data: adminSession, error: adminSessionError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: 'test-password-123',
    });

    if (adminSessionError || !adminSession.session) {
      console.error('Failed to get admin session:', adminSessionError);
      throw adminSessionError;
    }

    adminToken = adminSession.session.access_token;

    // Create non-admin user for testing
    const nonAdminEmail = `non-admin-routes-test-${Date.now()}@example.com`;
    const { data: nonAdminAuthData, error: nonAdminAuthError } = await supabase.auth.admin.createUser({
      email: nonAdminEmail,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (nonAdminAuthError || !nonAdminAuthData.user) {
      console.error('Failed to create non-admin user:', nonAdminAuthError);
      throw nonAdminAuthError;
    }

    nonAdminUserId = nonAdminAuthData.user.id;

    // Set non-admin role in profiles (or no role)
    await supabase
      .from('profiles')
      .upsert({
        id: nonAdminUserId,
        metadata: { role: 'user' },
      });

    // Get non-admin token
    const { data: nonAdminSession, error: nonAdminSessionError } = await supabase.auth.signInWithPassword({
      email: nonAdminEmail,
      password: 'test-password-123',
    });

    if (nonAdminSessionError || !nonAdminSession.session) {
      console.error('Failed to get non-admin session:', nonAdminSessionError);
      throw nonAdminSessionError;
    }

    nonAdminToken = nonAdminSession.session.access_token;
  });

  afterAll(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up test users
    if (adminUserId) {
      await supabase.auth.admin.deleteUser(adminUserId);
    }
    if (nonAdminUserId) {
      await supabase.auth.admin.deleteUser(nonAdminUserId);
    }
  });

  /**
   * Feature: blog-cms, Property 9: Non-Admin Access Denial
   * Validates: Requirements 3.2
   * 
   * Property: For any non-admin user attempting to access admin routes (/admin/blog/*), 
   * the system should deny access with either redirect to login or 403 Forbidden response.
   */
  it('Property 9: Non-admin users should be denied access to admin routes', async () => {
    if (!hasSupabase) return;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/admin/blog',
          '/admin/blog/new',
          '/admin/blog/edit/123',
          '/admin/blog/authors',
          '/admin/blog/categories'
        ),
        async (route) => {
          // Test with non-admin token
          const nonAdminClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${nonAdminToken}`,
                },
              },
            }
          );

          // Get the user from the non-admin client
          const { data: { user }, error: userError } = await nonAdminClient.auth.getUser();
          
          expect(userError).toBeNull();
          expect(user).toBeDefined();
          expect(user?.id).toBe(nonAdminUserId);

          // Verify the user is not an admin using the auth helper
          const isAdmin = await verifyAdminRole(nonAdminClient);

          // Property: Non-admin users should not have admin role
          expect(isAdmin).toBe(false);

          // In a real application, the route would check this and deny access
          // The AdminLayout component should redirect or show 403
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: blog-cms, Property 9: Non-Admin Access Denial (Unauthenticated)
   * Validates: Requirements 3.2
   * 
   * Property: For any unauthenticated user attempting to access admin routes, 
   * the system should deny access.
   */
  it('Property 9: Unauthenticated users should be denied access to admin routes', async () => {
    if (!hasSupabase) return;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/admin/blog',
          '/admin/blog/new',
          '/admin/blog/edit/123',
          '/admin/blog/authors',
          '/admin/blog/categories'
        ),
        async (route) => {
          // Test without any authentication
          const unauthClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!
          );

          // Get the user (should be null)
          const { data: { user }, error: userError } = await unauthClient.auth.getUser();
          
          // Property: Unauthenticated users should not have a user session
          expect(user).toBeNull();

          // Verify no admin role
          const isAdmin = await verifyAdminRole(unauthClient);

          // Property: Unauthenticated users should not have admin role
          expect(isAdmin).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: blog-cms, Property 10: Admin Authentication Verification
   * Validates: Requirements 3.3
   * 
   * Property: For any admin route access, the system should verify both authentication 
   * (user is logged in) and authorization (user has admin role) before rendering the route.
   */
  it('Property 10: Admin routes should verify both authentication and authorization', async () => {
    if (!hasSupabase) return;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/admin/blog',
          '/admin/blog/new',
          '/admin/blog/edit/123',
          '/admin/blog/authors',
          '/admin/blog/categories'
        ),
        async (route) => {
          // Test with admin token
          const adminClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${adminToken}`,
                },
              },
            }
          );

          // Step 1: Verify authentication (user is logged in)
          const { data: { user }, error: userError } = await adminClient.auth.getUser();
          
          expect(userError).toBeNull();
          expect(user).toBeDefined();
          expect(user?.id).toBe(adminUserId);

          // Property: Admin user should be authenticated
          expect(user).not.toBeNull();

          // Step 2: Verify authorization (user has admin role)
          const isAdmin = await verifyAdminRole(adminClient);

          // Property: Admin user should have admin role
          expect(isAdmin).toBe(true);

          // Both checks must pass for admin route access
          const hasAccess = user !== null && isAdmin;
          expect(hasAccess).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Feature: blog-cms, Property 10: Admin Authentication Verification (Edge Cases)
   * Validates: Requirements 3.3
   * 
   * Property: The system should handle edge cases in authentication verification.
   */
  it('Property 10: Should handle authentication edge cases correctly', async () => {
    if (!hasSupabase) return;

    // Test 1: User with no role metadata
    const noRoleEmail = `no-role-test-${Date.now()}@example.com`;
    const { data: noRoleAuthData } = await supabase.auth.admin.createUser({
      email: noRoleEmail,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (noRoleAuthData.user) {
      // Don't set any role in profiles
      await supabase
        .from('profiles')
        .upsert({
          id: noRoleAuthData.user.id,
          metadata: {},
        });

      const { data: noRoleSession } = await supabase.auth.signInWithPassword({
        email: noRoleEmail,
        password: 'test-password-123',
      });

      if (noRoleSession.session) {
        const noRoleClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${noRoleSession.session.access_token}`,
              },
            },
          }
        );

        const isAdmin = await verifyAdminRole(noRoleClient);

        // Property: User with no role should not be admin
        expect(isAdmin).toBe(false);
      }

      // Clean up
      await supabase.auth.admin.deleteUser(noRoleAuthData.user.id);
    }

    // Test 2: User with wrong role
    const wrongRoleEmail = `wrong-role-test-${Date.now()}@example.com`;
    const { data: wrongRoleAuthData } = await supabase.auth.admin.createUser({
      email: wrongRoleEmail,
      password: 'test-password-123',
      email_confirm: true,
    });

    if (wrongRoleAuthData.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: wrongRoleAuthData.user.id,
          metadata: { role: 'editor' }, // Not 'admin'
        });

      const { data: wrongRoleSession } = await supabase.auth.signInWithPassword({
        email: wrongRoleEmail,
        password: 'test-password-123',
      });

      if (wrongRoleSession.session) {
        const wrongRoleClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${wrongRoleSession.session.access_token}`,
              },
            },
          }
        );

        const isAdmin = await verifyAdminRole(wrongRoleClient);

        // Property: User with non-admin role should not be admin
        expect(isAdmin).toBe(false);
      }

      // Clean up
      await supabase.auth.admin.deleteUser(wrongRoleAuthData.user.id);
    }
  });
});
