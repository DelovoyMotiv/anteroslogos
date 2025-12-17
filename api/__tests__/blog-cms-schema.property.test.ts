/**
 * Property-Based Tests for Blog CMS Database Schema
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-cms-schema.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog CMS Schema - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog CMS schema tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create a test author for use in tests
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: 'test-author-property',
        name: 'Test Author',
        bio: 'Test bio for property tests',
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
        slug: 'test-category-property',
        name: 'Test Category',
        description: 'Test category for property tests',
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
    await supabase.from('blog_posts').delete().like('slug', 'test-post-prop-%');
    await supabase.from('blog_authors').delete().eq('id', testAuthorId);
    await supabase.from('blog_categories').delete().eq('id', testCategoryId);
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up any posts from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-post-prop-%');
  });

  describe('Property 1: Blog Post Data Round-Trip', () => {
    /**
     * Feature: blog-cms, Property 1: Blog Post Data Round-Trip
     * Validates: Requirements 1.2
     * 
     * For any blog post with complete metadata (title, content, excerpt, author, 
     * dates, SEO data, featured status), storing it in the database and then 
     * retrieving it should return identical data for all fields.
     */
    it('should preserve all blog post fields through insert and retrieve', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Custom arbitraries for blog post data
      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-post-prop-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      const titleArbitrary = fc.string({ minLength: 10, maxLength: 200 });
      const excerptArbitrary = fc.string({ minLength: 50, maxLength: 500 });
      const contentArbitrary = fc.string({ minLength: 100, maxLength: 5000 });
      const statusArbitrary = fc.constantFrom('draft', 'published', 'archived');
      const readTimeArbitrary = fc.integer({ min: 1, max: 60 });
      const metaDescriptionArbitrary = fc.option(fc.string({ minLength: 50, maxLength: 160 }), { nil: null });
      const metaKeywordsArbitrary = fc.option(
        fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        { nil: null }
      );
      const ogImageUrlArbitrary = fc.option(fc.webUrl(), { nil: null });
      const featuredArbitrary = fc.boolean();

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          titleArbitrary,
          excerptArbitrary,
          contentArbitrary,
          statusArbitrary,
          readTimeArbitrary,
          metaDescriptionArbitrary,
          metaKeywordsArbitrary,
          ogImageUrlArbitrary,
          featuredArbitrary,
          async (
            slug,
            title,
            excerpt,
            content,
            status,
            readTime,
            metaDescription,
            metaKeywords,
            ogImageUrl,
            featured
          ) => {
            // Prepare blog post data
            const blogPostData = {
              slug,
              title,
              excerpt,
              content,
              author_id: testAuthorId,
              category_id: testCategoryId,
              status,
              read_time: readTime,
              meta_description: metaDescription,
              meta_keywords: metaKeywords,
              og_image_url: ogImageUrl,
              featured,
              published_date: status === 'published' ? new Date().toISOString() : null,
            };

            // Insert the blog post
            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert(blogPostData)
              .select()
              .single();

            // Property: Insert should succeed
            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            if (!insertedPost) return;

            // Retrieve the blog post
            const { data: retrievedPost, error: retrieveError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('id', insertedPost.id)
              .single();

            // Property: Retrieve should succeed
            expect(retrieveError).toBeNull();
            expect(retrievedPost).toBeDefined();

            if (!retrievedPost) return;

            // Property: All fields should match exactly (excluding auto-generated fields)
            expect(retrievedPost.slug).toBe(slug);
            expect(retrievedPost.title).toBe(title);
            expect(retrievedPost.excerpt).toBe(excerpt);
            expect(retrievedPost.content).toBe(content);
            expect(retrievedPost.author_id).toBe(testAuthorId);
            expect(retrievedPost.category_id).toBe(testCategoryId);
            expect(retrievedPost.status).toBe(status);
            expect(retrievedPost.read_time).toBe(readTime);
            expect(retrievedPost.meta_description).toBe(metaDescription);
            expect(retrievedPost.featured).toBe(featured);
            expect(retrievedPost.og_image_url).toBe(ogImageUrl);

            // Handle array comparison for meta_keywords
            if (metaKeywords === null) {
              expect(retrievedPost.meta_keywords).toBeNull();
            } else {
              expect(retrievedPost.meta_keywords).toEqual(metaKeywords);
            }

            // Property: Auto-generated fields should be present
            expect(retrievedPost.id).toBeDefined();
            expect(retrievedPost.created_at).toBeDefined();
            expect(retrievedPost.updated_at).toBeDefined();
            expect(retrievedPost.modified_date).toBeDefined();

            // Property: Deleted_at should be null for new posts
            expect(retrievedPost.deleted_at).toBeNull();

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle posts with minimal required fields', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-post-prop-min-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 100, maxLength: 5000 }),
          fc.integer({ min: 1, max: 60 }),
          async (slug, title, excerpt, content, readTime) => {
            // Minimal blog post data (only required fields)
            const minimalPostData = {
              slug,
              title,
              excerpt,
              content,
              author_id: testAuthorId,
              read_time: readTime,
              status: 'draft',
            };

            // Insert the blog post
            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert(minimalPostData)
              .select()
              .single();

            // Property: Insert should succeed with minimal fields
            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            if (!insertedPost) return;

            // Retrieve the blog post
            const { data: retrievedPost, error: retrieveError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('id', insertedPost.id)
              .single();

            // Property: Retrieve should succeed
            expect(retrieveError).toBeNull();
            expect(retrievedPost).toBeDefined();

            if (!retrievedPost) return;

            // Property: Required fields should match
            expect(retrievedPost.slug).toBe(slug);
            expect(retrievedPost.title).toBe(title);
            expect(retrievedPost.excerpt).toBe(excerpt);
            expect(retrievedPost.content).toBe(content);
            expect(retrievedPost.author_id).toBe(testAuthorId);
            expect(retrievedPost.read_time).toBe(readTime);
            expect(retrievedPost.status).toBe('draft');

            // Property: Optional fields should have default values
            expect(retrievedPost.featured).toBe(false);
            expect(retrievedPost.category_id).toBeNull();
            expect(retrievedPost.meta_description).toBeNull();
            expect(retrievedPost.meta_keywords).toBeNull();
            expect(retrievedPost.og_image_url).toBeNull();
            expect(retrievedPost.published_date).toBeNull();
            expect(retrievedPost.deleted_at).toBeNull();

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve published_date when status is published', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-post-prop-pub-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 100, maxLength: 5000 }),
          fc.integer({ min: 1, max: 60 }),
          fc.date({ min: new Date('2020-01-01'), max: new Date() }),
          async (slug, title, excerpt, content, readTime, publishedDate) => {
            const publishedPostData = {
              slug,
              title,
              excerpt,
              content,
              author_id: testAuthorId,
              read_time: readTime,
              status: 'published',
              published_date: publishedDate.toISOString(),
            };

            // Insert the blog post
            const { data: insertedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert(publishedPostData)
              .select()
              .single();

            // Property: Insert should succeed
            expect(insertError).toBeNull();
            expect(insertedPost).toBeDefined();

            if (!insertedPost) return;

            // Retrieve the blog post
            const { data: retrievedPost, error: retrieveError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('id', insertedPost.id)
              .single();

            // Property: Retrieve should succeed
            expect(retrieveError).toBeNull();
            expect(retrievedPost).toBeDefined();

            if (!retrievedPost) return;

            // Property: Published date should be preserved
            expect(retrievedPost.status).toBe('published');
            expect(retrievedPost.published_date).toBeDefined();
            expect(new Date(retrievedPost.published_date!).getTime()).toBe(
              new Date(publishedDate).getTime()
            );

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', insertedPost.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
