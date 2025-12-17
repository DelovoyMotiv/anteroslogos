#!/usr/bin/env tsx
/**
 * Blog API Endpoints Testing Script
 * Tests all blog API endpoints to verify they're working correctly
 */

interface APITestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  message: string;
  responseTime?: number;
}

const apiResults: APITestResult[] = [];
const API_BASE_URL = process.env.TEST_BASE_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
const API_BASE = `${API_BASE_URL}/api`;

async function testEndpoint(
  method: string,
  endpoint: string,
  options: {
    requiresAuth?: boolean;
    authToken?: string;
    body?: any;
    expectedStatus?: number;
    description?: string;
  } = {}
): Promise<APITestResult> {
  const fullUrl = `${API_BASE}${endpoint}`;
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.authToken) headers['Authorization'] = `Bearer ${options.authToken}`;

    const fetchOptions: RequestInit = { method, headers };
    if (options.body) fetchOptions.body = JSON.stringify(options.body);

    const response = await fetch(fullUrl, fetchOptions);
    const responseTime = Date.now() - startTime;
    const expectedStatus = options.expectedStatus || 200;
    const status = response.status === expectedStatus ? 'PASS' : 'FAIL';

    let message = `${response.status} ${response.statusText}`;
    if (options.description) message = `${options.description}: ${message}`;

    return { endpoint: `${method} ${endpoint}`, method, status, statusCode: response.status, message, responseTime };
  } catch (error) {
    return { endpoint: `${method} ${endpoint}`, method, status: 'FAIL', message: `Error: ${error}` };
  }
}

async function testPublicEndpoints() {
  console.log('\n📋 Testing Public Blog API Endpoints...\n');
  apiResults.push(await testEndpoint('GET', '/blog/posts', { description: 'List all posts' }));
  apiResults.push(await testEndpoint('GET', '/blog/posts?page=1&limit=5', { description: 'List posts with pagination' }));
  apiResults.push(await testEndpoint('GET', '/blog/posts?status=published', { description: 'Filter posts by status' }));
  apiResults.push(await testEndpoint('GET', '/blog/posts/intro-to-geo', { description: 'Get specific post by slug', expectedStatus: 200 }));
  apiResults.push(await testEndpoint('GET', '/blog/authors', { description: 'List all authors' }));
  apiResults.push(await testEndpoint('GET', '/blog/authors/alex-svetolesov', { description: 'Get specific author by slug', expectedStatus: 200 }));
  apiResults.push(await testEndpoint('GET', '/blog/categories', { description: 'List all categories' }));
  apiResults.push(await testEndpoint('GET', '/blog/tags', { description: 'List all tags' }));
}

async function testAdminEndpoints(authToken?: string) {
  console.log('\n🔐 Testing Admin Blog API Endpoints...\n');

  if (!authToken) {
    console.log('⚠️  No auth token provided. Skipping admin endpoint tests.');
    console.log('   To test admin endpoints, set TEST_AUTH_TOKEN environment variable.');
    apiResults.push({ endpoint: 'Admin Endpoints', method: 'ALL', status: 'SKIP', message: 'No auth token provided' });
    return;
  }

  apiResults.push(await testEndpoint('POST', '/admin/blog/posts', {
    authToken,
    body: { title: 'Test Post', excerpt: 'Test excerpt', content: 'Test content', author_id: '00000000-0000-0000-0000-000000000000', read_time: 5, status: 'draft' },
    expectedStatus: 201,
    description: 'Create new post'
  }));

  apiResults.push(await testEndpoint('PUT', '/admin/blog/posts/test-id', {
    authToken,
    body: { title: 'Updated Test Post' },
    expectedStatus: 200,
    description: 'Update post'
  }));

  apiResults.push(await testEndpoint('DELETE', '/admin/blog/posts/test-id', {
    authToken,
    expectedStatus: 200,
    description: 'Delete post'
  }));

  apiResults.push(await testEndpoint('POST', '/admin/blog/authors', {
    authToken,
    body: { name: 'Test Author', slug: 'test-author-' + Date.now(), bio: 'Test bio' },
    expectedStatus: 201,
    description: 'Create author'
  }));

  apiResults.push(await testEndpoint('PUT', '/admin/blog/authors/test-id', {
    authToken,
    body: { name: 'Updated Test Author' },
    expectedStatus: 200,
    description: 'Update author'
  }));
}

function printAPIResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 API ENDPOINT TEST RESULTS');
  console.log('='.repeat(80));

  let passCount = 0, failCount = 0, skipCount = 0;

  for (const result of apiResults) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️ ';
    const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';
    console.log(`${icon} ${result.endpoint}${timeStr}`);
    console.log(`   ${result.message}`);
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else skipCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed, ${skipCount} skipped`);
  console.log('='.repeat(80));

  if (failCount === 0) {
    console.log('\n🎉 All API endpoint tests passed!');
    return 0;
  } else {
    console.log('\n⚠️  Some API endpoint tests failed. Please review the results above.');
    return 1;
  }
}

async function main() {
  console.log('🚀 Blog API Endpoints Testing');
  console.log('='.repeat(80));
  console.log(`Testing against: ${API_BASE_URL}`);

  const authToken = process.env.TEST_AUTH_TOKEN;
  await testPublicEndpoints();
  await testAdminEndpoints(authToken);
  const exitCode = printAPIResults();

  console.log('\n💡 Tips:');
  console.log('   - Set TEST_BASE_URL to test against a specific environment');
  console.log('   - Set TEST_AUTH_TOKEN to test admin endpoints');
  console.log('   - Example: TEST_BASE_URL=https://yourdomain.com npm run blog:test-api');

  process.exit(exitCode);
}

main();
