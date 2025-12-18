/**
 * Test script for category API endpoints
 * Run with: npx tsx scripts/test-category-api.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCategoryAPI() {
  console.log('🧪 Testing Category API...\n');

  // 1. Get session
  console.log('1. Getting session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error('❌ Not authenticated. Please log in first.');
    process.exit(1);
  }
  
  console.log('✅ Authenticated as:', session.user.email);

  // 2. Test create category
  console.log('\n2. Testing create category...');
  const categoryData = {
    name: 'Test Category API',
    slug: 'test-category-api',
    description: 'Test category created via API',
    display_order: 999,
  };

  try {
    const response = await fetch('http://localhost:5173/api/admin/blog?action=create-category', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(categoryData),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Category created:', data);
      
      // Clean up
      console.log('\n3. Cleaning up...');
      const deleteResponse = await fetch(`http://localhost:5173/api/admin/blog?action=delete-category&id=${data.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test category deleted');
      }
    } else {
      console.error('❌ Failed to create category');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCategoryAPI();
