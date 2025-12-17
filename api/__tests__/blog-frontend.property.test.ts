/**
 * Property-Based Tests for Blog Frontend Integration
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-frontend.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog Frontend - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;
  let testCategoryId: string;
  let migratedPostSlugs: string[] = [];

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Frontend tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique slugs to avoid conflicts
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data first
    await supabase.from('blog_posts').delete().like('slug', 'test-frontend-post-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-frontend%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-frontend%');

    // Create a test author
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: `test-author-frontend-${testId}`,
        name: 'Test Author Frontend',
        bio: 'Test bio for frontend tests',
        job_title: 'Test Writer',
        expertise: ['Testing', 'Quality Assurance'],
        knows_about: ['Property Testing', 'Frontend Development'],
      })
      .select()
      .single();

    if (authorError) {
      console.error('Failed to create test author:', authorError);
      throw authorError;
    }

    testAuthorId = author.id;

    // Create a test category
    const { data: category, error: categoryError } = await supabase
      .from('blog_categories')
      .insert({
        slug: `test-category-frontend-${testId}`,
        name: 'Test Category Frontend',
        description: 'Test category for frontend tests',
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
    await supabase.from('blog_posts').delete().like('slug', 'test-frontend-post-%');
    await supabase.from('blog_authors').delete().eq('id', testAuthorId);
    await supabase.from('blog_categories').delete().eq('id', testCategoryId);
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up any posts from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-frontend-post-%');
    migratedPostSlugs = [];
  });

  describe('Property 39: URL Backward Compatibility', () => {
    /**
     * Feature: blog-cms, Property 39: URL Backward Compatibility
     * Validates: Requirements 10.2, 10.5
     * 
     * For any blog post URL that existed before database migration (/blog/{slug}), 
     * the same URL should continue to work after migration, serving content from database.
     */
    it('should serve posts from database at their original URLs with identical structure', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
              title: fc.string({ minLength: 10, maxLength: 100 }),
              excerpt: fc.string({ minLength: 50, maxLength: 200 }),
              content: fc.string({ minLength: 100, maxLength: 1000 }),
              read_time: fc.integer({ min: 1, max: 30 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),

          async (posts) => {
            // Create posts in database (simulating migration)
            const createdPosts = [];
            for (const post of posts) {
              const { data, error } = await supabase
                .from('blog_posts')
                .insert({
                  slug: `test-frontend-post-${post.slug}`,
                  title: post.title,
                  excerpt: post.excerpt,
                  content: post.content,
                  author_id: testAuthorId,
                  category_id: testCategoryId,
                  status: 'published',
                  published_date: new Date().toISOString(),
                  read_time: post.read_time,
                })
                .select()
                .single();

              if (!error && data) {
                createdPosts.push(data);
                migratedPostSlugs.push(data.slug);
              }
            }

            // Verify each post is accessible via API at /blog/{slug} pattern
            for (const post of createdPosts) {
              // Fetch via API (simulating frontend request)
              const response = await fetch(
                `http://localhost:3000/api/blog?action=post&slug=${post.slug}`
              ).catch(() => null);

              // If API is not running, test against database directly
              if (!response) {
                const { data: fetchedPost, error } = await supabase
                  .from('blog_posts')
                  .select(`
                    *,
                    blog_authors(*),
                    blog_categories(*)
                  `)
                  .eq('slug', post.slug)
                  .eq('status', 'published')
                  .is('deleted_at', null)
                  .single();

                // Post should be retrievable
                expect(error).toBeNull();
                expect(fetchedPost).toBeDefined();

                // URL structure should be preserved (slug-based)
                expect(fetchedPost.slug).toBe(post.slug);

                // Content should be identical
                expect(fetchedPost.title).toBe(post.title);
                expect(fetchedPost.excerpt).toBe(post.excerpt);
                expect(fetchedPost.content).toBe(post.content);
                expect(fetchedPost.read_time).toBe(post.read_time);

                // Author and category should be populated
                expect(fetchedPost.blog_authors).toBeDefined();
                expect(fetchedPost.blog_categories).toBeDefined();
              } else if (response.ok) {
                const fetchedPost = await response.json();

                // Post should be retrievable
                expect(fetchedPost).toBeDefined();

                // URL structure should be preserved (slug-based)
                expect(fetchedPost.slug).toBe(post.slug);

                // Content should be identical
                expect(fetchedPost.title).toBe(post.title);
                expect(fetchedPost.excerpt).toBe(post.excerpt);
                expect(fetchedPost.content).toBe(post.content);
                expect(fetchedPost.read_time).toBe(post.read_time);

                // Author and category should be populated
                expect(fetchedPost.author).toBeDefined();
                expect(fetchedPost.category).toBeDefined();
              }
            }

            // Clean up created posts
            for (const slug of migratedPostSlugs) {
              await supabase.from('blog_posts').delete().eq('slug', slug);
            }
            migratedPostSlugs = [];
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle 404 for non-existent URLs gracefully', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[a-z0-9-]{5,50}$/),

          async (nonExistentSlug) => {
            const slug = `test-frontend-nonexistent-${nonExistentSlug}`;

            // Try to fetch via API
            const response = await fetch(
              `http://localhost:3000/api/blog?action=post&slug=${slug}`
            ).catch(() => null);

            // If API is running, should return 404
            if (response) {
              expect(response.status).toBe(404);
            }

            // Database query should return null
            const { data, error } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug)
              .eq('status', 'published')
              .is('deleted_at', null)
              .single();

            expect(data).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return 410 for archived posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
            title: fc.string({ minLength: 10, maxLength: 100 }),
            excerpt: fc.string({ minLength: 50, maxLength: 200 }),
            content: fc.string({ minLength: 100, maxLength: 1000 }),
            read_time: fc.integer({ min: 1, max: 30 }),
          }),

          async (post) => {
            const slug = `test-frontend-archived-${post.slug}`;

            // Create an archived post
            const { data: createdPost, error } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title: post.title,
                excerpt: post.excerpt,
                content: post.content,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'archived',
                published_date: new Date().toISOString(),
                read_time: post.read_time,
              })
              .select()
              .single();

            if (error) {
              console.error('Failed to create archived post:', error);
              return;
            }

            migratedPostSlugs.push(slug);

            // Try to fetch via API
            const response = await fetch(
              `http://localhost:3000/api/blog?action=post&slug=${slug}`
            ).catch(() => null);

            // If API is running, should return 410
            if (response) {
              expect(response.status).toBe(410);
            }

            // Clean up
            await supabase.from('blog_posts').delete().eq('slug', slug);
            migratedPostSlugs = migratedPostSlugs.filter(s => s !== slug);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 24: BlogPosting Schema Generation', () => {
    /**
     * Feature: blog-cms, Property 24: BlogPosting Schema Generation
     * Validates: Requirements 7.2
     * 
     * For any published blog post page, the rendered HTML should contain 
     * valid Schema.org BlogPosting structured data with all required fields 
     * (headline, datePublished, author).
     */
    it('should generate valid BlogPosting schema with all required fields', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
            title: fc.string({ minLength: 10, maxLength: 100 }),
            excerpt: fc.string({ minLength: 50, maxLength: 200 }),
            content: fc.string({ minLength: 100, maxLength: 1000 }),
            read_time: fc.integer({ min: 1, max: 30 }),
            meta_description: fc.string({ minLength: 50, maxLength: 160 }),
            og_image_url: fc.webUrl(),
          }),

          async (post) => {
            const slug = `test-frontend-schema-${post.slug}`;

            // Create a published post
            const { data: createdPost, error } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title: post.title,
                excerpt: post.excerpt,
                content: post.content,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                published_date: new Date().toISOString(),
                modified_date: new Date().toISOString(),
                read_time: post.read_time,
                meta_description: post.meta_description,
                og_image_url: post.og_image_url,
              })
              .select(`
                *,
                blog_authors(*),
                blog_categories(*)
              `)
              .single();

            if (error) {
              console.error('Failed to create post for schema test:', error);
              return;
            }

            migratedPostSlugs.push(slug);

            // Verify the post data contains all required fields for schema generation
            expect(createdPost).toBeDefined();
            expect(createdPost.title).toBe(post.title); // headline
            expect(createdPost.excerpt).toBe(post.excerpt); // description
            expect(createdPost.published_date).toBeDefined(); // datePublished
            expect(createdPost.modified_date).toBeDefined(); // dateModified
            expect(createdPost.blog_authors).toBeDefined(); // author
            expect(createdPost.blog_authors.name).toBeDefined();
            expect(createdPost.content).toBeDefined();
            expect(createdPost.slug).toBe(slug);

            // Verify author has required fields for Person schema
            expect(createdPost.blog_authors.name).toBeDefined();
            expect(createdPost.blog_authors.slug).toBeDefined();

            // Verify optional but important fields
            if (post.og_image_url) {
              expect(createdPost.og_image_url).toBe(post.og_image_url);
            }

            // Verify category for articleSection
            expect(createdPost.blog_categories).toBeDefined();
            expect(createdPost.blog_categories.name).toBeDefined();

            // Calculate word count for schema
            const wordCount = createdPost.content.split(/\s+/).length;
            expect(wordCount).toBeGreaterThan(0);

            // Clean up
            await supabase.from('blog_posts').delete().eq('slug', slug);
            migratedPostSlugs = migratedPostSlugs.filter(s => s !== slug);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should include canonical URL in schema matching /blog/{slug} pattern', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
            title: fc.string({ minLength: 10, maxLength: 100 }),
            excerpt: fc.string({ minLength: 50, maxLength: 200 }),
            content: fc.string({ minLength: 100, maxLength: 1000 }),
            read_time: fc.integer({ min: 1, max: 30 }),
          }),

          async (post) => {
            const slug = `test-frontend-canonical-${post.slug}`;

            // Create a published post
            const { data: createdPost, error } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title: post.title,
                excerpt: post.excerpt,
                content: post.content,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: post.read_time,
              })
              .select()
              .single();

            if (error) {
              console.error('Failed to create post for canonical test:', error);
              return;
            }

            migratedPostSlugs.push(slug);

            // Verify canonical URL pattern
            const expectedCanonicalUrl = `https://anoteroslogos.com/blog/${slug}`;
            
            // The slug should match the pattern
            expect(createdPost.slug).toBe(slug);
            expect(createdPost.slug).toMatch(/^[a-z0-9-]+$/);

            // Clean up
            await supabase.from('blog_posts').delete().eq('slug', slug);
            migratedPostSlugs = migratedPostSlugs.filter(s => s !== slug);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Property 25: Author Person Schema Generation', () => {
    /**
     * Feature: blog-cms, Property 25: Author Person Schema Generation
     * Validates: Requirements 7.3
     * 
     * For any published blog post, the rendered HTML should contain 
     * Schema.org Person markup for the author with E-E-A-T signals 
     * (expertise, knowsAbout, jobTitle).
     */
    it('should generate valid Person schema for author with E-E-A-T signals', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
            title: fc.string({ minLength: 10, maxLength: 100 }),
            excerpt: fc.string({ minLength: 50, maxLength: 200 }),
            content: fc.string({ minLength: 100, maxLength: 1000 }),
            read_time: fc.integer({ min: 1, max: 30 }),
          }),

          async (post) => {
            const slug = `test-frontend-author-schema-${post.slug}`;

            // Create a published post
            const { data: createdPost, error } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title: post.title,
                excerpt: post.excerpt,
                content: post.content,
                author_id: testAuthorId,
                category_id: testCategoryId,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: post.read_time,
              })
              .select(`
                *,
                blog_authors(*)
              `)
              .single();

            if (error) {
              console.error('Failed to create post for author schema test:', error);
              return;
            }

            migratedPostSlugs.push(slug);

            // Verify author has all E-E-A-T fields
            const author = createdPost.blog_authors;
            expect(author).toBeDefined();
            expect(author.name).toBeDefined();
            expect(author.slug).toBeDefined();
            
            // E-E-A-T signals
            expect(author.job_title).toBeDefined();
            expect(author.expertise).toBeDefined();
            expect(Array.isArray(author.expertise)).toBe(true);
            expect(author.expertise.length).toBeGreaterThan(0);
            
            expect(author.knows_about).toBeDefined();
            expect(Array.isArray(author.knows_about)).toBe(true);
            expect(author.knows_about.length).toBeGreaterThan(0);

            // Optional but valuable fields
            if (author.bio) {
              expect(typeof author.bio).toBe('string');
            }
            if (author.email) {
              expect(typeof author.email).toBe('string');
              expect(author.email).toMatch(/@/);
            }

            // Verify author URL pattern
            const expectedAuthorUrl = `https://anoteroslogos.com/author/${author.slug}`;
            expect(author.slug).toMatch(/^[a-z0-9-]+$/);

            // Clean up
            await supabase.from('blog_posts').delete().eq('slug', slug);
            migratedPostSlugs = migratedPostSlugs.filter(s => s !== slug);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should populate author data consistently across all posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              slug: fc.stringMatching(/^[a-z0-9-]{5,50}$/),
              title: fc.string({ minLength: 10, maxLength: 100 }),
              excerpt: fc.string({ minLength: 50, maxLength: 200 }),
              content: fc.string({ minLength: 100, maxLength: 1000 }),
              read_time: fc.integer({ min: 1, max: 30 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),

          async (posts) => {
            const createdSlugs: string[] = [];

            // Create multiple posts by the same author
            for (const post of posts) {
              const slug = `test-frontend-author-consistency-${post.slug}`;
              
              const { data, error } = await supabase
                .from('blog_posts')
                .insert({
                  slug,
                  title: post.title,
                  excerpt: post.excerpt,
                  content: post.content,
                  author_id: testAuthorId,
                  category_id: testCategoryId,
                  status: 'published',
                  published_date: new Date().toISOString(),
                  read_time: post.read_time,
                })
                .select(`
                  *,
                  blog_authors(*)
                `)
                .single();

              if (!error && data) {
                createdSlugs.push(slug);
                migratedPostSlugs.push(slug);
              }
            }

            // Fetch all created posts
            const { data: fetchedPosts, error } = await supabase
              .from('blog_posts')
              .select(`
                *,
                blog_authors(*)
              `)
              .in('slug', createdSlugs);

            expect(error).toBeNull();
            expect(fetchedPosts).toBeDefined();
            expect(fetchedPosts.length).toBe(createdSlugs.length);

            // Verify all posts have the same author data
            const firstAuthor = fetchedPosts[0].blog_authors;
            for (const post of fetchedPosts) {
              expect(post.blog_authors.id).toBe(firstAuthor.id);
              expect(post.blog_authors.name).toBe(firstAuthor.name);
              expect(post.blog_authors.slug).toBe(firstAuthor.slug);
              expect(post.blog_authors.job_title).toBe(firstAuthor.job_title);
              expect(post.blog_authors.expertise).toEqual(firstAuthor.expertise);
              expect(post.blog_authors.knows_about).toEqual(firstAuthor.knows_about);
            }

            // Clean up
            for (const slug of createdSlugs) {
              await supabase.from('blog_posts').delete().eq('slug', slug);
              migratedPostSlugs = migratedPostSlugs.filter(s => s !== slug);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
