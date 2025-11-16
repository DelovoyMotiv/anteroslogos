/**
 * Open Graph Tags Validator
 * Validates OG tags for social media previews
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tags: Record<string, string>;
}

const REQUIRED_OG_TAGS: string[] = [
  'og:title',
  'og:type',
  'og:url',
  'og:image',
  'og:description',
];

const REQUIRED_TWITTER_TAGS: string[] = [
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
];

const RECOMMENDED_OG_TAGS: string[] = [
  'og:site_name',
  'og:locale',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
];

async function validateOGTags(htmlPath: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    tags: {},
  };

  try {
    // Read HTML file
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const root = parse(html);

    // Extract all meta tags
    const metaTags = root.querySelectorAll('meta');

    // Collect OG tags
    metaTags.forEach((tag) => {
      const property = tag.getAttribute('property') || tag.getAttribute('name');
      const content = tag.getAttribute('content');
      if (property && content) {
        result.tags[property] = content;
      }
    });

    // Validate required OG tags
    REQUIRED_OG_TAGS.forEach((tag) => {
      if (!result.tags[tag]) {
        result.errors.push(`Missing required Open Graph tag: ${tag}`);
        result.valid = false;
      }
    });

    // Validate required Twitter tags
    REQUIRED_TWITTER_TAGS.forEach((tag) => {
      if (!result.tags[tag]) {
        result.errors.push(`Missing required Twitter Card tag: ${tag}`);
        result.valid = false;
      }
    });

    // Check recommended tags
    RECOMMENDED_OG_TAGS.forEach((tag) => {
      if (!result.tags[tag]) {
        result.warnings.push(`Missing recommended tag: ${tag}`);
      }
    });

    // Validate image URLs
    if (result.tags['og:image']) {
      const imageUrl = result.tags['og:image'];
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        result.errors.push(`OG image URL must be absolute: ${imageUrl}`);
        result.valid = false;
      }

      // Check if local image file exists
      if (imageUrl.includes('anoteroslogos.com')) {
        const imagePath = imageUrl.replace('https://anoteroslogos.com', '');
        const localImagePath = path.join(process.cwd(), 'public', imagePath);
        if (!fs.existsSync(localImagePath)) {
          result.errors.push(`OG image file not found: ${localImagePath}`);
          result.valid = false;
        } else {
          const stats = fs.statSync(localImagePath);
          const sizeKB = stats.size / 1024;
          if (sizeKB > 1024) {
            result.warnings.push(`OG image is large (${sizeKB.toFixed(2)} KB). Recommended: < 1 MB`);
          }
        }
      }
    }

    // Validate image dimensions
    if (result.tags['og:image:width'] && result.tags['og:image:height']) {
      const width = parseInt(result.tags['og:image:width']);
      const height = parseInt(result.tags['og:image:height']);
      
      // Facebook/Twitter recommended: 1200x630
      if (width !== 1200 || height !== 630) {
        result.warnings.push(
          `OG image dimensions (${width}x${height}) differ from recommended (1200x630)`
        );
      }
    }

    // Validate title length
    if (result.tags['og:title']) {
      const titleLength = result.tags['og:title'].length;
      if (titleLength > 60) {
        result.warnings.push(
          `OG title is long (${titleLength} chars). Recommended: < 60 chars`
        );
      }
    }

    // Validate description length
    if (result.tags['og:description']) {
      const descLength = result.tags['og:description'].length;
      if (descLength > 200) {
        result.warnings.push(
          `OG description is long (${descLength} chars). Recommended: < 200 chars`
        );
      }
      if (descLength < 50) {
        result.warnings.push(
          `OG description is short (${descLength} chars). Recommended: > 50 chars`
        );
      }
    }

    // Validate Twitter card type
    if (result.tags['twitter:card']) {
      const cardType = result.tags['twitter:card'];
      if (!['summary', 'summary_large_image', 'app', 'player'].includes(cardType)) {
        result.errors.push(`Invalid Twitter card type: ${cardType}`);
        result.valid = false;
      }
    }

  } catch (error) {
    result.errors.push(`Failed to parse HTML: ${error}`);
    result.valid = false;
  }

  return result;
}

function printValidationResult(result: ValidationResult): void {
  console.log('\n=== Open Graph Tags Validation ===\n');

  if (result.valid) {
    console.log('✓ All required tags present\n');
  } else {
    console.log('✗ Validation failed\n');
  }

  if (result.errors.length > 0) {
    console.log('ERRORS:');
    result.errors.forEach((error) => {
      console.log(`  ✗ ${error}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('WARNINGS:');
    result.warnings.forEach((warning) => {
      console.log(`  ⚠ ${warning}`);
    });
    console.log('');
  }

  console.log('DETECTED TAGS:');
  Object.entries(result.tags)
    .filter(([key]) => key.startsWith('og:') || key.startsWith('twitter:'))
    .forEach(([key, value]) => {
      const truncated = value.length > 80 ? value.substring(0, 77) + '...' : value;
      console.log(`  ${key}: ${truncated}`);
    });

  console.log('\n=== Testing Tools ===\n');
  console.log('Facebook Sharing Debugger:');
  console.log('  https://developers.facebook.com/tools/debug/\n');
  console.log('Twitter Card Validator:');
  console.log('  https://cards-dev.twitter.com/validator\n');
  console.log('LinkedIn Post Inspector:');
  console.log('  https://www.linkedin.com/post-inspector/\n');
  console.log('OpenGraph.xyz:');
  console.log('  https://www.opengraph.xyz/\n');
}

// Run validation
const htmlPath = path.join(process.cwd(), 'index.html');

validateOGTags(htmlPath)
  .then((result) => {
    printValidationResult(result);
    process.exit(result.valid ? 0 : 1);
  })
  .catch((error) => {
    console.error('Validation error:', error);
    process.exit(1);
  });
