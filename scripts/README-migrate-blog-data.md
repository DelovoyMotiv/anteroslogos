# Blog Data Migration Script

This script migrates existing blog posts from `data/blogPosts.ts` to the Supabase database.

## Prerequisites

1. Supabase database with blog CMS schema (migration `038_blog_cms_schema.sql` must be applied)
2. Environment variables configured:
   - `VITE_SUPABASE_URL` or `SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`

## Usage

```bash
npx tsx scripts/migrate-blog-data.ts
```

## What It Does

The migration script performs the following operations in order:

### 1. Extract Unique Entities
- Extracts unique authors from blog posts
- Extracts unique categories
- Extracts unique tags

### 2. Migrate Authors
- Creates `blog_authors` records for each unique author
- Maps author slugs to database IDs for later use

### 3. Migrate Categories
- Creates `blog_categories` records for each unique category
- Assigns display order and descriptions
- Maps category names to database IDs

### 4. Migrate Tags
- Creates `blog_tags` records for each unique tag
- Normalizes tag names to slugs
- Maps tag names to database IDs

### 5. Migrate Blog Posts
- Transforms each post from file format to database format
- Inserts posts with proper author and category references
- Preserves all metadata including:
  - Original slugs (for URL preservation)
  - Publish dates
  - SEO metadata (meta description, keywords, OG images)
  - Featured status
  - Read time

### 6. Create Tag Relationships
- Creates `blog_post_tags` junction records
- Links each post to its tags

## Error Handling

The script is designed to be resilient:

- **Individual Failures**: If one post fails to migrate, the script continues with remaining posts
- **Detailed Logging**: Each step logs success/failure with specific error messages
- **Summary Report**: At the end, displays counts of successful and failed migrations
- **Exit Code**: Returns 0 if all migrations succeed, 1 if any failures occur

## Migration Report

After completion, the script displays a comprehensive report:

```
============================================================
📊 MIGRATION REPORT
============================================================

Authors:
  Total: 1
  ✅ Successful: 1
  ❌ Failed: 0

Categories:
  Total: 4
  ✅ Successful: 4
  ❌ Failed: 0

Tags:
  Total: 15
  ✅ Successful: 15
  ❌ Failed: 0

Blog Posts:
  Total: 4
  ✅ Successful: 4
  ❌ Failed: 0

============================================================
✨ Migration complete!
============================================================
```

## Data Preservation

The migration preserves:

- ✅ Original slugs (URLs remain unchanged)
- ✅ Publish dates
- ✅ Modified dates
- ✅ All content (title, excerpt, content)
- ✅ Author information
- ✅ Categories
- ✅ Tags
- ✅ SEO metadata
- ✅ Featured status
- ✅ Read time

## Verification

After migration, verify:

1. All posts are accessible at their original URLs: `/blog/{slug}`
2. Author information is complete
3. Categories and tags are properly linked
4. SEO metadata is preserved
5. Published dates match original dates

## Troubleshooting

### "Supabase credentials not found"
Ensure environment variables are set in `.env` or `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### "Foreign key constraint violation"
The database schema must be applied first. Run:
```bash
# Apply migration if not already done
supabase db push
```

### "Duplicate key value violates unique constraint"
The migration has already been run. To re-run:
1. Delete existing blog data from database
2. Run migration again

### Individual Post Failures
Check the error report at the end of migration. Common issues:
- Missing required fields
- Invalid data formats
- Constraint violations

## Property-Based Tests

The migration functionality is tested with property-based tests in:
- `api/__tests__/blog-migration.property.test.ts`

These tests verify:
- **Property 11**: Migration Data Preservation
- **Property 12**: URL Preservation After Migration
- **Property 13**: Migration Error Resilience

Run tests with:
```bash
npm test -- api/__tests__/blog-migration.property.test.ts --run
```

## Related Files

- **Source Data**: `data/blogPosts.ts`
- **Database Schema**: `supabase/migrations/038_blog_cms_schema.sql`
- **Migration Script**: `scripts/migrate-blog-data.ts`
- **Property Tests**: `api/__tests__/blog-migration.property.test.ts`
