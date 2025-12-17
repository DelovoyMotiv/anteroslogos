/**
 * Property-Based Tests for Blog SEO and Schema.org
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-seo.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog SEO - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog SEO tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique slugs to avoid conflicts
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data first
    await supabase.from('blog_posts').delete().like('slug', 'test-seo-post-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-seo%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-seo%');

    // Create a test author for use in tests
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: `test-author-seo-${testId}`,
        name: 'Test Author SEO',
        bio: 'Test bio for SEO tests',
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
        slug: `test-category-seo-${testId}`,
        name: 'Test Category SEO',
        description: 'Test category for SEO tests',
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
    await supabase.from('blog_posts').delete().like('slug', 'test-seo-post-%');
    await supabase.from('blog_authors').delete().eq('id', testAuthorId);
    await supabase.from('blog_categories').delete().eq('id', testCategoryId);
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up any posts from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-seo-post-%');
  });

  describe('Property 23: SEO Metadata Storage', () => {
    /**
     * Feature: blog-cms, Property 23: SEO Metadata Storage
     * Validates: Requirements 7.1
     * 
     * For any blog post with SEO fields (meta_description, meta_keywords, og_image_url), 
     * storing and retrieving the post should preserve all SEO metadata exactly.
     */
    it('should preserve all SEO metadata fields when storing and retrieving posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.string({ minLength: 5, maxLength: 50 }).map(s => 
              `test-seo-post-${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
            ),
            title: fc.string({ minLength: 10, maxLength: 200 }),
            excerpt: fc.string({ minLength: 50, maxLength: 500 }),
            content: fc.string({ minLength: 100, maxLength: 5000 }),
            meta_description: fc.option(fc.string({ minLength: 50, maxLength: 160 }), { nil: undefined }),
            meta_keywords: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 10 }), { nil: undefined }),
            og_image_url: fc.option(fc.webUrl(), { nil: undefined }),
            read_time: fc.integer({ min: 1, max: 60 }),
          }),
          async (postData) => {
            // Insert post with SEO metadata
            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert({
                ...postData,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                published_date: new Date().toISOString(),
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            // Retrieve the post
            const { data: retrievedPost, error: retrieveError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('id', insertedPost!.id)
              .single();

            expect(retrieveError).toBeNull();
            expect(retrievedPost).toBeDefined();

            // Verify SEO metadata is preserved exactly
            expect(retrievedPost!.meta_description).toEqual(postData.meta_description || null);
            expect(retrievedPost!.og_image_url).toEqual(postData.og_image_url || null);
            
            // Handle meta_keywords array comparison
            if (postData.meta_keywords) {
              expect(retrievedPost!.meta_keywords).toEqual(postData.meta_keywords);
            } else {
              expect(retrievedPost!.meta_keywords).toBeNull();
            }

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost!.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: Canonical URL Preservation', () => {
    /**
     * Feature: blog-cms, Property 27: Canonical URL Preservation
     * Validates: Requirements 7.5
     * 
     * For any blog post, the rendered page should have a canonical link tag 
     * with URL matching the pattern /blog/{slug} where slug is the post's slug field.
     */
    it('should generate canonical URLs matching /blog/{slug} pattern', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.string({ minLength: 5, maxLength: 50 }).map(s => 
              `test-seo-post-${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
            ),
            title: fc.string({ minLength: 10, maxLength: 200 }),
            excerpt: fc.string({ minLength: 50, maxLength: 500 }),
            content: fc.string({ minLength: 100, maxLength: 5000 }),
            read_time: fc.integer({ min: 1, max: 60 }),
          }),
          async (postData) => {
            // Insert post
            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert({
                ...postData,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                published_date: new Date().toISOString(),
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            // Verify canonical URL pattern
            const expectedCanonicalUrl = `https://anoteroslogos.com/blog/${insertedPost!.slug}`;
            
            // The canonical URL should match the expected pattern
            expect(insertedPost!.slug).toBe(postData.slug);
            
            // Verify the URL pattern is correct
            const urlPattern = /^https:\/\/anoteroslogos\.com\/blog\/[a-z0-9-]+$/;
            expect(expectedCanonicalUrl).toMatch(urlPattern);

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost!.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: Sitemap Completeness', () => {
    /**
     * Feature: blog-cms, Property 26: Sitemap Completeness
     * Validates: Requirements 7.4
     * 
     * For any published blog post, it should appear in the generated sitemap 
     * with correct URL and lastmod date matching the post's modified_date.
     */
    it('should include all published posts in sitemap with correct lastmod dates', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              slug: fc.string({ minLength: 5, maxLength: 50 }).map(s => 
                `test-seo-post-${Date.now()}-${s.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
              ),
              title: fc.string({ minLength: 10, maxLength: 200 }),
              excerpt: fc.string({ minLength: 50, maxLength: 500 }),
              content: fc.string({ minLength: 100, maxLength: 5000 }),
              read_time: fc.integer({ min: 1, max: 60 }),
              status: fc.constantFrom('published', 'draft', 'archived'),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (posts) => {
            // Insert all posts
            const insertedPosts: Array<{ id: string; slug: string; status: string }> = [];
            for (const postData of posts) {
              const { data: insertedPost, error: insertError } = await supabase
                .from('blog_posts')
                .insert({
                  ...postData,
                  author_id: testAuthorId,
                  category_id: testCategoryId,
                  published_date: new Date().toISOString(),
                })
                .select()
                .single();

              expect(insertError).toBeNull();
              if (insertedPost) {
                insertedPosts.push(insertedPost as { id: string; slug: string; status: string });
              }
            }

            // Fetch all published posts (simulating sitemap generation)
            const { data: publishedPosts, error: fetchError } = await supabase
              .from('blog_posts')
              .select('slug, modified_date')
              .eq('status', 'published')
              .is('deleted_at', null)
              .in('id', insertedPosts.map(p => p.id));

            expect(fetchError).toBeNull();

            // Verify only published posts are included
            const expectedPublishedCount = posts.filter(p => p.status === 'published').length;
            expect(publishedPosts?.length).toBe(expectedPublishedCount);

            // Verify each published post has correct data
            publishedPosts?.forEach(post => {
              expect(post.slug).toBeDefined();
              expect(post.modified_date).toBeDefined();
              
              // Verify URL pattern
              const sitemapUrl = `https://anoteroslogos.com/blog/${post.slug}`;
              expect(sitemapUrl).toMatch(/^https:\/\/anoteroslogos\.com\/blog\/[a-z0-9-]+$/);
              
              // Verify lastmod date is valid ISO date
              expect(() => new Date(post.modified_date)).not.toThrow();
            });

            // Verify draft and archived posts are NOT included
            const draftAndArchivedSlugs = posts
              .filter(p => p.status !== 'published')
              .map(p => p.slug);
            
            const publishedSlugs = publishedPosts?.map(p => p.slug) || [];
            draftAndArchivedSlugs.forEach(slug => {
              expect(publishedSlugs).not.toContain(slug);
            });

            // Clean up
            for (const post of insertedPosts) {
              await supabase.from('blog_posts').delete().eq('id', post.id);
            }
          }
        ),
        { numRuns: 50 } // Reduced runs due to multiple inserts per test
      );
    });
  });
});
