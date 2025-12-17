/**
 * Blog Data Migration Script
 * Migrates existing blog posts from data/blogPosts.ts to Supabase database
 * 
 * Usage: npx tsx scripts/migrate-blog-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { BLOG_POSTS, BlogPost, BlogAuthor } from '../data/blogPosts';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Migration result tracking
interface MigrationResult {
  success: boolean;
  entity: string;
  id?: string;
  slug?: string;
  error?: string;
}

interface MigrationReport {
  authors: {
    total: number;
    successful: number;
    failed: number;
    results: MigrationResult[];
  };
  categories: {
    total: number;
    successful: number;
    failed: number;
    results: MigrationResult[];
  };
  tags: {
    total: number;
    successful: number;
    failed: number;
    results: MigrationResult[];
  };
  posts: {
    total: number;
    successful: number;
    failed: number;
    results: MigrationResult[];
  };
}

/**
 * Read blog posts from data file
 * This function is a wrapper for accessing the imported data
 */
function readBlogPosts(): BlogPost[] {
  return BLOG_POSTS;
}

/**
 * Transform blog post data to database format
 * Converts from file format to database schema format
 */
function transformPostToDbFormat(post: BlogPost, authorId: string, categoryId: string | null) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    author_id: authorId,
    category_id: categoryId,
    featured: post.featured || false,
    status: 'published' as const,
    published_date: post.publishedDate,
    modified_date: post.modifiedDate,
    read_time: post.readTime,
    meta_description: post.seo?.metaDescription || null,
    meta_keywords: post.seo?.keywords || null,
    og_image_url: post.seo?.ogImage || post.image || null,
  };
}

/**
 * Insert a single post with error handling
 * Returns success/failure result
 */
async function insertPost(
  postData: ReturnType<typeof transformPostToDbFormat>,
  originalSlug: string
): Promise<MigrationResult> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(postData)
      .select('id, slug')
      .single();

    if (error) {
      return {
        success: false,
        entity: 'post',
        slug: originalSlug,
        error: error.message,
      };
    }

    return {
      success: true,
      entity: 'post',
      id: data.id,
      slug: data.slug,
    };
  } catch (err) {
    return {
      success: false,
      entity: 'post',
      slug: originalSlug,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Main migration function
 */
async function migrateBlogData(): Promise<MigrationReport> {
  console.log('🚀 Starting blog data migration...\n');

  const report: MigrationReport = {
    authors: { total: 0, successful: 0, failed: 0, results: [] },
    categories: { total: 0, successful: 0, failed: 0, results: [] },
    tags: { total: 0, successful: 0, failed: 0, results: [] },
    posts: { total: 0, successful: 0, failed: 0, results: [] },
  };

  // Read blog posts from data file
  const posts = readBlogPosts();
  console.log(`📚 Found ${posts.length} blog posts to migrate\n`);

  // Extract unique authors
  const uniqueAuthors = new Map<string, BlogAuthor>();
  posts.forEach(post => {
    if (!uniqueAuthors.has(post.author.slug)) {
      uniqueAuthors.set(post.author.slug, post.author);
    }
  });

  // Extract unique categories
  const uniqueCategories = new Set<string>();
  posts.forEach(post => {
    uniqueCategories.add(post.category);
  });

  // Extract unique tags
  const uniqueTags = new Set<string>();
  posts.forEach(post => {
    post.tags.forEach(tag => uniqueTags.add(tag));
  });

  console.log(`👤 Found ${uniqueAuthors.size} unique authors`);
  console.log(`📁 Found ${uniqueCategories.size} unique categories`);
  console.log(`🏷️  Found ${uniqueTags.size} unique tags\n`);

  // Migrate authors
  console.log('Migrating authors...');
  const authorIdMap = new Map<string, string>();
  report.authors.total = uniqueAuthors.size;

  for (const [slug, author] of uniqueAuthors) {
    try {
      const { data, error } = await supabase
        .from('blog_authors')
        .insert({
          slug: author.slug,
          name: author.name,
          bio: author.bio || null,
          image_url: author.image || null,
          email: null,
          job_title: null,
          expertise: null,
          knows_about: null,
        })
        .select('id, slug')
        .single();

      if (error) {
        report.authors.failed++;
        report.authors.results.push({
          success: false,
          entity: 'author',
          slug,
          error: error.message,
        });
        console.log(`  ❌ Failed to migrate author: ${author.name} - ${error.message}`);
      } else {
        report.authors.successful++;
        authorIdMap.set(slug, data.id);
        report.authors.results.push({
          success: true,
          entity: 'author',
          id: data.id,
          slug: data.slug,
        });
        console.log(`  ✅ Migrated author: ${author.name}`);
      }
    } catch (err) {
      report.authors.failed++;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      report.authors.results.push({
        success: false,
        entity: 'author',
        slug,
        error: errorMsg,
      });
      console.log(`  ❌ Failed to migrate author: ${author.name} - ${errorMsg}`);
    }
  }

  console.log(`\n✨ Authors: ${report.authors.successful}/${report.authors.total} successful\n`);

  // Migrate categories
  console.log('Migrating categories...');
  const categoryIdMap = new Map<string, string>();
  report.categories.total = uniqueCategories.size;

  const categoryDescriptions: Record<string, string> = {
    'GEO Fundamentals': 'Core concepts and principles of Generative Engine Optimization',
    'Methodology': 'Frameworks, processes, and systematic approaches to GEO',
    'E-E-A-T': 'Building Experience, Expertise, Authoritativeness, and Trust signals',
    'Technical GEO': 'Technical implementation, schemas, and infrastructure for GEO',
  };

  let displayOrder = 0;
  for (const categoryName of uniqueCategories) {
    const categorySlug = categoryName.toLowerCase().replace(/\s+/g, '-');
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .insert({
          slug: categorySlug,
          name: categoryName,
          description: categoryDescriptions[categoryName] || null,
          display_order: displayOrder++,
        })
        .select('id, slug')
        .single();

      if (error) {
        report.categories.failed++;
        report.categories.results.push({
          success: false,
          entity: 'category',
          slug: categorySlug,
          error: error.message,
        });
        console.log(`  ❌ Failed to migrate category: ${categoryName} - ${error.message}`);
      } else {
        report.categories.successful++;
        categoryIdMap.set(categoryName, data.id);
        report.categories.results.push({
          success: true,
          entity: 'category',
          id: data.id,
          slug: data.slug,
        });
        console.log(`  ✅ Migrated category: ${categoryName}`);
      }
    } catch (err) {
      report.categories.failed++;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      report.categories.results.push({
        success: false,
        entity: 'category',
        slug: categorySlug,
        error: errorMsg,
      });
      console.log(`  ❌ Failed to migrate category: ${categoryName} - ${errorMsg}`);
    }
  }

  console.log(`\n✨ Categories: ${report.categories.successful}/${report.categories.total} successful\n`);

  // Migrate tags
  console.log('Migrating tags...');
  const tagIdMap = new Map<string, string>();
  report.tags.total = uniqueTags.size;

  for (const tagName of uniqueTags) {
    const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
    try {
      const { data, error } = await supabase
        .from('blog_tags')
        .insert({
          name: tagName,
          slug: tagSlug,
        })
        .select('id, slug')
        .single();

      if (error) {
        report.tags.failed++;
        report.tags.results.push({
          success: false,
          entity: 'tag',
          slug: tagSlug,
          error: error.message,
        });
        console.log(`  ❌ Failed to migrate tag: ${tagName} - ${error.message}`);
      } else {
        report.tags.successful++;
        tagIdMap.set(tagName, data.id);
        report.tags.results.push({
          success: true,
          entity: 'tag',
          id: data.id,
          slug: data.slug,
        });
        console.log(`  ✅ Migrated tag: ${tagName}`);
      }
    } catch (err) {
      report.tags.failed++;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      report.tags.results.push({
        success: false,
        entity: 'tag',
        slug: tagSlug,
        error: errorMsg,
      });
      console.log(`  ❌ Failed to migrate tag: ${tagName} - ${errorMsg}`);
    }
  }

  console.log(`\n✨ Tags: ${report.tags.successful}/${report.tags.total} successful\n`);

  // Migrate blog posts
  console.log('Migrating blog posts...');
  report.posts.total = posts.length;

  for (const post of posts) {
    const authorId = authorIdMap.get(post.author.slug);
    const categoryId = categoryIdMap.get(post.category) || null;

    if (!authorId) {
      report.posts.failed++;
      report.posts.results.push({
        success: false,
        entity: 'post',
        slug: post.slug,
        error: `Author not found: ${post.author.slug}`,
      });
      console.log(`  ❌ Failed to migrate post: ${post.title} - Author not found`);
      continue;
    }

    const postData = transformPostToDbFormat(post, authorId, categoryId);
    const result = await insertPost(postData, post.slug);

    if (result.success) {
      report.posts.successful++;
      console.log(`  ✅ Migrated post: ${post.title}`);

      // Create post-tag relationships
      const postId = result.id!;
      for (const tagName of post.tags) {
        const tagId = tagIdMap.get(tagName);
        if (tagId) {
          try {
            await supabase
              .from('blog_post_tags')
              .insert({
                post_id: postId,
                tag_id: tagId,
              });
          } catch (err) {
            console.log(`    ⚠️  Failed to link tag "${tagName}" to post`);
          }
        }
      }
    } else {
      report.posts.failed++;
      report.posts.results.push(result);
      console.log(`  ❌ Failed to migrate post: ${post.title} - ${result.error}`);
    }
  }

  console.log(`\n✨ Posts: ${report.posts.successful}/${report.posts.total} successful\n`);

  return report;
}

/**
 * Generate and display migration report
 */
function displayReport(report: MigrationReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60) + '\n');

  console.log('Authors:');
  console.log(`  Total: ${report.authors.total}`);
  console.log(`  ✅ Successful: ${report.authors.successful}`);
  console.log(`  ❌ Failed: ${report.authors.failed}`);

  console.log('\nCategories:');
  console.log(`  Total: ${report.categories.total}`);
  console.log(`  ✅ Successful: ${report.categories.successful}`);
  console.log(`  ❌ Failed: ${report.categories.failed}`);

  console.log('\nTags:');
  console.log(`  Total: ${report.tags.total}`);
  console.log(`  ✅ Successful: ${report.tags.successful}`);
  console.log(`  ❌ Failed: ${report.tags.failed}`);

  console.log('\nBlog Posts:');
  console.log(`  Total: ${report.posts.total}`);
  console.log(`  ✅ Successful: ${report.posts.successful}`);
  console.log(`  ❌ Failed: ${report.posts.failed}`);

  // Display errors if any
  const allErrors = [
    ...report.authors.results.filter(r => !r.success),
    ...report.categories.results.filter(r => !r.success),
    ...report.tags.results.filter(r => !r.success),
    ...report.posts.results.filter(r => !r.success),
  ];

  if (allErrors.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERRORS');
    console.log('='.repeat(60) + '\n');

    allErrors.forEach(error => {
      console.log(`${error.entity.toUpperCase()}: ${error.slug || 'unknown'}`);
      console.log(`  Error: ${error.error}\n`);
    });
  }

  console.log('='.repeat(60));
  console.log('✨ Migration complete!');
  console.log('='.repeat(60) + '\n');
}

// Run migration
migrateBlogData()
  .then(report => {
    displayReport(report);
    const totalFailed = report.authors.failed + report.categories.failed + report.tags.failed + report.posts.failed;
    process.exit(totalFailed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed with error:');
    console.error(error);
    process.exit(1);
  });
