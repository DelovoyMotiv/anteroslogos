/**
 * Property-Based Tests for Blog CMS RLS Policy Enforcement
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-rls-policy.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';
import {
  publishedBlogPostGenerator,
  draftBlogPostGenerator,
  archivedBlogPostGenerator,
  blogAuthorGenerator,
  blogCategoryGenerator,
  uniqueSlugGenerator,
} from './blog-generators';
import {
  createTestAuthor,
  createTestCategory,
  cleanupTestData,
  generateTestId,
} from './blog-test-utils';

describe('Blog CMS - RLS Policy Enforcement', () => {
  let adminSupabase: SupabaseClient;
  let publicSupabase: SupabaseClient;
  let testAuthorId: string;
  let testCategoryId: string;
  const testId = generateTestId();

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping RLS Policy tests - Supabase not configured');
      return;
    }

    // Admin client (service role key bypasses RLS)
    adminSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Public client (anon key enforces RLS)
    publicSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Create test author
    testAuthorId = await createTestAuthor(adminSupabase, {
      slug: `test-author-rls-${testId}`,
      name: 'Test Author RLS',
      bio: 'Test bio for RLS tests',
    });

    // Create test category
    testCategoryId = await createTestCategory(adminSupabase, {
      slug: `test-category-rls-${testId}`,
      name: 'Test Category RLS',
      description: 'Test category for RLS tests',
    });
  });

  afterAll(async () => {
    if (!hasSupabase || !adminSupabase) return;

    // Clean up test data
    await cleanupTestData(adminSupabase, {
      postSlugPattern: `test-rls-post-${testId}%`,
      authorSlugPattern: `test-author-rls-${testId}%`,
      categorySlugPattern: `test-category-rls-${testId}%`,
    });
  });

  beforeEach(async () => {
    if (!hasSupabase || !adminSupabase) return;

    // Clean up any posts from previous test runs
    await cleanupTestData(adminSupabase, {
      postSlugPattern: `test-rls-post-${testId}%`,
    });
  });

  describe('Property 4: RLS Policy Enforcement', () => {
    /**
     * Feature: blog-cms, Property 4: RLS Policy Enforcement
     * Validates: Requirements 1.5
     * 
     * For any database operation, public users should be able to read published posts 
     * but not write, while admin users should be able to both read and write all posts.
     */

    it('should allow public users to read published posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          publishedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-pub`),
          async (postData, slug) => {
            // Admin creates a published post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            // Property: Public user should be able to read published post
            const { data: publicPost, error: publicError } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('id', createdPost.id)
              .single();

            expect(publicError).toBeNull();
            expect(publicPost).toBeDefined();
            expect(publicPost?.id).toBe(createdPost.id);
            expect(publicPost?.slug).toBe(slug);
            expect(publicPost?.status).toBe('published');

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from reading draft posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          draftBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-draft`),
          async (postData, slug) => {
            // Admin creates a draft post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            // Property: Public user should NOT be able to read draft post
            const { data: publicPost, error: publicError } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('id', createdPost.id)
              .single();

            // Should either return error or null data (RLS blocks access)
            expect(publicPost).toBeNull();

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from reading archived posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          archivedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-arch`),
          async (postData, slug) => {
            // Admin creates an archived post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            // Property: Public user should NOT be able to read archived post
            const { data: publicPost, error: publicError } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('id', createdPost.id)
              .single();

            // Should either return error or null data (RLS blocks access)
            expect(publicPost).toBeNull();

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from reading soft-deleted posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          publishedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-del`),
          async (postData, slug) => {
            // Admin creates a published post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            // Admin soft-deletes the post
            const { error: deleteError } = await adminSupabase
              .from('blog_posts')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', createdPost.id);

            expect(deleteError).toBeNull();

            // Property: Public user should NOT be able to read soft-deleted post
            const { data: publicPost, error: publicError } = await publicSupabase
              .from('blog_posts')
              .select('*')
              .eq('id', createdPost.id)
              .single();

            // Should either return error or null data (RLS blocks access)
            expect(publicPost).toBeNull();

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from creating posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          publishedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-create`),
          async (postData, slug) => {
            // Property: Public user should NOT be able to create a post
            const { data: createdPost, error: createError } = await publicSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            // Should return error (RLS blocks write)
            expect(createError).not.toBeNull();
            expect(createdPost).toBeNull();

            // Verify post was not created
            const { data: checkPost } = await adminSupabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug)
              .single();

            expect(checkPost).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from updating posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          publishedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-update`),
          fc.string({ minLength: 10, maxLength: 200 }),
          async (postData, slug, newTitle) => {
            // Admin creates a published post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            const originalTitle = createdPost.title;

            // Property: Public user should NOT be able to update the post
            const { error: updateError } = await publicSupabase
              .from('blog_posts')
              .update({ title: newTitle })
              .eq('id', createdPost.id);

            // Should return error (RLS blocks write)
            expect(updateError).not.toBeNull();

            // Verify post was not updated
            const { data: checkPost } = await adminSupabase
              .from('blog_posts')
              .select('title')
              .eq('id', createdPost.id)
              .single();

            expect(checkPost?.title).toBe(originalTitle);
            expect(checkPost?.title).not.toBe(newTitle);

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from deleting posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          publishedBlogPostGenerator(testAuthorId, testCategoryId),
          uniqueSlugGenerator(`test-rls-post-${testId}-delete`),
          async (postData, slug) => {
            // Admin creates a published post
            const { data: createdPost, error: createError } = await adminSupabase
              .from('blog_posts')
              .insert({ ...postData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdPost).toBeDefined();

            if (!createdPost) return;

            // Property: Public user should NOT be able to delete the post
            const { error: deleteError } = await publicSupabase
              .from('blog_posts')
              .delete()
              .eq('id', createdPost.id);

            // Should return error (RLS blocks write)
            expect(deleteError).not.toBeNull();

            // Verify post still exists
            const { data: checkPost } = await adminSupabase
              .from('blog_posts')
              .select('*')
              .eq('id', createdPost.id)
              .single();

            expect(checkPost).not.toBeNull();
            expect(checkPost?.id).toBe(createdPost.id);

            // Clean up
            await adminSupabase.from('blog_posts').delete().eq('id', createdPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow public users to read authors', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          blogAuthorGenerator,
          uniqueSlugGenerator(`test-rls-author-${testId}`),
          async (authorData, slug) => {
            // Admin creates an author
            const { data: createdAuthor, error: createError } = await adminSupabase
              .from('blog_authors')
              .insert({ ...authorData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdAuthor).toBeDefined();

            if (!createdAuthor) return;

            // Property: Public user should be able to read author
            const { data: publicAuthor, error: publicError } = await publicSupabase
              .from('blog_authors')
              .select('*')
              .eq('id', createdAuthor.id)
              .single();

            expect(publicError).toBeNull();
            expect(publicAuthor).toBeDefined();
            expect(publicAuthor?.id).toBe(createdAuthor.id);

            // Clean up
            await adminSupabase.from('blog_authors').delete().eq('id', createdAuthor.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from creating authors', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          blogAuthorGenerator,
          uniqueSlugGenerator(`test-rls-author-${testId}-create`),
          async (authorData, slug) => {
            // Property: Public user should NOT be able to create an author
            const { data: createdAuthor, error: createError } = await publicSupabase
              .from('blog_authors')
              .insert({ ...authorData, slug })
              .select()
              .single();

            // Should return error (RLS blocks write)
            expect(createError).not.toBeNull();
            expect(createdAuthor).toBeNull();

            // Verify author was not created
            const { data: checkAuthor } = await adminSupabase
              .from('blog_authors')
              .select('*')
              .eq('slug', slug)
              .single();

            expect(checkAuthor).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow public users to read categories', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          blogCategoryGenerator,
          uniqueSlugGenerator(`test-rls-category-${testId}`),
          async (categoryData, slug) => {
            // Admin creates a category
            const { data: createdCategory, error: createError } = await adminSupabase
              .from('blog_categories')
              .insert({ ...categoryData, slug })
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdCategory).toBeDefined();

            if (!createdCategory) return;

            // Property: Public user should be able to read category
            const { data: publicCategory, error: publicError } = await publicSupabase
              .from('blog_categories')
              .select('*')
              .eq('id', createdCategory.id)
              .single();

            expect(publicError).toBeNull();
            expect(publicCategory).toBeDefined();
            expect(publicCategory?.id).toBe(createdCategory.id);

            // Clean up
            await adminSupabase.from('blog_categories').delete().eq('id', createdCategory.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent public users from creating categories', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          blogCategoryGenerator,
          uniqueSlugGenerator(`test-rls-category-${testId}-create`),
          async (categoryData, slug) => {
            // Property: Public user should NOT be able to create a category
            const { data: createdCategory, error: createError } = await publicSupabase
              .from('blog_categories')
              .insert({ ...categoryData, slug })
              .select()
              .single();

            // Should return error (RLS blocks write)
            expect(createError).not.toBeNull();
            expect(createdCategory).toBeNull();

            // Verify category was not created
            const { data: checkCategory } = await adminSupabase
              .from('blog_categories')
              .select('*')
              .eq('slug', slug)
              .single();

            expect(checkCategory).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
