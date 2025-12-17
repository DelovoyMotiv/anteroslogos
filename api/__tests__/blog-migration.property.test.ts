/**
 * Property-Based Tests for Blog Data Migration
 * Feature: blog-cms
 * 
 * Tests migration functionality to ensure data preservation and error resilience
 * 
 * @module api/__tests__/blog-migration.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

// Type definitions matching the migration script
interface BlogAuthor {
  name: string;
  slug: string;
  image: string;
  bio?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: BlogAuthor;
  publishedDate: string;
  modifiedDate: string;
  readTime: number;
  category: string;
  tags: string[];
  image?: string;
  featured?: boolean;
  seo?: {
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

describe('Blog Migration - Property-Based Tests', () => {
  let supabase: SupabaseClient;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Migration tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  afterAll(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up test data
    await supabase.from('blog_posts').delete().like('slug', 'test-migration-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-migration-author-%');
    await supabase.from('blog_categories').delete().like('slug', 'test-migration-category-%');

    // Clean up test data
    await supabase.from('blog_post_tags').delete().like('post_id', '%');
    await supabase.from('blog_posts').delete().like('slug', 'test-migration-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-migration-%');
    await supabase.from('blog_categories').delete().like('slug', 'test-migration-%');
    await supabase.from('blog_tags').delete().like('slug', 'test-migration-%');
  });

  describe('Property 11: Migration Data Preservation', () => {
    /**
     * Feature: blog-cms, Property 11: Migration Data Preservation
     * Validates: Requirements 4.2
     * 
     * For any blog post in the source data file, after migration, the database 
     * should contain a post with identical slug, publish date, and all metadata fields.
     */
    it('should preserve all post metadata through migration', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Generators for blog post data
      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-migration-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      const authorArbitrary = fc.record({
        name: fc.string({ minLength: 5, maxLength: 50 }),
        slug: fc
          .string({ minLength: 5, maxLength: 50 })
          .map(s => 'test-migration-author-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        image: fc.webUrl(),
        bio: fc.option(fc.string({ minLength: 20, maxLength: 200 }), { nil: undefined }),
      });

      const categoryArbitrary = fc
        .string({ minLength: 5, maxLength: 30 })
        .map(s => 'Test Migration ' + s);

      const tagsArbitrary = fc.array(
        fc.string({ minLength: 3, maxLength: 20 }),
        { minLength: 1, maxLength: 5 }
      );

      const seoArbitrary = fc.option(
        fc.record({
          metaDescription: fc.option(fc.string({ minLength: 50, maxLength: 160 }), { nil: undefined }),
          keywords: fc.option(
            fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
            { nil: undefined }
          ),
          ogImage: fc.option(fc.webUrl(), { nil: undefined }),
        }),
        { nil: undefined }
      );

      const blogPostArbitrary = fc.record({
        slug: slugArbitrary,
        title: fc.string({ minLength: 10, maxLength: 200 }),
        excerpt: fc.string({ minLength: 50, maxLength: 500 }),
        content: fc.string({ minLength: 100, maxLength: 5000 }),
        author: authorArbitrary,
        publishedDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString().split('T')[0]),
        modifiedDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString().split('T')[0]),
        readTime: fc.integer({ min: 1, max: 60 }),
        category: categoryArbitrary,
        tags: tagsArbitrary,
        image: fc.option(fc.webUrl(), { nil: undefined }),
        featured: fc.option(fc.boolean(), { nil: undefined }),
        seo: seoArbitrary,
      });

      await fc.assert(
        fc.asyncProperty(blogPostArbitrary, async (sourcePost: BlogPost) => {
          // Step 1: Migrate author
          const { data: author, error: authorError } = await supabase
            .from('blog_authors')
            .upsert(
              {
                slug: sourcePost.author.slug,
                name: sourcePost.author.name,
                bio: sourcePost.author.bio || null,
                image_url: sourcePost.author.image || null,
              },
              { onConflict: 'slug' }
            )
            .select()
            .single();

          expect(authorError).toBeNull();
          expect(author).toBeDefined();

          if (!author) return;

          // Step 2: Migrate category
          const categorySlug = sourcePost.category.toLowerCase().replace(/\s+/g, '-');
          const { data: category, error: categoryError } = await supabase
            .from('blog_categories')
            .upsert(
              {
                slug: categorySlug,
                name: sourcePost.category,
                description: null,
                display_order: 0,
              },
              { onConflict: 'slug' }
            )
            .select()
            .single();

          expect(categoryError).toBeNull();
          expect(category).toBeDefined();

          if (!category) return;

          // Step 3: Migrate tags
          const tagIds: string[] = [];
          for (const tagName of sourcePost.tags) {
            const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
            const { data: tag, error: tagError } = await supabase
              .from('blog_tags')
              .upsert(
                {
                  name: tagName,
                  slug: tagSlug,
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            expect(tagError).toBeNull();
            if (tag) {
              tagIds.push(tag.id);
            }
          }

          // Step 4: Migrate blog post
          const postData = {
            slug: sourcePost.slug,
            title: sourcePost.title,
            excerpt: sourcePost.excerpt,
            content: sourcePost.content,
            author_id: author.id,
            category_id: category.id,
            featured: sourcePost.featured || false,
            status: 'published' as const,
            published_date: sourcePost.publishedDate,
            modified_date: sourcePost.modifiedDate,
            read_time: sourcePost.readTime,
            meta_description: sourcePost.seo?.metaDescription || null,
            meta_keywords: sourcePost.seo?.keywords || null,
            og_image_url: sourcePost.seo?.ogImage || sourcePost.image || null,
          };

          const { data: migratedPost, error: postError } = await supabase
            .from('blog_posts')
            .insert(postData)
            .select()
            .single();

          expect(postError).toBeNull();
          expect(migratedPost).toBeDefined();

          if (!migratedPost) return;

          // Step 5: Create post-tag relationships
          for (const tagId of tagIds) {
            await supabase
              .from('blog_post_tags')
              .insert({
                post_id: migratedPost.id,
                tag_id: tagId,
              });
          }

          // Step 6: Retrieve migrated post and verify
          const { data: retrievedPost, error: retrieveError } = await supabase
            .from('blog_posts')
            .select('*, blog_authors(*), blog_categories(*)')
            .eq('id', migratedPost.id)
            .single();

          expect(retrieveError).toBeNull();
          expect(retrievedPost).toBeDefined();

          if (!retrievedPost) return;

          // Property: All metadata should be preserved
          expect(retrievedPost.slug).toBe(sourcePost.slug);
          expect(retrievedPost.title).toBe(sourcePost.title);
          expect(retrievedPost.excerpt).toBe(sourcePost.excerpt);
          expect(retrievedPost.content).toBe(sourcePost.content);
          expect(retrievedPost.read_time).toBe(sourcePost.readTime);
          expect(retrievedPost.featured).toBe(sourcePost.featured || false);
          expect(retrievedPost.status).toBe('published');

          // Property: Dates should be preserved
          expect(retrievedPost.published_date).toContain(sourcePost.publishedDate);
          expect(retrievedPost.modified_date).toContain(sourcePost.modifiedDate);

          // Property: SEO metadata should be preserved
          expect(retrievedPost.meta_description).toBe(sourcePost.seo?.metaDescription || null);
          expect(retrievedPost.og_image_url).toBe(sourcePost.seo?.ogImage || sourcePost.image || null);

          if (sourcePost.seo?.keywords) {
            expect(retrievedPost.meta_keywords).toEqual(sourcePost.seo.keywords);
          } else {
            expect(retrievedPost.meta_keywords).toBeNull();
          }

          // Property: Author data should be preserved
          expect(retrievedPost.blog_authors.slug).toBe(sourcePost.author.slug);
          expect(retrievedPost.blog_authors.name).toBe(sourcePost.author.name);

          // Property: Category should be preserved
          expect(retrievedPost.blog_categories.slug).toBe(categorySlug);
          expect(retrievedPost.blog_categories.name).toBe(sourcePost.category);

          // Property: Tags should be preserved
          const { data: postTags } = await supabase
            .from('blog_post_tags')
            .select('blog_tags(*)')
            .eq('post_id', migratedPost.id);

          expect(postTags).toBeDefined();
          expect(postTags?.length).toBe(sourcePost.tags.length);

          // Clean up
          await supabase.from('blog_post_tags').delete().eq('post_id', migratedPost.id);
          await supabase.from('blog_posts').delete().eq('id', migratedPost.id);
          await supabase.from('blog_authors').delete().eq('id', author.id);
          await supabase.from('blog_categories').delete().eq('id', category.id);
          for (const tagId of tagIds) {
            await supabase.from('blog_tags').delete().eq('id', tagId);
          }
        }),
        { numRuns: 50 } // Reduced runs due to complexity
      );
    });
  });

  describe('Property 12: URL Preservation After Migration', () => {
    /**
     * Feature: blog-cms, Property 12: URL Preservation After Migration
     * Validates: Requirements 4.3
     * 
     * For any blog post URL that worked before migration (/blog/{slug}), 
     * the same URL should work after migration and serve the same content from the database.
     */
    it('should preserve URL structure and accessibility after migration', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-migration-url-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 100, maxLength: 5000 }),
          fc.integer({ min: 1, max: 60 }),
          async (slug, title, excerpt, content, readTime) => {
            // Create minimal author and category for test
            const { data: author } = await supabase
              .from('blog_authors')
              .upsert(
                {
                  slug: 'test-migration-url-author',
                  name: 'Test Author',
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            const { data: category } = await supabase
              .from('blog_categories')
              .upsert(
                {
                  slug: 'test-migration-url-category',
                  name: 'Test Category',
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            if (!author || !category) return;

            // Simulate migration: insert post with original slug
            const { data: migratedPost, error: insertError } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title,
                excerpt,
                content,
                author_id: author.id,
                category_id: category.id,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: readTime,
              })
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(migratedPost).toBeDefined();

            if (!migratedPost) return;

            // Property: Post should be retrievable by slug (simulating URL access)
            const { data: retrievedBySlug, error: retrieveError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug)
              .eq('status', 'published')
              .single();

            expect(retrieveError).toBeNull();
            expect(retrievedBySlug).toBeDefined();

            // Property: Retrieved post should have same content
            expect(retrievedBySlug?.slug).toBe(slug);
            expect(retrievedBySlug?.title).toBe(title);
            expect(retrievedBySlug?.excerpt).toBe(excerpt);
            expect(retrievedBySlug?.content).toBe(content);

            // Property: URL pattern /blog/{slug} should be constructible
            const expectedUrl = `/blog/${slug}`;
            expect(expectedUrl).toMatch(/^\/blog\/[a-z0-9-]+$/);

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', migratedPost.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain slug uniqueness across migrations', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-migration-unique-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 100, maxLength: 5000 }),
          fc.integer({ min: 1, max: 60 }),
          async (slug, title, excerpt, content, readTime) => {
            // Create minimal author and category for test
            const { data: author } = await supabase
              .from('blog_authors')
              .upsert(
                {
                  slug: 'test-migration-unique-author',
                  name: 'Test Author',
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            const { data: category } = await supabase
              .from('blog_categories')
              .upsert(
                {
                  slug: 'test-migration-unique-category',
                  name: 'Test Category',
                },
                { onConflict: 'slug' }
              )
              .select()
              .single();

            if (!author || !category) return;

            // Insert first post with slug
            const { data: firstPost, error: firstError } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title,
                excerpt,
                content,
                author_id: author.id,
                category_id: category.id,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: readTime,
              })
              .select()
              .single();

            expect(firstError).toBeNull();
            expect(firstPost).toBeDefined();

            if (!firstPost) return;

            // Property: Attempting to insert another post with same slug should fail
            const { error: duplicateError } = await supabase
              .from('blog_posts')
              .insert({
                slug, // Same slug
                title: title + ' Duplicate',
                excerpt,
                content,
                author_id: author.id,
                category_id: category.id,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: readTime,
              });

            // Property: Duplicate slug should be rejected
            expect(duplicateError).not.toBeNull();
            expect(duplicateError?.message).toContain('duplicate');

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', firstPost.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Migration Error Resilience', () => {
    /**
     * Feature: blog-cms, Property 13: Migration Error Resilience
     * Validates: Requirements 4.4
     * 
     * For any migration batch containing some invalid posts, the system should 
     * log errors for invalid posts but successfully migrate all valid posts.
     */
    it('should continue migration despite individual post failures', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      // Create test author and category
      const { data: author } = await supabase
        .from('blog_authors')
        .upsert(
          {
            slug: 'test-migration-resilience-author',
            name: 'Test Author',
          },
          { onConflict: 'slug' }
        )
        .select()
        .single();

      const { data: category } = await supabase
        .from('blog_categories')
        .upsert(
          {
            slug: 'test-migration-resilience-category',
            name: 'Test Category',
          },
          { onConflict: 'slug' }
        )
        .select()
        .single();

      if (!author || !category) return;

      // Generator for valid posts
      const validPostArbitrary = fc.record({
        slug: fc
          .string({ minLength: 5, maxLength: 50 })
          .map(s => 'test-migration-resilience-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        title: fc.string({ minLength: 10, maxLength: 200 }),
        excerpt: fc.string({ minLength: 50, maxLength: 500 }),
        content: fc.string({ minLength: 100, maxLength: 5000 }),
        readTime: fc.integer({ min: 1, max: 60 }),
      });

      // Generator for invalid posts (missing required fields)
      const invalidPostArbitrary = fc.record({
        slug: fc
          .string({ minLength: 5, maxLength: 50 })
          .map(s => 'test-migration-resilience-invalid-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        title: fc.constant(''), // Invalid: empty title
        excerpt: fc.string({ minLength: 50, maxLength: 500 }),
        content: fc.string({ minLength: 100, maxLength: 5000 }),
        readTime: fc.integer({ min: 1, max: 60 }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(validPostArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(invalidPostArbitrary, { minLength: 1, maxLength: 2 }),
          async (validPosts, invalidPosts) => {
            const results: { success: boolean; slug: string; error?: string }[] = [];

            // Attempt to migrate all posts (valid and invalid mixed)
            const allPosts = [...validPosts, ...invalidPosts];

            for (const post of allPosts) {
              try {
                const { data, error } = await supabase
                  .from('blog_posts')
                  .insert({
                    slug: post.slug,
                    title: post.title,
                    excerpt: post.excerpt,
                    content: post.content,
                    author_id: author.id,
                    category_id: category.id,
                    status: 'published',
                    published_date: new Date().toISOString(),
                    read_time: post.readTime,
                  })
                  .select()
                  .single();

                if (error) {
                  results.push({
                    success: false,
                    slug: post.slug,
                    error: error.message,
                  });
                } else {
                  results.push({
                    success: true,
                    slug: post.slug,
                  });
                }
              } catch (err) {
                results.push({
                  success: false,
                  slug: post.slug,
                  error: err instanceof Error ? err.message : 'Unknown error',
                });
              }
            }

            // Property: All valid posts should succeed
            const validResults = results.filter(r => 
              validPosts.some(p => p.slug === r.slug)
            );
            const validSuccesses = validResults.filter(r => r.success);
            expect(validSuccesses.length).toBe(validPosts.length);

            // Property: All invalid posts should fail
            const invalidResults = results.filter(r => 
              invalidPosts.some(p => p.slug === r.slug)
            );
            const invalidFailures = invalidResults.filter(r => !r.success);
            expect(invalidFailures.length).toBe(invalidPosts.length);

            // Property: Errors should be logged for invalid posts
            invalidFailures.forEach(failure => {
              expect(failure.error).toBeDefined();
              expect(failure.error).toBeTruthy();
            });

            // Clean up successful migrations
            for (const result of results.filter(r => r.success)) {
              await supabase.from('blog_posts').delete().eq('slug', result.slug);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs due to complexity
      );
    });

    it('should handle missing author references gracefully', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      const slugArbitrary = fc
        .string({ minLength: 5, maxLength: 50 })
        .map(s => 'test-migration-missing-author-' + s.toLowerCase().replace(/[^a-z0-9]/g, '-'));

      await fc.assert(
        fc.asyncProperty(
          slugArbitrary,
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 100, maxLength: 5000 }),
          fc.integer({ min: 1, max: 60 }),
          async (slug, title, excerpt, content, readTime) => {
            // Use a non-existent author ID
            const fakeAuthorId = '00000000-0000-0000-0000-000000000000';

            // Property: Attempting to insert post with non-existent author should fail
            const { error } = await supabase
              .from('blog_posts')
              .insert({
                slug,
                title,
                excerpt,
                content,
                author_id: fakeAuthorId,
                status: 'published',
                published_date: new Date().toISOString(),
                read_time: readTime,
              });

            // Property: Error should be returned (foreign key constraint)
            expect(error).not.toBeNull();
            expect(error?.message).toMatch(/foreign key|violates/i);

            // Property: Post should not exist in database
            const { data: checkPost } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('slug', slug)
              .single();

            expect(checkPost).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
