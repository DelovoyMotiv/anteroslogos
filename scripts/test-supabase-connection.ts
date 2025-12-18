/**
 * Test Supabase connection and blog API queries
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  // Get env vars
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('Environment variables:');
  console.log(`- SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log();

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  // Create client
  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });

  console.log('✅ Supabase client created\n');

  // Test 1: Fetch categories
  console.log('Test 1: Fetching categories...');
  try {
    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Success! Found ${categories?.length || 0} categories`);
      if (categories && categories.length > 0) {
        console.log('First category:', categories[0]);
      }
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
  console.log();

  // Test 2: Fetch posts
  console.log('Test 2: Fetching published posts...');
  try {
    const { data: posts, error, count } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status', { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null)
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Success! Found ${count} total posts`);
      console.log(`First 5 posts:`, posts);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
  console.log();

  // Test 3: Fetch authors
  console.log('Test 3: Fetching authors...');
  try {
    const { data: authors, error } = await supabase
      .from('blog_authors')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Success! Found ${authors?.length || 0} authors`);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
  console.log();

  // Test 4: Fetch tags
  console.log('Test 4: Fetching tags...');
  try {
    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Success! Found ${tags?.length || 0} tags`);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }

  console.log('\n✅ All tests completed!');
}

testConnection().catch(console.error);
