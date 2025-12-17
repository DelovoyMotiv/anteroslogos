/**
 * Property-Based Tests for Blog Admin UI Components
 * Feature: blog-cms
 * 
 * Tests for draft visibility and admin access control
 * 
 * @module api/__tests__/blog-admin-ui.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog Admin UI - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Admin UI tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique slug to avoid conflicts
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data first
    await supabase.from('blog_posts').delete().like('slug', 'test-draft-visibility-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-admin-ui%');

    // Create a test author for use in tests
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: `test-author-admin-ui-${testId}`,
        name: 'Test Author Admin UI',
        bio: 'Test bio for admin UI tests',
      })
      .select()
      .single();

    if (authorError) {
      console.error('Failed to create test author:', authorError);
      throw authorError;
    }

    testAuthorId = author.id;
  });

  afterAll(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up test data
    await supabase.from('blog_posts').delete().like('slug', 'test-draft-visibility-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-admin-ui%');
  });

  /**
   * Feature: blog-cms, Property 35: Draft Post Visibility
   * Validates: Requirements 9.2
   * 
   * Property: For any blog post with status 'draft', it should not appear in 
   * public API responses (GET /api/blog/posts) or public blog listing pages.
   */
  it('Property 35: Draft posts should not appear in public API responses', async () => {
    if (!hasSupabase) return;

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          excerpt: fc.string({ minLength: 20, maxLength: 200 }),
          content: fc.string({ minLength: 100, maxLength: 1000 }),
          readTime: fc.integer({ min: 1, max: 30 }),
        }),
        async (postData) => {
          // Create a draft post
          const slug = `test-draft-visibility-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          const { data: draftPost, error: insertError } = await supabase
            .from('blog_posts')
            .insert({
              slug,
              title: postData.title,
              excerpt: postData.excerpt,
              content: postData.content,
              author_id: testAuthorId,
              status: 'draft',
              read_time: postData.readTime,
              featured: false,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to create draft post: ${insertError.message}`);
          }

          try {
            // Query public API (simulating public access with RLS)
            // Create a new client without service role key to simulate public access
            const publicSupabase = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_ANON_KEY!
            );

            const { data: publicPosts, error: queryError } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug);

            // Draft posts should not be visible to public
            expect(queryError).toBeNull();
            expect(publicPosts).toBeDefined();
            expect(publicPosts?.length).toBe(0);

            // Verify the post exists when queried with service role (admin access)
            const { data: adminPosts, error: adminError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug);

            expect(adminError).toBeNull();
            expect(adminPosts).toBeDefined();
            expect(adminPosts?.length).toBe(1);
            expect(adminPosts?.[0].status).toBe('draft');
          } finally {
            // Clean up
            await supabase
              .from('blog_posts')
              .delete()
              .eq('id', draftPost.id);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Feature: blog-cms, Property 36: Admin View All Posts
   * Validates: Requirements 9.3
   * 
   * Property: For any admin user querying posts through admin API, the response 
   * should include posts of all statuses (draft, published, archived), not just published.
   */
  it('Property 36: Admin should be able to view posts of all statuses', async () => {
    if (!hasSupabase) return;

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          excerpt: fc.string({ minLength: 20, maxLength: 200 }),
          content: fc.string({ minLength: 100, maxLength: 1000 }),
          readTime: fc.integer({ min: 1, max: 30 }),
          status: fc.constantFrom('draft', 'published', 'archived'),
        }),
        async (postData) => {
          // Create a post with the given status
          const slug = `test-admin-view-${postData.status}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          const { data: post, error: insertError } = await supabase
            .from('blog_posts')
            .insert({
              slug,
              title: postData.title,
              excerpt: postData.excerpt,
              content: postData.content,
              author_id: testAuthorId,
              status: postData.status,
              read_time: postData.readTime,
              featured: false,
              published_date: postData.status === 'published' ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to create post: ${insertError.message}`);
          }

          try {
            // Query with admin access (service role)
            const { data: adminPosts, error: adminError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug);

            // Admin should be able to see posts of all statuses
            expect(adminError).toBeNull();
            expect(adminPosts).toBeDefined();
            expect(adminPosts?.length).toBe(1);
            expect(adminPosts?.[0].status).toBe(postData.status);
            expect(adminPosts?.[0].slug).toBe(slug);

            // Verify public access behavior
            const publicSupabase = createClient(
              process.env.SUPABASE_URL!,
              process.env.SUPABASE_ANON_KEY!
            );

            const { data: publicPosts } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug);

            // Public should only see published posts
            if (postData.status === 'published') {
              expect(publicPosts?.length).toBe(1);
            } else {
              expect(publicPosts?.length).toBe(0);
            }
          } finally {
            // Clean up
            await supabase
              .from('blog_posts')
              .delete()
              .eq('id', post.id);
          }
        }
      ),
      { numRuns: 15 }
    );
  });
});
