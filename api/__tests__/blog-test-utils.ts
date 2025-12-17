/**
 * Test Utilities for Blog CMS Property-Based Testing
 * 
 * This module provides helper functions for setting up and tearing down
 * test data, as well as common assertions.
 * 
 * @module api/__tests__/blog-test-utils.ts
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a test author in the database
 * Returns the author ID for use in tests
 */
export async function createTestAuthor(
  supabase: SupabaseClient,
  data: {
    slug: string;
    name: string;
    bio?: string;
    image_url?: string;
    email?: string;
    job_title?: string;
    expertise?: string[];
    knows_about?: string[];
  }
): Promise<string> {
  const { data: author, error } = await supabase
    .from('blog_authors')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test author: ${error.message}`);
  }

  return author.id;
}

/**
 * Creates a test category in the database
 * Returns the category ID for use in tests
 */
export async function createTestCategory(
  supabase: SupabaseClient,
  data: {
    slug: string;
    name: string;
    description?: string;
    display_order?: number;
  }
): Promise<string> {
  const { data: category, error } = await supabase
    .from('blog_categories')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test category: ${error.message}`);
  }

  return category.id;
}

/**
 * Creates a test tag in the database
 * Returns the tag ID for use in tests
 */
export async function createTestTag(
  supabase: SupabaseClient,
  data: {
    name: string;
    slug: string;
  }
): Promise<string> {
  const { data: tag, error } = await supabase
    .from('blog_tags')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test tag: ${error.message}`);
  }

  return tag.id;
}

/**
 * Creates a test blog post in the database
 * Returns the post ID for use in tests
 */
export async function createTestPost(
  supabase: SupabaseClient,
  data: any
): Promise<string> {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert(data)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test post: ${error.message}`);
  }

  return post.id;
}

/**
 * Deletes all test data matching a pattern
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  options: {
    postSlugPattern?: string;
    authorSlugPattern?: string;
    categorySlugPattern?: string;
    tagSlugPattern?: string;
  }
): Promise<void> {
  const errors: string[] = [];

  // Clean up posts first (due to foreign key constraints)
  if (options.postSlugPattern) {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .like('slug', options.postSlugPattern);
    
    if (error) {
      errors.push(`Failed to delete posts: ${error.message}`);
    }
  }

  // Clean up authors
  if (options.authorSlugPattern) {
    const { error } = await supabase
      .from('blog_authors')
      .delete()
      .like('slug', options.authorSlugPattern);
    
    if (error) {
      errors.push(`Failed to delete authors: ${error.message}`);
    }
  }

  // Clean up categories
  if (options.categorySlugPattern) {
    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .like('slug', options.categorySlugPattern);
    
    if (error) {
      errors.push(`Failed to delete categories: ${error.message}`);
    }
  }

  // Clean up tags
  if (options.tagSlugPattern) {
    const { error } = await supabase
      .from('blog_tags')
      .delete()
      .like('slug', options.tagSlugPattern);
    
    if (error) {
      errors.push(`Failed to delete tags: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Cleanup warnings:', errors.join('; '));
  }
}

/**
 * Deletes specific records by ID
 */
export async function deleteTestRecords(
  supabase: SupabaseClient,
  table: 'blog_posts' | 'blog_authors' | 'blog_categories' | 'blog_tags',
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await supabase
    .from(table)
    .delete()
    .in('id', ids);

  if (error) {
    console.warn(`Failed to delete ${table}:`, error.message);
  }
}

/**
 * Verifies that a blog post has all required fields
 */
export function assertValidBlogPost(post: any): void {
  if (!post) {
    throw new Error('Post is null or undefined');
  }

  const requiredFields = [
    'id',
    'slug',
    'title',
    'excerpt',
    'content',
    'author_id',
    'status',
    'read_time',
    'created_at',
    'updated_at',
  ];

  for (const field of requiredFields) {
    if (post[field] === undefined || post[field] === null) {
      throw new Error(`Post is missing required field: ${field}`);
    }
  }

  // Validate status enum
  if (!['draft', 'published', 'archived'].includes(post.status)) {
    throw new Error(`Invalid status: ${post.status}`);
  }

  // Validate read_time is positive
  if (post.read_time <= 0) {
    throw new Error(`Invalid read_time: ${post.read_time}`);
  }
}

/**
 * Verifies that a blog author has all required fields
 */
export function assertValidBlogAuthor(author: any): void {
  if (!author) {
    throw new Error('Author is null or undefined');
  }

  const requiredFields = ['id', 'slug', 'name', 'created_at', 'updated_at'];

  for (const field of requiredFields) {
    if (author[field] === undefined || author[field] === null) {
      throw new Error(`Author is missing required field: ${field}`);
    }
  }
}

/**
 * Verifies that a blog category has all required fields
 */
export function assertValidBlogCategory(category: any): void {
  if (!category) {
    throw new Error('Category is null or undefined');
  }

  const requiredFields = ['id', 'slug', 'name', 'created_at', 'updated_at'];

  for (const field of requiredFields) {
    if (category[field] === undefined || category[field] === null) {
      throw new Error(`Category is missing required field: ${field}`);
    }
  }
}

/**
 * Verifies that a blog tag has all required fields
 */
export function assertValidBlogTag(tag: any): void {
  if (!tag) {
    throw new Error('Tag is null or undefined');
  }

  const requiredFields = ['id', 'name', 'slug', 'created_at'];

  for (const field of requiredFields) {
    if (tag[field] === undefined || tag[field] === null) {
      throw new Error(`Tag is missing required field: ${field}`);
    }
  }
}

/**
 * Compares two objects for equality, ignoring specified fields
 */
export function assertObjectsEqual(
  obj1: any,
  obj2: any,
  ignoreFields: string[] = []
): void {
  const keys1 = Object.keys(obj1).filter(k => !ignoreFields.includes(k));
  const keys2 = Object.keys(obj2).filter(k => !ignoreFields.includes(k));

  if (keys1.length !== keys2.length) {
    throw new Error(
      `Objects have different number of fields: ${keys1.length} vs ${keys2.length}`
    );
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      // Handle array comparison
      if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
        if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          throw new Error(
            `Field ${key} differs: ${JSON.stringify(obj1[key])} vs ${JSON.stringify(obj2[key])}`
          );
        }
      } else {
        throw new Error(`Field ${key} differs: ${obj1[key]} vs ${obj2[key]}`);
      }
    }
  }
}

/**
 * Waits for a specified amount of time (for rate limiting, etc.)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a unique test identifier to avoid collisions
 */
export function generateTestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a complete test setup with author and optionally category
 * Returns IDs for use in creating posts
 */
export async function createTestSetup(
  supabase: SupabaseClient,
  options: {
    includeCategory?: boolean;
    authorSlug?: string;
    categorySlug?: string;
  } = {}
): Promise<{ authorId: string; categoryId?: string }> {
  const testId = generateTestId();
  
  // Create author
  const authorSlug = options.authorSlug || `test-author-${testId}`;
  const authorId = await createTestAuthor(supabase, {
    slug: authorSlug,
    name: `Test Author ${testId}`,
    bio: 'Test author bio',
  });

  // Create category if requested
  let categoryId: string | undefined;
  if (options.includeCategory) {
    const categorySlug = options.categorySlug || `test-category-${testId}`;
    categoryId = await createTestCategory(supabase, {
      slug: categorySlug,
      name: `Test Category ${testId}`,
      description: 'Test category description',
      display_order: 0,
    });
  }

  return { authorId, categoryId };
}
