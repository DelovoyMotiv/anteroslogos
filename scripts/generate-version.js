/**
 * Generate version.json file for version checking
 * This script runs during build to create a version file
 * that the VersionChecker component can fetch to detect updates
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
import pkg from '../package.json' with { type: 'json' };

const versionInfo = {
  version: pkg.version,
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now(),
};

// Write to public directory so it's accessible at /version.json
const outputPath = join(__dirname, '..', 'public', 'version.json');

try {
  writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));
  console.log('✅ Generated version.json:', versionInfo);
} catch (error) {
  console.error('❌ Failed to generate version.json:', error);
  process.exit(1);
}
