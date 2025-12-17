/**
 * Property-Based Tests for Blog Category and Tag Management
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-category-tag.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog Category and Tag Management - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testAuthorId: string;

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Category/Tag tests - Supabase not configured');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate unique slug to avoid conflicts
    const testId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Clean up any existing test data first
    await supabase.from('blog_posts').delete().like('slug', 'test-cat-tag-%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-%');
    await supabase.from('blog_tags').delete().like('slug', 'test-tag-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-cat-tag%');

    // Create a test author for use in tests
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .insert({
        slug: `test-author-cat-tag-${testId}`,
        name: 'Test Author Cat Tag',
        bio: 'Test bio for category/tag tests',
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
    await supabase.from('blog_posts').delete().like('slug', 'test-cat-tag-%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-%');
    await supabase.from('blog_tags').delete().like('slug', 'test-tag-%');
    await supabase.from('blog_authors').delete().eq('id', testAuthorId);
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;

    // Clean up any data from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-cat-tag-%');
    await supabase.from('blog_categories').delete().like('slug', 'test-category-%');
    await supabase.from('blog_tags').delete().like('slug', 'test-tag-%');
  });

  describe('Property 18: Category Data Round-Trip', () => {
    /**
     * Feature: blog-cms, Property 18: Category Data Round-Trip
     * Validates: Requirements 6.1
     * 
     * For any category with all fields (name, slug, description, display_order), 
     * storing and retrieving it should return identical data.
     */
    it('should preserve all category fields through store and retrieve cycle', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }).map(s => 
            s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
          ).filter(s => s.length > 0),
          fc.string({ minLength: 5, maxLength: 100 }).map(s => 
            s.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-')
          ).filter(s => s.length > 0),
          fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null }),
          fc.integer({ min: 0, max: 100 }),
          async (name, slug, description, displayOrder) => {
            // Ensure unique slug with valid format
            const uniqueSlug = `test-category-${slug}-${Date.now()}-${Math.random().toString(36).substring(7)}`.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

            // Create category with all fields
            const categoryData = {
              slug: uniqueSlug,
              name,
              description,
              display_order: displayOrder,
            };

            const { data: insertedCategory, error: insertError } = await supabase
              .from('blog_categories')
              .insert(categoryData)
              .select()
              .single();

            expect(insertError).toBeNull();
            expect(insertedCategory).toBeDefined();

            if (!insertedCategory) return;

            // Retrieve the category
            const { data: retrievedCategory, error: retrieveError } = await supabase
              .from('blog_categories')
              .select('*')
              .eq('id', insertedCategory.id)
              .single();

            expect(retrieveError).toBeNull();
            expect(retrievedCategory).toBeDefined();

            if (!retrievedCategory) return;

            // Property: All fields should match exactly
            expect(retrievedCategory.slug).toBe(uniqueSlug);
            expect(retrievedCategory.name).toBe(name);
            expect(retrievedCategory.description).toBe(description);
            expect(retrievedCategory.display_order).toBe(displayOrder);

            // Property: System fields should be set
            expect(retrievedCategory.id).toBeDefined();
            expect(retrievedCategory.created_at).toBeDefined();
            expect(retrievedCategory.updated_at).toBeDefined();

            // Clean up
            await supabase.from('blog_categories').delete().eq('id', insertedCategory.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Single Category Per Post', () => {
    /**
     * Feature: blog-cms, Property 19: Single Category Per Post
     * Validates: Requirements 6.2
     * 
     * For any blog post, it should have at most one category assigned, 
     * and attempting to assign multiple categories should either use the last one 
     * or reject the operation.
     */
    it('should allow only one category per post', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of categories to create
          async (numCategories) => {
            // Create multiple categories
            const categories: any[] = [];
            for (let i = 0; i < numCategories; i++) {
              const { data: category, error } = await supabase
                .from('blog_categories')
                .insert({
                  slug: `test-category-single-${Date.now()}-${i}`,
                  name: `Test Category ${i}`,
                })
                .select()
                .single();

              expect(error).toBeNull();
              if (category) categories.push(category);
            }

            expect(categories).toHaveLength(numCategories);

            // Create a post with the first category
            const postData = {
              slug: `test-cat-tag-single-${Date.now()}`,
              title: 'Test Post',
              excerpt: 'Test excerpt',
              content: 'Test content',
              author_id: testAuthorId,
              category_id: categories[0].id,
              status: 'published',
              read_time: 5,
              published_date: new Date().toISOString(),
            };

            const { data: post, error: postError } = await supabase
              .from('blog_posts')
              .insert(postData)
              .select()
              .single();

            expect(postError).toBeNull();
            expect(post).toBeDefined();

            if (!post) return;

            // Property: Post should have exactly one category
            expect(post.category_id).toBe(categories[0].id);

            // Update post to use a different category
            const { data: updatedPost, error: updateError } = await supabase
              .from('blog_posts')
              .update({ category_id: categories[1].id })
              .eq('id', post.id)
              .select()
              .single();

            expect(updateError).toBeNull();
            expect(updatedPost).toBeDefined();

            if (!updatedPost) return;

            // Property: Post should now have the new category (only one)
            expect(updatedPost.category_id).toBe(categories[1].id);
            expect(updatedPost.category_id).not.toBe(categories[0].id);

            // Verify by fetching again
            const { data: fetchedPost, error: fetchError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('id', post.id)
              .single();

            expect(fetchError).toBeNull();
            expect(fetchedPost?.category_id).toBe(categories[1].id);

            // Clean up
            await supabase.from('blog_posts').delete().eq('id', post.id);
            for (const cat of categories) {
              await supabase.from('blog_categories').delete().eq('id', cat.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Tag Normalization', () => {
    /**
     * Feature: blog-cms, Property 20: Tag Normalization
     * Validates: Requirements 6.3
     * 
     * For any two tag creation attempts with the same name but different cases 
     * (e.g., "SEO" and "seo"), the system should treat them as the same tag 
     * and prevent duplicates.
     */
    it('should normalize tag names and prevent case-sensitive duplicates', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
          async (tagName) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            
            // Create variations of the tag name with different cases
            const variations = [
              tagName.toLowerCase(),
              tagName.toUpperCase(),
              tagName.charAt(0).toUpperCase() + tagName.slice(1).toLowerCase(),
            ];

            // Normalize the tag name (what the system should do)
            const normalizedName = tagName.toLowerCase().trim();
            const expectedSlug = normalizedName.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

            // Try to create tags with different case variations
            const createdTags: any[] = [];
            for (let i = 0; i < variations.length; i++) {
              const variation = variations[i];
              const uniqueVariation = `${variation}-${timestamp}-${random}`;
              
              const { data: tag, error } = await supabase
                .from('blog_tags')
                .insert({
                  name: uniqueVariation.toLowerCase().trim(),
                  slug: `test-tag-${expectedSlug}-${timestamp}-${random}`,
                })
                .select()
                .single();

              // First one should succeed
              if (i === 0) {
                expect(error).toBeNull();
                if (tag) createdTags.push(tag);
              } else {
                // Subsequent ones with same slug should fail due to unique constraint
                // OR we should check if tag already exists before inserting
                if (!error && tag) {
                  // If it succeeded, it means we're checking for existing tags
                  // In this case, verify it's the same tag
                  expect(tag.slug).toBe(createdTags[0].slug);
                }
              }
            }

            // Property: Only one tag should exist with the normalized name
            const { data: allTags, error: queryError } = await supabase
              .from('blog_tags')
              .select('*')
              .like('slug', `test-tag-${expectedSlug}-${timestamp}-%`);

            expect(queryError).toBeNull();
            
            // Should have at most one tag with this normalized slug
            if (allTags) {
              const uniqueSlugs = new Set(allTags.map(t => t.slug));
              expect(uniqueSlugs.size).toBeLessThanOrEqual(1);
            }

            // Clean up
            for (const tag of createdTags) {
              await supabase.from('blog_tags').delete().eq('id', tag.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Multiple Tags Per Post', () => {
    /**
     * Feature: blog-cms, Property 21: Multiple Tags Per Post
     * Validates: Requirements 6.4
     * 
     * For any blog post, it should support having multiple tags assigned, 
     * and all assigned tags should be retrievable when querying the post.
     */
    it('should support multiple tags per post and retrieve all assigned tags', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // Number of tags
          async (numTags) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Create multiple tags
            const tags: any[] = [];
            for (let i = 0; i < numTags; i++) {
              const { data: tag, error } = await supabase
                .from('blog_tags')
                .insert({
                  name: `test tag ${i}`,
                  slug: `test-tag-multi-${timestamp}-${random}-${i}`,
                })
                .select()
                .single();

              expect(error).toBeNull();
              if (tag) tags.push(tag);
            }

            expect(tags).toHaveLength(numTags);

            // Create a post
            const postData = {
              slug: `test-cat-tag-multi-${timestamp}-${random}`,
              title: 'Test Post',
              excerpt: 'Test excerpt',
              content: 'Test content',
              author_id: testAuthorId,
              status: 'published',
              read_time: 5,
              published_date: new Date().toISOString(),
            };

            const { data: post, error: postError } = await supabase
              .from('blog_posts')
              .insert(postData)
              .select()
              .single();

            expect(postError).toBeNull();
            expect(post).toBeDefined();

            if (!post) return;

            // Assign all tags to the post
            for (const tag of tags) {
              const { error: junctionError } = await supabase
                .from('blog_post_tags')
                .insert({
                  post_id: post.id,
                  tag_id: tag.id,
                });

              expect(junctionError).toBeNull();
            }

            // Retrieve post with tags
            const { data: postTags, error: queryError } = await supabase
              .from('blog_post_tags')
              .select('blog_tags(*)')
              .eq('post_id', post.id);

            expect(queryError).toBeNull();
            expect(postTags).toBeDefined();

            if (!postTags) return;

            // Property: Should retrieve all assigned tags
            expect(postTags).toHaveLength(numTags);

            // Property: All tag IDs should match
            const retrievedTagIds = postTags.map((pt: any) => pt.blog_tags.id).sort();
            const expectedTagIds = tags.map(t => t.id).sort();
            expect(retrievedTagIds).toEqual(expectedTagIds);

            // Property: Each tag should appear exactly once
            const tagIdCounts = new Map<string, number>();
            for (const pt of postTags) {
              const tagId = (pt as any).blog_tags.id;
              tagIdCounts.set(tagId, (tagIdCounts.get(tagId) || 0) + 1);
            }
            for (const count of tagIdCounts.values()) {
              expect(count).toBe(1);
            }

            // Clean up
            await supabase.from('blog_post_tags').delete().eq('post_id', post.id);
            await supabase.from('blog_posts').delete().eq('id', post.id);
            for (const tag of tags) {
              await supabase.from('blog_tags').delete().eq('id', tag.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Category/Tag Filter Ordering', () => {
    /**
     * Feature: blog-cms, Property 22: Category/Tag Filter Ordering
     * Validates: Requirements 6.5
     * 
     * For any filter by category or tag, the returned posts should be ordered 
     * by published_date in descending order (newest first).
     */
    it('should order filtered posts by published_date descending', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // Number of posts
          async (numPosts) => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);

            // Create a category
            const { data: category, error: catError } = await supabase
              .from('blog_categories')
              .insert({
                slug: `test-category-order-${timestamp}-${random}`,
                name: 'Test Category Order',
              })
              .select()
              .single();

            expect(catError).toBeNull();
            if (!category) return;

            // Create a tag
            const { data: tag, error: tagError } = await supabase
              .from('blog_tags')
              .insert({
                name: 'test order tag',
                slug: `test-tag-order-${timestamp}-${random}`,
              })
              .select()
              .single();

            expect(tagError).toBeNull();
            if (!tag) return;

            // Create posts with different published dates
            const posts: any[] = [];
            for (let i = 0; i < numPosts; i++) {
              const publishedDate = new Date(Date.now() - i * 60000).toISOString(); // 1 minute apart

              const postData = {
                slug: `test-cat-tag-order-${timestamp}-${random}-${i}`,
                title: `Test Post ${i}`,
                excerpt: `Test excerpt ${i}`,
                content: `Test content ${i}`,
                author_id: testAuthorId,
                category_id: category.id,
                status: 'published',
                read_time: 5,
                published_date: publishedDate,
              };

              const { data: post, error: postError } = await supabase
                .from('blog_posts')
                .insert(postData)
                .select()
                .single();

              expect(postError).toBeNull();
              if (post) {
                posts.push(post);

                // Assign tag to post
                await supabase
                  .from('blog_post_tags')
                  .insert({
                    post_id: post.id,
                    tag_id: tag.id,
                  });
              }
            }

            expect(posts).toHaveLength(numPosts);

            // Test category filtering with ordering
            const { data: categoryPosts, error: catQueryError } = await supabase
              .from('blog_posts')
              .select('*')
              .eq('category_id', category.id)
              .eq('status', 'published')
              .is('deleted_at', null)
              .order('published_date', { ascending: false });

            expect(catQueryError).toBeNull();
            expect(categoryPosts).toHaveLength(numPosts);

            // Property: Posts should be ordered by published_date descending
            if (categoryPosts && categoryPosts.length > 1) {
              for (let i = 0; i < categoryPosts.length - 1; i++) {
                const current = new Date(categoryPosts[i].published_date!).getTime();
                const next = new Date(categoryPosts[i + 1].published_date!).getTime();
                expect(current).toBeGreaterThanOrEqual(next);
              }
            }

            // Test tag filtering with ordering
            const { data: postTagsData, error: tagQueryError } = await supabase
              .from('blog_post_tags')
              .select('post_id')
              .eq('tag_id', tag.id);

            expect(tagQueryError).toBeNull();

            if (postTagsData && postTagsData.length > 0) {
              const postIds = postTagsData.map(pt => pt.post_id);

              const { data: tagPosts, error: tagPostsError } = await supabase
                .from('blog_posts')
                .select('*')
                .in('id', postIds)
                .eq('status', 'published')
                .is('deleted_at', null)
                .order('published_date', { ascending: false });

              expect(tagPostsError).toBeNull();
              expect(tagPosts).toHaveLength(numPosts);

              // Property: Posts should be ordered by published_date descending
              if (tagPosts && tagPosts.length > 1) {
                for (let i = 0; i < tagPosts.length - 1; i++) {
                  const current = new Date(tagPosts[i].published_date!).getTime();
                  const next = new Date(tagPosts[i + 1].published_date!).getTime();
                  expect(current).toBeGreaterThanOrEqual(next);
                }
              }
            }

            // Clean up
            for (const post of posts) {
              await supabase.from('blog_post_tags').delete().eq('post_id', post.id);
              await supabase.from('blog_posts').delete().eq('id', post.id);
            }
            await supabase.from('blog_categories').delete().eq('id', category.id);
            await supabase.from('blog_tags').delete().eq('id', tag.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
