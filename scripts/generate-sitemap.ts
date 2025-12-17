/**
 * Generate sitemap.xml with dynamic blog posts from database
 * Includes all published blog posts with lastmod dates
 * Excludes draft and archived posts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface BlogPost {
  slug: string;
  modified_date: string;
}

interface Author {
  slug: string;
}

async function generateSitemap() {
  try {
    // Fetch all published blog posts
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('slug, modified_date')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_date', { ascending: false });

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    // Fetch all authors
    const { data: authors, error: authorsError } = await supabase
      .from('blog_authors')
      .select('slug');

    if (authorsError) {
      throw new Error(`Failed to fetch authors: ${authorsError.message}`);
    }

    // Generate sitemap XML
    const sitemap = generateSitemapXML(posts || [], authors || []);

    // Write to public/sitemap.xml
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');

    console.log(`✅ Sitemap generated successfully with ${posts?.length || 0} blog posts`);
    console.log(`📝 Written to: ${sitemapPath}`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

function generateSitemapXML(posts: BlogPost[], authors: Author[]): string {
  const now = new Date().toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Main Landing Page -->
  <url>
    <loc>https://anoteroslogos.com/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>https://anoteroslogos.com/logo.svg</image:loc>
      <image:title>Anóteros Lógos - Generative Engine Optimization</image:title>
    </image:image>
  </url>

  <!-- The Shift Section -->
  <url>
    <loc>https://anoteroslogos.com/#shift</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>

  <!-- Philosophy -->
  <url>
    <loc>https://anoteroslogos.com/#philosophy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>

  <!-- Nicosia Method -->
  <url>
    <loc>https://anoteroslogos.com/#nicosia-method</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.95</priority>
  </url>

  <!-- Client Profile -->
  <url>
    <loc>https://anoteroslogos.com/#clients</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Team -->
  <url>
    <loc>https://anoteroslogos.com/#team</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>

  <!-- FAQ Section -->
  <url>
    <loc>https://anoteroslogos.com/#faq</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Contact -->
  <url>
    <loc>https://anoteroslogos.com/#contact</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Pricing Page -->
  <url>
    <loc>https://anoteroslogos.com/pricing</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.95</priority>
  </url>

  <!-- Knowledge Base - Comprehensive GEO Glossary -->
  <url>
    <loc>https://anoteroslogos.com/knowledge-base</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>

  <!-- GEO vs SEO Comparison -->
  <url>
    <loc>https://anoteroslogos.com/knowledge-base/geo-vs-seo</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Method Page -->
  <url>
    <loc>https://anoteroslogos.com/method</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Investor Relations - Market Analysis -->
  <url>
    <loc>https://anoteroslogos.com/investors</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Agent Identity & Discovery (AID) Protocol -->
  <url>
    <loc>https://anoteroslogos.com/agent-identity</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.95</priority>
  </url>

  <!-- Blog Index -->
  <url>
    <loc>https://anoteroslogos.com/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Blog Posts - Dynamic from Database -->
${posts.map(post => `  <url>
    <loc>https://anoteroslogos.com/blog/${post.slug}</loc>
    <lastmod>${post.modified_date.split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')}

  <!-- Author Pages - Dynamic from Database -->
${authors.map(author => `  <url>
    <loc>https://anoteroslogos.com/author/${author.slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n')}

  <!-- Privacy Policy -->
  <url>
    <loc>https://anoteroslogos.com/privacy-policy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- Cookie Policy -->
  <url>
    <loc>https://anoteroslogos.com/cookie-policy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>

</urlset>
`;
}

// Run the script
generateSitemap();
