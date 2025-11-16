/**
 * Test OG Image from Social Media Crawler Perspective
 * Simulates how Twitter, Facebook, Telegram bots see the image
 */

import https from 'https';
import http from 'http';

interface CrawlerTest {
  name: string;
  userAgent: string;
}

const crawlers: CrawlerTest[] = [
  {
    name: 'Twitterbot',
    userAgent: 'Twitterbot/1.0',
  },
  {
    name: 'Telegram Bot',
    userAgent: 'TelegramBot (like TwitterBot)',
  },
  {
    name: 'Facebook Bot',
    userAgent: 'facebookexternalhit/1.1',
  },
  {
    name: 'LinkedIn Bot',
    userAgent: 'LinkedInBot/1.0',
  },
  {
    name: 'WhatsApp',
    userAgent: 'WhatsApp/2.0',
  },
  {
    name: 'Discord Bot',
    userAgent: 'Mozilla/5.0 (compatible; Discordbot/2.0)',
  },
];

function testImageURL(url: string, userAgent: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      headers: {
        'User-Agent': userAgent,
      },
    };

    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        redirected: res.headers.location ? true : false,
        location: res.headers.location,
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  const imageURL = 'https://anoteroslogos.com/images/og-image.jpg?v=2';
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Open Graph Image Crawler Test                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`Testing URL: ${imageURL}\n`);

  for (const crawler of crawlers) {
    try {
      console.log(`🤖 ${crawler.name}`);
      console.log(`   User-Agent: ${crawler.userAgent}`);
      
      const result = await testImageURL(imageURL, crawler.userAgent);
      
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Content-Type: ${result.headers['content-type']}`);
      console.log(`   Content-Length: ${result.headers['content-length']} bytes`);
      console.log(`   Cache-Control: ${result.headers['cache-control']}`);
      
      if (result.redirected) {
        console.log(`   ⚠️  Redirect to: ${result.location}`);
      }

      if (result.statusCode === 200) {
        console.log('   ✅ SUCCESS\n');
      } else {
        console.log(`   ❌ FAILED (status ${result.statusCode})\n`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}\n`);
    }
  }

  // Test HTML page for meta tags
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📄 Testing HTML Meta Tags\n');

  try {
    const pageURL = 'https://anoteroslogos.com/';
    console.log(`Fetching: ${pageURL}`);
    
    const htmlResult = await testImageURL(pageURL, 'Twitterbot/1.0');
    console.log(`Status: ${htmlResult.statusCode}`);
    console.log(`Content-Type: ${htmlResult.headers['content-type']}`);
    
    if (htmlResult.statusCode === 200) {
      console.log('✅ Page accessible\n');
    } else {
      console.log(`❌ Page returned ${htmlResult.statusCode}\n`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error}\n`);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Next Steps                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('1. Verify Twitter Card: https://cards-dev.twitter.com/validator');
  console.log('2. Check Facebook: https://developers.facebook.com/tools/debug/');
  console.log('3. Test Telegram: Paste link in any chat');
  console.log('4. Clear caches if image was previously 404');
  console.log('\nNote: Query parameter ?v=2 forces cache refresh\n');
}

runTests().catch(console.error);
