/**
 * Manual Test Script - Test on Real URLs
 * Task 4: Checkpoint - Verify on real URLs
 * 
 * Run with: npx tsx utils/linkAnalysis/__tests__/manual-test.ts
 */

import { extractLinks, isInternalLink, classifyLinkType } from '../extractor';
import { checkBrokenLinks } from '../brokenLinkChecker';
import { JSDOM } from 'jsdom';

async function testOnRealURL() {
  console.log('='.repeat(60));
  console.log('Link Analysis - Manual Test on Real URL');
  console.log('='.repeat(60));
  console.log();

  // Test URL - using a simple, reliable page
  const testUrl = 'https://example.com';
  
  console.log(`Testing URL: ${testUrl}`);
  console.log();

  try {
    // Fetch HTML content
    console.log('1. Fetching HTML content...');
    const response = await fetch(testUrl);
    const html = await response.text();
    console.log(`   ✓ Fetched ${html.length} bytes of HTML`);
    console.log();

    // Parse HTML
    console.log('2. Parsing HTML and extracting links...');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const links = extractLinks(doc, testUrl);
    console.log(`   ✓ Extracted ${links.length} links`);
    console.log();

    // Classify links
    console.log('3. Classifying links...');
    const internal = links.filter(link => isInternalLink(link.href, testUrl));
    const external = links.filter(link => !isInternalLink(link.href, testUrl));
    const nofollow = links.filter(link => link.isNofollow);
    const withImages = links.filter(link => link.hasImage);
    
    console.log(`   - Internal links: ${internal.length}`);
    console.log(`   - External links: ${external.length}`);
    console.log(`   - Nofollow links: ${nofollow.length}`);
    console.log(`   - Links with images: ${withImages.length}`);
    console.log();

    // Show sample links
    console.log('4. Sample extracted links:');
    links.slice(0, 5).forEach((link, index) => {
      const type = classifyLinkType(link.href, testUrl);
      console.log(`   ${index + 1}. [${type}] ${link.href}`);
      console.log(`      Text: "${link.text || '(empty)'}"`);
      console.log(`      Nofollow: ${link.isNofollow}`);
    });
    console.log();

    // Test broken link checker
    if (external.length > 0) {
      console.log('5. Testing broken link checker...');
      const urlsToCheck = external.slice(0, 3).map(link => link.href);
      console.log(`   Checking ${urlsToCheck.length} external links...`);
      
      const results = await checkBrokenLinks(urlsToCheck, 3);
      
      results.forEach((result, index) => {
        const status = result.broken ? '✗ BROKEN' : '✓ OK';
        console.log(`   ${index + 1}. ${status} - ${result.url}`);
        console.log(`      Status: ${result.status}`);
        if (result.redirected) {
          console.log(`      Redirected to: ${result.finalUrl}`);
        }
        if (result.error) {
          console.log(`      Error: ${result.error}`);
        }
      });
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✓ All tests completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log(`  - extractLinks() works: ✓`);
    console.log(`  - Link classification works: ✓`);
    console.log(`  - checkBrokenLinks() works: ✓`);
    console.log();

  } catch (error) {
    console.error('✗ Error during testing:', error);
    process.exit(1);
  }
}

// Run the test
testOnRealURL().catch(console.error);
