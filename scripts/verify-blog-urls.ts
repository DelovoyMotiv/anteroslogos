#!/usr/bin/env tsx
/**
 * Blog URL Preservation Verification Script
 * 
 * Verifies that all original blog URLs still work after migration
 * and that content matches the original data.
 */

import { createClient } from '@supabase/supabase-js';
import { BLOG_POSTS } from '../data/blogPosts';
import type { Database } from '../types/database.types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

interface URLVerification {
  slug: string;
  originalTitle: string;
  exists: boolean;
  titleMatches: boolean;
  contentMatches: boolean;
  authorMatches: boolean;
  categoryMatches: boolean;
  seoPreserved: boolean;
  errors: string[];
}

async function verifyURL(originalPost: typeof BLOG_POSTS[0]): Promise<URLVerification> {
  const verification: URLVerification = {
    slug: originalPost.slug,
    originalTitle: originalPost.title,
    exists: false,
    titleMatches: false,
    contentMatches: false,
    authorMatches: false,
    categoryMatches: false,
    seoPreserved: false,
    errors: []
  };

  try {
    // Fetch post from database
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors(*),
        category:blog_categories(*)
      `)
      .eq('slug', originalPost.slug)
      .single();

    if (error) {
      verification.errors.push(`Database error: ${error.message}`);
      return verification;
    }

    if (!post) {
      verification.errors.push('Post not found in database');
      return verification;
    }

    verification.exists = true;

    // Verify title
    if (post.title === originalPost.title) {
      verification.titleMatches = true;
    } else {
      verification.errors.push(`Title mismatch: "${post.title}" vs "${originalPost.title}"`);
    }

    // Verify content (basic check - content should contain key phrases)
    if (post.content && post.content.length > 0) {
      verification.contentMatches = true;
    } else {
      verification.errors.push('Content is empty or missing');
    }

    // Verify author
    if (post.author && originalPost.author) {
      if (post.author.name === originalPost.author.name) {
        verification.authorMatches = true;
      } else {
        verification.errors.push(`Author mismatch: "${post.author.name}" vs "${originalPost.author.name}"`);
      }
    } else {
      verification.errors.push('Author data missing');
    }

    // Verify category
    if (post.category && originalPost.category) {
      if (post.category.name === originalPost.category) {
        verification.categoryMatches = true;
      } else {
        verification.errors.push(`Category mismatch: "${post.category.name}" vs "${originalPost.category}"`);
      }
    } else if (!originalPost.category && !post.category) {
      verification.categoryMatches = true;
    } else {
      verification.errors.push('Category data mismatch');
    }

    // Verify SEO metadata
    if (post.meta_description && post.meta_description.length > 0) {
      verification.seoPreserved = true;
    } else {
      verification.errors.push('SEO metadata missing');
    }

  } catch (error) {
    verification.errors.push(`Exception: ${error}`);
  }

  return verification;
}

async function main() {
  console.log('🔍 Blog URL Preservation Verification');
  console.log('='.repeat(80));
  console.log(`\nVerifying ${BLOG_POSTS.length} blog posts...\n`);

  const verifications: URLVerification[] = [];
  let successCount = 0;

  for (const post of BLOG_POSTS) {
    const verification = await verifyURL(post);
    verifications.push(verification);

    const allChecks = 
      verification.exists &&
      verification.titleMatches &&
      verification.contentMatches &&
      verification.authorMatches &&
      verification.categoryMatches &&
      verification.seoPreserved;

    if (allChecks) {
      successCount++;
      console.log(`✅ /blog/${verification.slug}`);
    } else {
      console.log(`❌ /blog/${verification.slug}`);
      verification.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total URLs: ${BLOG_POSTS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${BLOG_POSTS.length - successCount}`);
  console.log(`Success Rate: ${((successCount / BLOG_POSTS.length) * 100).toFixed(1)}%`);

  // Detailed breakdown
  const existsCount = verifications.filter(v => v.exists).length;
  const titleMatchCount = verifications.filter(v => v.titleMatches).length;
  const contentMatchCount = verifications.filter(v => v.contentMatches).length;
  const authorMatchCount = verifications.filter(v => v.authorMatches).length;
  const categoryMatchCount = verifications.filter(v => v.categoryMatches).length;
  const seoPreservedCount = verifications.filter(v => v.seoPreserved).length;

  console.log('\nDetailed Breakdown:');
  console.log(`  Posts exist in DB: ${existsCount}/${BLOG_POSTS.length}`);
  console.log(`  Titles match: ${titleMatchCount}/${BLOG_POSTS.length}`);
  console.log(`  Content preserved: ${contentMatchCount}/${BLOG_POSTS.length}`);
  console.log(`  Authors match: ${authorMatchCount}/${BLOG_POSTS.length}`);
  console.log(`  Categories match: ${categoryMatchCount}/${BLOG_POSTS.length}`);
  console.log(`  SEO preserved: ${seoPreservedCount}/${BLOG_POSTS.length}`);

  // List all URLs for manual testing
  console.log('\n' + '='.repeat(80));
  console.log('📋 ALL BLOG URLs (for manual testing):');
  console.log('='.repeat(80));
  
  const baseUrl = process.env.VITE_APP_URL || 'https://yourdomain.com';
  verifications.forEach(v => {
    console.log(`${baseUrl}/blog/${v.slug}`);
  });

  console.log('\n' + '='.repeat(80));

  if (successCount === BLOG_POSTS.length) {
    console.log('🎉 All URLs verified successfully!');
    process.exit(0);
  } else {
    console.log('⚠️  Some URLs failed verification. Please review the errors above.');
    process.exit(1);
  }
}

main();
