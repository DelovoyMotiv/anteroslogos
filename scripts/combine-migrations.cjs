/**
 * Combine all Supabase migrations into a single SQL file
 * This makes it easier to apply migrations manually through SQL Editor
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const outputFile = path.join(__dirname, '..', 'supabase', 'combined-migrations.sql');

// List of migrations in order
const migrations = [
  '001_initial_schema.sql',
  '002_gold_standard_schema.sql',
  '003_dashboard_schema.sql',
  '007_multi_tenancy_isolation.sql',
  '010_subscription_billing.sql',
  '020_jwt_refresh_tokens.sql',
  '021_performance_indexes.sql',
  '022_competitor_tracking.sql',
  '023_database_constraints.sql',
];

console.log('🔄 Combining migrations...\n');

let combinedSQL = `-- ============================================
-- Combined Supabase Migrations
-- Generated: ${new Date().toISOString()}
-- Project: uixgwvyzptarzgwuwrmz
-- ============================================
-- 
-- IMPORTANT: Apply this file in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/uixgwvyzptarzgwuwrmz/sql/new
--
-- This file combines all essential migrations in the correct order.
-- If you encounter "already exists" errors, it means that migration
-- was already applied - you can safely ignore those errors.
-- ============================================

`;

migrations.forEach((migration, index) => {
  const migrationPath = path.join(migrationsDir, migration);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  Warning: ${migration} not found, skipping...`);
    return;
  }

  console.log(`✅ Adding ${index + 1}/${migrations.length}: ${migration}`);
  
  const content = fs.readFileSync(migrationPath, 'utf8');
  
  combinedSQL += `
-- ============================================
-- Migration ${index + 1}: ${migration}
-- ============================================

${content}

`;
});

fs.writeFileSync(outputFile, combinedSQL, 'utf8');

console.log(`\n✅ Combined migrations saved to: ${outputFile}`);
console.log('\n📋 Next steps:');
console.log('1. Open: https://supabase.com/dashboard/project/uixgwvyzptarzgwuwrmz/sql/new');
console.log('2. Copy the contents of supabase/combined-migrations.sql');
console.log('3. Paste into SQL Editor and click "Run"');
console.log('\n🎉 Done!');
