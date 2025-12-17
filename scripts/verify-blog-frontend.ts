#!/usr/bin/env tsx
/**
 * Blog Frontend Verification Script
 * 
 * Verifies that all blog frontend pages are working correctly
 * Tests routing, data loading, and component rendering
 */

interface FrontendPageTest {
  url: string;
  description: string;
  expectedElements: string[];
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  responseTime?: number;
}

const frontendResults: FrontendPageTest[] = [];

// Get base URL from environment or use default
const FRONTEND_BASE_URL = process.env.TEST_BASE_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

async function testPage(
  path: string,
  description: string,
  checks: {
    expectedStatus?: number;
    expectedElements?: string[];
    shouldContain?: string[];
  } = {}
): Promise<FrontendPageTest> {
  const url = `${FRONTEND_BASE_URL}${path}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    const html = await response.text();

    const expectedStatus = checks.expectedStatus || 200;
    let passed = response.status === expectedStatus;
    let message = `${response.status} ${response.statusText}`;

    // Check for expected content
    if (checks.shouldContain && passed) {
      for (const content of checks.shouldContain) {
        if (!html.includes(content)) {
          passed = false;
          message += ` - Missing: "${content}"`;
        }
      }
    }

    return {
      url: path,
      description,
      expectedElements: checks.expectedElements || [],
      status: passed ? 'PASS' : 'FAIL',
      message,
      responseTime,
    };
  } catch (error) {
    return {
      url: path,
      description,
      expectedElements: [],
      status: 'FAIL',
      message: `Error: ${error}`,
    };
  }
}

async function testBlogPages() {
  console.log('\n📄 Testing Blog Frontend Pages...\n');

  // Test blog listing page
  frontendResults.push(
    await testPage('/blog', 'Blog listing page', {
      shouldContain: ['blog', 'posts'],
    })
  );

  // Test blog post page (using a known slug)
  frontendResults.push(
    await testPage('/blog/intro-to-geo', 'Blog post page (intro-to-geo)', {
      expectedStatus: 200, // or 404 if not migrated
    })
  );

  // Test another blog post
  frontendResults.push(
    await testPage('/blog/geo-vs-seo', 'Blog post page (geo-vs-seo)', {
      expectedStatus: 200, // or 404 if not migrated
    })
  );

  // Test author page
  frontendResults.push(
    await testPage('/author/alex-svetolesov', 'Author page', {
      expectedStatus: 200, // or 404 if not migrated
    })
  );

  // Test 404 for non-existent post
  frontendResults.push(
    await testPage('/blog/non-existent-post-12345', 'Non-existent post (should 404)', {
      expectedStatus: 404,
    })
  );
}

async function testAdminPages() {
  console.log('\n🔐 Testing Admin Panel Pages...\n');

  // Test admin blog page (should redirect to login or show access denied)
  frontendResults.push(
    await testPage('/admin/blog', 'Admin blog dashboard', {
      expectedStatus: 200, // or 401/403 if not logged in
    })
  );

  // Test admin new post page
  frontendResults.push(
    await testPage('/admin/blog/new', 'Admin new post page', {
      expectedStatus: 200, // or 401/403 if not logged in
    })
  );

  // Test admin edit post page
  frontendResults.push(
    await testPage('/admin/blog/edit/test-id', 'Admin edit post page', {
      expectedStatus: 200, // or 401/403/404
    })
  );

  // Test admin authors page
  frontendResults.push(
    await testPage('/admin/blog/authors', 'Admin authors page', {
      expectedStatus: 200, // or 401/403
    })
  );

  // Test admin categories page
  frontendResults.push(
    await testPage('/admin/blog/categories', 'Admin categories page', {
      expectedStatus: 200, // or 401/403
    })
  );
}

function printFrontendResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FRONTEND PAGE TEST RESULTS');
  console.log('='.repeat(80));

  let passCount = 0;
  let failCount = 0;

  for (const result of frontendResults) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
    
    console.log(`${icon} ${result.url}${timeStr}`);
    console.log(`   ${result.description}: ${result.message}`);

    if (result.status === 'PASS') passCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(80));

  if (failCount === 0) {
    console.log('\n🎉 All frontend page tests passed!');
    return 0;
  } else {
    console.log('\n⚠️  Some frontend page tests failed. Please review the results above.');
    return 1;
  }
}

async function main() {
  console.log('🚀 Blog Frontend Verification');
  console.log('='.repeat(80));
  console.log(`Testing against: ${FRONTEND_BASE_URL}`);
  console.log('\n⚠️  Note: Some tests may fail if data migration has not been run yet.');

  await testBlogPages();
  await testAdminPages();

  const exitCode = printFrontendResults();

  console.log('\n💡 Tips:');
  console.log('   - Set TEST_BASE_URL to test against a specific environment');
  console.log('   - Example: TEST_BASE_URL=https://yourdomain.com npm run blog:test-frontend');
  console.log('   - Run data migration first: npm run blog:migrate');
  console.log('   - Some admin pages require authentication to test fully');

  process.exit(exitCode);
}

main();
