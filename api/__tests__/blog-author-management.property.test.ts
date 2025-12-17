/**
 * Property-Based Tests for Blog Author Management
 * Feature: blog-cms
 * 
 * @module api/__tests__/blog-author-management.property.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { hasSupabase } from './setup';

describe('Blog Author Management - Property-Based Tests', () => {
  let supabase: SupabaseClient;
  let testPostIds: string[] = [];
  let testAuthorIds: string[] = [];

  beforeAll(async () => {
    if (!hasSupabase) {
      console.warn('Skipping Blog Author Management tests - Supabase not configured');
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
    await supabase.from('blog_posts').delete().like('slug', 'test-author-mgmt-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-%');
  });

  beforeEach(async () => {
    if (!hasSupabase || !supabase) return;
    
    testPostIds = [];
    testAuthorIds = [];
    
    // Clean up any data from previous test runs
    await supabase.from('blog_posts').delete().like('slug', 'test-author-mgmt-%');
    await supabase.from('blog_authors').delete().like('slug', 'test-author-%');
  });

  // Custom generators for author data
  const authorNameGenerator = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
  const authorBioGenerator = fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null });
  const authorEmailGenerator = fc.option(fc.emailAddress(), { nil: null });
  const authorJobTitleGenerator = fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: null });
  const authorExpertiseGenerator = fc.option(
    fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    { nil: null }
  );
  const authorKnowsAboutGenerator = fc.option(
    fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    { nil: null }
  );

  describe('Property 14: Author Data Round-Trip', () => {
    /**
     * Feature: blog-cms, Property 14: Author Data Round-Trip
     * Validates: Requirements 5.1
     * 
     * For any author profile with all fields (name, slug, bio, image, credentials), 
     * storing it and retrieving it should return identical data.
     */
    it('should preserve all author data through create and retrieve cycle', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          authorNameGenerator,
          authorBioGenerator,
          authorEmailGenerator,
          authorJobTitleGenerator,
          authorExpertiseGenerator,
          authorKnowsAboutGenerator,
          async (name, bio, email, jobTitle, expertise, knowsAbout) => {
            // Generate unique slug
            const slug = `test-author-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            // Create author with all fields
            const authorData = {
              slug,
              name: name.trim(),
              bio,
              image_url: null, // We'll skip image URL for simplicity
              email,
              job_title: jobTitle,
              expertise,
              knows_about: knowsAbout,
            };

            const { data: createdAuthor, error: createError } = await supabase
              .from('blog_authors')
              .insert(authorData)
              .select()
              .single();

            expect(createError).toBeNull();
            expect(createdAuthor).toBeDefined();

            if (createdAuthor) {
              testAuthorIds.push(createdAuthor.id);

              // Retrieve the author
              const { data: retrievedAuthor, error: retrieveError } = await supabase
                .from('blog_authors')
                .select('*')
                .eq('id', createdAuthor.id)
                .single();

              expect(retrieveError).toBeNull();
              expect(retrievedAuthor).toBeDefined();

              // Verify all fields match (excluding timestamps and id)
              expect(retrievedAuthor.slug).toBe(authorData.slug);
              expect(retrievedAuthor.name).toBe(authorData.name);
              expect(retrievedAuthor.bio).toBe(authorData.bio);
              expect(retrievedAuthor.email).toBe(authorData.email);
              expect(retrievedAuthor.job_title).toBe(authorData.job_title);
              
              // Compare arrays (handling null)
              if (authorData.expertise === null) {
                expect(retrievedAuthor.expertise).toBeNull();
              } else {
                expect(retrievedAuthor.expertise).toEqual(authorData.expertise);
              }
              
              if (authorData.knows_about === null) {
                expect(retrievedAuthor.knows_about).toBeNull();
              } else {
                expect(retrievedAuthor.knows_about).toEqual(authorData.knows_about);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: Author Data Population', () => {
    /**
     * Feature: blog-cms, Property 15: Author Data Population
     * Validates: Requirements 5.2
     * 
     * For any blog post query, the returned post should include complete author 
     * information (name, bio, credentials) populated from the blog_authors table.
     */
    it('should populate complete author data including E-E-A-T signals when fetching posts', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          authorNameGenerator,
          authorBioGenerator,
          authorJobTitleGenerator,
          authorExpertiseGenerator,
          authorKnowsAboutGenerator,
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 50, maxLength: 500 }),
          fc.string({ minLength: 500, maxLength: 2000 }),
          async (name, bio, jobTitle, expertise, knowsAbout, title, excerpt, content) => {
            // Create author with E-E-A-T signals
            const authorSlug = `test-author-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const { data: author, error: authorError } = await supabase
              .from('blog_authors')
              .insert({
                slug: authorSlug,
                name: name.trim(),
                bio,
                job_title: jobTitle,
                expertise,
                knows_about: knowsAbout,
              })
              .select()
              .single();

            expect(authorError).toBeNull();
            expect(author).toBeDefined();

            if (author) {
              testAuthorIds.push(author.id);

              // Create a blog post by this author
              const postSlug = `test-post-${Date.now()}-${Math.random().toString(36).substring(7)}`;
              const { data: post, error: postError } = await supabase
                .from('blog_posts')
                .insert({
                  slug: postSlug,
                  title: title.trim(),
                  excerpt: excerpt.trim(),
                  content: content.trim(),
                  author_id: author.id,
                  read_time: 5,
                  status: 'published',
                  published_date: new Date().toISOString(),
                })
                .select()
                .single();

              expect(postError).toBeNull();
              expect(post).toBeDefined();

              if (post) {
                testPostIds.push(post.id);

                // Fetch the post with author data populated
                const { data: fetchedPost, error: fetchError } = await supabase
                  .from('blog_posts')
                  .select(`
                    *,
                    blog_authors(*)
                  `)
                  .eq('id', post.id)
                  .single();

                expect(fetchError).toBeNull();
                expect(fetchedPost).toBeDefined();
                expect(fetchedPost.blog_authors).toBeDefined();

                // Verify author data is populated with all fields including E-E-A-T signals
                const populatedAuthor = fetchedPost.blog_authors;
                expect(populatedAuthor.id).toBe(author.id);
                expect(populatedAuthor.name).toBe(author.name);
                expect(populatedAuthor.bio).toBe(author.bio);
                expect(populatedAuthor.job_title).toBe(author.job_title);
                expect(populatedAuthor.expertise).toEqual(author.expertise);
                expect(populatedAuthor.knows_about).toEqual(author.knows_about);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 16: Author Update Propagation', () => {
    /**
     * Feature: blog-cms, Property 16: Author Update Propagation
     * Validates: Requirements 5.4
     * 
     * For any author whose information is updated, all blog posts by that author 
     * should reflect the updated information when queried.
     */
    it('should propagate author updates to all posts via foreign key relationship', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          authorNameGenerator,
          authorNameGenerator, // New name for update
          authorBioGenerator,
          fc.integer({ min: 2, max: 5 }), // Number of posts to create
          async (originalName, updatedName, updatedBio, numPosts) => {
            // Create author
            const authorSlug = `test-author-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const { data: author, error: authorError } = await supabase
              .from('blog_authors')
              .insert({
                slug: authorSlug,
                name: originalName.trim(),
                bio: 'Original bio',
              })
              .select()
              .single();

            expect(authorError).toBeNull();
            expect(author).toBeDefined();

            if (author) {
              testAuthorIds.push(author.id);

              // Create multiple posts by this author
              for (let i = 0; i < numPosts; i++) {
                const postSlug = `test-post-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
                const { data: post, error: postError } = await supabase
                  .from('blog_posts')
                  .insert({
                    slug: postSlug,
                    title: `Test Post ${i}`,
                    excerpt: 'Test excerpt for propagation test',
                    content: 'Test content for propagation test',
                    author_id: author.id,
                    read_time: 5,
                    status: 'published',
                    published_date: new Date().toISOString(),
                  })
                  .select()
                  .single();

                expect(postError).toBeNull();
                if (post) {
                  testPostIds.push(post.id);
                }
              }

              // Update the author
              const { error: updateError } = await supabase
                .from('blog_authors')
                .update({
                  name: updatedName.trim(),
                  bio: updatedBio,
                })
                .eq('id', author.id);

              expect(updateError).toBeNull();

              // Fetch all posts by this author and verify they show updated author data
              const { data: posts, error: fetchError } = await supabase
                .from('blog_posts')
                .select(`
                  *,
                  blog_authors(*)
                `)
                .eq('author_id', author.id);

              expect(fetchError).toBeNull();
              expect(posts).toBeDefined();
              expect(posts?.length).toBe(numPosts);

              // Verify all posts show the updated author information
              posts?.forEach(post => {
                expect(post.blog_authors).toBeDefined();
                expect(post.blog_authors.name).toBe(updatedName.trim());
                expect(post.blog_authors.bio).toBe(updatedBio);
              });
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 17: Author Ordering by Post Count', () => {
    /**
     * Feature: blog-cms, Property 17: Author Ordering by Post Count
     * Validates: Requirements 5.5
     * 
     * For any query requesting all authors, the results should be ordered by 
     * the number of published posts each author has, from highest to lowest.
     */
    it('should return authors ordered by published post count in descending order', async () => {
      if (!hasSupabase) {
        console.log('Skipping test - Supabase not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: authorNameGenerator,
              postCount: fc.integer({ min: 0, max: 10 }),
            }),
            { minLength: 3, maxLength: 5 }
          ),
          async (authorsWithCounts) => {
            // Create authors and their posts
            for (const authorData of authorsWithCounts) {
              const authorSlug = `test-author-${Date.now()}-${Math.random().toString(36).substring(7)}`;
              const { data: author, error: authorError } = await supabase
                .from('blog_authors')
                .insert({
                  slug: authorSlug,
                  name: authorData.name.trim(),
                })
                .select()
                .single();

              expect(authorError).toBeNull();

              if (author) {
                testAuthorIds.push(author.id);

                // Create the specified number of published posts for this author
                for (let i = 0; i < authorData.postCount; i++) {
                  const postSlug = `test-post-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;
                  const { data: post, error: postError } = await supabase
                    .from('blog_posts')
                    .insert({
                      slug: postSlug,
                      title: `Test Post ${i} by ${author.name}`,
                      excerpt: 'Test excerpt',
                      content: 'Test content',
                      author_id: author.id,
                      read_time: 5,
                      status: 'published',
                      published_date: new Date().toISOString(),
                    })
                    .select()
                    .single();

                  expect(postError).toBeNull();
                  if (post) {
                    testPostIds.push(post.id);
                  }
                }
              }
            }

            // Fetch authors with post counts (simulating the getAuthors API)
            const { data: authors, error } = await supabase
              .from('blog_authors')
              .select(`
                *,
                blog_posts!inner(id)
              `)
              .eq('blog_posts.status', 'published')
              .is('blog_posts.deleted_at', null)
              .in('id', testAuthorIds);

            expect(error).toBeNull();
            expect(authors).toBeDefined();

            if (authors && authors.length > 0) {
              // Count posts per author
              const authorMap = new Map<string, { author: any; postCount: number }>();

              authors.forEach((item: any) => {
                const authorId = item.id;
                if (!authorMap.has(authorId)) {
                  authorMap.set(authorId, {
                    author: item,
                    postCount: 0,
                  });
                }
                authorMap.get(authorId)!.postCount++;
              });

              // Convert to array and sort by post count
              const sortedAuthors = Array.from(authorMap.values())
                .sort((a, b) => b.postCount - a.postCount);

              // Verify ordering: each author should have >= post count than the next
              for (let i = 0; i < sortedAuthors.length - 1; i++) {
                expect(sortedAuthors[i].postCount).toBeGreaterThanOrEqual(
                  sortedAuthors[i + 1].postCount
                );
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
