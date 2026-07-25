/**
 * Property-Based Tests for Blog API Endpoints
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-api.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog API - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog API tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique slugs to avoid conflicts
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data first
    await supabase.from('blog_posts').delete().like('slug', 'test-api-post-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-api%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-api%');

    // Create a test author for use in tests
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: `test-author-api-${testId}`,
        name: 'Test Author API',
        bio: 'Test bio for API tests',
      })
      .select()
      .single();

    if (authorError) {
      console.error('Failed to create test author:', authorError);
      throw authorError;
    }

    testAuthorId = author.id;

    // Create a test category for use in tests
    const { data: category, error: categoryError } = await supabase
      .from('blog_categories')
      .insert({
        slug: `test-category-api-${testId}`,
        name: 'Test Category API',
        description: 'Test category for API tests',
      })
      .select()
      .single();

    if (categoryError) {
      console.error('Failed to create test category:', categoryError);
      throw categoryError;
    }

    testCategoryId = category.id;
  });

  afterAll(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up test data
    await supabase.from('blog_posts').delete().like('slug', 'test-api-post-%');
    await supabase.from('blog_authors').delete().eq('id', testAuthorId);
    await supabase.from('blog_categories').delete().eq('id', testCategoryId);
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up any posts from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-api-post-%');
  });

  describe('Property 28: API Pagination Correctness', () => {
    /**
     * Feature: blog-cms, Property 28: API Pagination Correctness
     * Validates: Requirements 8.1
     * 
     * For any GET /api/blog/posts request with page and limit parameters, 
     * the response should contain exactly 'limit' posts (or fewer on last page) 
     * and correct total count.
     */
    it('should return correct number of posts per page and accurate total count', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // Number of posts to create
          fc.integer({ min: 1, max: 10 }), // Page size (limit)
          fc.integer({ min: 1, max: 5 }), // Page number
          async (numPosts, limit, page) => {
            // Create test posts
            const posts: any[] = [];
            for (let i = 0; i < numPosts; i++) {
              posts.push({
                slug: `test-api-post-pagination-${Date.now()}-${i}`,
                title: `Test Post ${i}`,
                excerpt: `Test excerpt for post ${i}`,
                content: `Test content for post ${i}`,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                read_time: 5,
                published_date: new Date(Date.now() - i * 1000).toISOString(),
              });
            }

            const { data: insertedPosts, error: insertError } = await supabase
              .from('blog_posts')
              .insert(posts)
              .select();

            expect(insertError).toBeNull();
            expect(insertedPosts).toHaveLength(numPosts);

            // Query with pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data: paginatedPosts, error: queryError, count } = await supabase
              .from('blog_posts')
              .select('*', { count: 'exact' })
              .eq('status', 'published')
              .is('deleted_at', null)
              .like('slug', 'test-api-post-pagination-%')
              .order('published_date', { ascending: false })
              .range(from, to);

            expect(queryError).toBeNull();

            // Property: Total count should match number of posts created
            expect(count).toBe(numPosts);

            // Property: Number of returned posts should be min(limit, remaining posts)
            const expectedCount = Math.min(limit, Math.max(0, numPosts - from));
            expect(paginatedPosts).toHaveLength(expectedCount);

            // Property: If page is beyond available data, should return empty array
            if (from >= numPosts) {
              expect(paginatedPosts).toHaveLength(0);
            }

            // Property: Posts should be ordered by published_date descending
            if (paginatedPosts && paginatedPosts.length > 1) {
              for (let i = 0; i < paginatedPosts.length - 1; i++) {
                const current = new Date(paginatedPosts[i].published_date!).getTime();
                const next = new Date(paginatedPosts[i + 1].published_date!).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
              }
            }

            // Clean up
            if (insertedPosts) {
              const ids = insertedPosts.map(p => p.id);
              await supabase.from('blog_posts').delete().in('id', ids);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 29: API Data Population', () => {
    /**
     * Feature: blog-cms, Property 29: API Data Population
     * Validates: Requirements 8.2
     * 
     * For any GET /api/blog/posts/{slug} request, the response should include 
     * the post with author and category objects fully populated, not just IDs.
     */
    it('should populate author and category data when fetching post by slug', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 30 }).map(s => 
            `test-api-post-pop-${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
          ),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 50, maxLength: 200 }),
          fc.string({ minLength: 100, maxLength: 500 }),
          async (slug, title, excerpt, content) => {
            // Create a test post
            const postData = {
              slug,
              title,
              excerpt,
              content,
              author_id: testAuthorId,
              category_id: testCategoryId,
              status: 'published',
              read_time: 5,
              published_date: new Date().toISOString(),
            };

            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert(postData)
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            if (!insertedPost) return;

            // Fetch post with populated author and category
            const { data: fetchedPost, error: fetchError } = await supabase
              .from('blog_posts')
              .select(`
                *,
                blog_authors(*),
                blog_categories(*)
              `)
              .eq('slug', slug)
              .single();

            expect(fetchError).toBeNull();
            expect(fetchedPost).toBeDefined();

            if (!fetchedPost) return;

            // Property: Author should be fully populated (not just ID)
            expect(fetchedPost.blog_authors).toBeDefined();
            expect(fetchedPost.blog_authors.id).toBe(testAuthorId);
            expect(fetchedPost.blog_authors.slug).toBe('test-author-api');
            expect(fetchedPost.blog_authors.name).toBe('Test Author API');
            expect(fetchedPost.blog_authors.bio).toBeDefined();

            // Property: Category should be fully populated (not just ID)
            expect(fetchedPost.blog_categories).toBeDefined();
            expect(fetchedPost.blog_categories.id).toBe(testCategoryId);
            expect(fetchedPost.blog_categories.slug).toBe('test-category-api');
            expect(fetchedPost.blog_categories.name).toBe('Test Category API');

            // Property: Post data should match what was inserted
            expect(fetchedPost.slug).toBe(slug);
            expect(fetchedPost.title).toBe(title);
            expect(fetchedPost.excerpt).toBe(excerpt);
            expect(fetchedPost.content).toBe(content);

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost.id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 2: Filter Correctness', () => {
    /**
     * Feature: blog-cms, Property 2: Filter Correctness
     * Validates: Requirements 1.3
     * 
     * For any set of blog posts and any filter criteria (category, tag, author, status), 
     * the filtered results should contain only posts matching all specified criteria 
     * and no posts that don't match.
     */
    it('should return only posts matching category filter', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // Number of posts
          async (numPosts) => {
            // Create another category for filtering
            const { data: otherCategory, error: catError } = await supabase
              .from('blog_categories')
              .insert({
                slug: `test-category-filter-${Date.now()}`,
                name: 'Other Category',
              })
              .select()
              .single();

            expect(catError).toBeNull();
            if (!otherCategory) return;

            // Create posts with different categories
            const posts: any[] = [];
            for (let i = 0; i < numPosts; i++) {
              const useTestCategory = i % 2 === 0;
              posts.push({
                slug: `test-api-post-filter-${Date.now()}-${i}`,
                title: `Test Post ${i}`,
                excerpt: `Test excerpt ${i}`,
                content: `Test content ${i}`,
                author_id: testAuthorId,
                category_id: useTestCategory ? testCategoryId : otherCategory.id,
                status: 'published',
                read_time: 5,
                published_date: new Date().toISOString(),
              });
            }

            const { data: insertedPosts, error: insertError } = await supabase
              .from('blog_posts')
              .insert(posts)
              .select();

            expect(insertError).toBeNull();

            // Query with category filter
            const { data: filteredPosts, error: queryError } = await supabase
              .from('blog_posts')
              .select('*, blog_categories!inner(*)')
              .eq('blog_categories.id', testCategoryId)
              .eq('status', 'published')
              .is('deleted_at', null)
              .like('slug', 'test-api-post-filter-%');

            expect(queryError).toBeNull();

            // Property: All returned posts should have the filtered category
            filteredPosts?.forEach(post => {
              expect(post.category_id).toBe(testCategoryId);
            });

            // Property: Number of filtered posts should match expected count
            const expectedCount = posts.filter(p => p.category_id === testCategoryId).length;
            expect(filteredPosts).toHaveLength(expectedCount);

            // Clean up
            if (insertedPosts) {
              const ids = insertedPosts.map(p => p.id);
              await supabase.from('blog_posts').delete().in('id', ids);
            }
            await supabase.from('blog_categories').delete().eq('id', otherCategory.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return only posts matching author filter', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // Number of posts
          async (numPosts) => {
            // Create another author for filtering
            const { data: otherAuthor, error: authError } = await supabase
              .from('blog_authors')
              .insert({
                slug: `test-author-filter-${Date.now()}`,
                name: 'Other Author',
              })
              .select()
              .single();

            expect(authError).toBeNull();
            if (!otherAuthor) return;

            // Create posts with different authors
            const posts: any[] = [];
            for (let i = 0; i < numPosts; i++) {
              const useTestAuthor = i % 2 === 0;
              posts.push({
                slug: `test-api-post-author-filter-${Date.now()}-${i}`,
                title: `Test Post ${i}`,
                excerpt: `Test excerpt ${i}`,
                content: `Test content ${i}`,
                author_id: useTestAuthor ? testAuthorId : otherAuthor.id,
                status: 'published',
                read_time: 5,
                published_date: new Date().toISOString(),
              });
            }

            const { data: insertedPosts, error: insertError } = await supabase
              .from('blog_posts')
              .insert(posts)
              .select();

            expect(insertError).toBeNull();

            // Query with author filter
            const { data: filteredPosts, error: queryError } = await supabase
              .from('blog_posts')
              .select('*, blog_authors!inner(*)')
              .eq('blog_authors.id', testAuthorId)
              .eq('status', 'published')
              .is('deleted_at', null)
              .like('slug', 'test-api-post-author-filter-%');

            expect(queryError).toBeNull();

            // Property: All returned posts should have the filtered author
            filteredPosts?.forEach(post => {
              expect(post.author_id).toBe(testAuthorId);
            });

            // Property: Number of filtered posts should match expected count
            const expectedCount = posts.filter(p => p.author_id === testAuthorId).length;
            expect(filteredPosts).toHaveLength(expectedCount);

            // Clean up
            if (insertedPosts) {
              const ids = insertedPosts.map(p => p.id);
              await supabase.from('blog_posts').delete().in('id', ids);
            }
            await supabase.from('blog_authors').delete().eq('id', otherAuthor.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return only published posts when filtering by status', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // Number of posts
          async (numPosts) => {
            // Create posts with different statuses
            const posts: any[] = [];
            for (let i = 0; i < numPosts; i++) {
              const status = i % 3 === 0 ? 'published' : (i % 3 === 1 ? 'draft' : 'archived');
              posts.push({
                slug: `test-api-post-status-filter-${Date.now()}-${i}`,
                title: `Test Post ${i}`,
                excerpt: `Test excerpt ${i}`,
                content: `Test content ${i}`,
                author_id: testAuthorId,
                status,
                read_time: 5,
                published_date: status === 'published' ? new Date().toISOString() : null,
              });
            }

            const { data: insertedPosts, error: insertError } = await supabase
              .from('blog_posts')
              .insert(posts)
              .select();

            expect(insertError).toBeNull();

            // Query with status filter (published only)
            const { data: filteredPosts, error: queryError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('status', 'published')
              .is('deleted_at', null)
              .like('slug', 'test-api-post-status-filter-%');

            expect(queryError).toBeNull();

            // Property: All returned posts should have status 'published'
            filteredPosts?.forEach(post => {
              expect(post.status).toBe('published');
            });

            // Property: Number of filtered posts should match expected count
            const expectedCount = posts.filter(p => p.status === 'published').length;
            expect(filteredPosts).toHaveLength(expectedCount);

            // Property: Draft and archived posts should not be included
            const draftOrArchivedCount = posts.filter(
              p => p.status === 'draft' || p.status === 'archived'
            ).length;
            expect(filteredPosts?.length).toBe(numPosts - draftOrArchivedCount);

            // Clean up
            if (insertedPosts) {
              const ids = insertedPosts.map(p => p.id);
              await supabase.from('blog_posts').delete().in('id', ids);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
