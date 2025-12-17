# Blog CMS Property-Based Testing Framework

This document describes the property-based testing framework set up for the Blog CMS feature.

## Overview

The testing framework uses **fast-check** (v4.3.0) for property-based testing, which allows us to test properties that should hold true across all valid inputs rather than just specific examples.

## Files Created

### 1. `blog-generators.ts`
Custom generators for creating realistic blog data that respects database constraints.

**Key Generators:**
- `slugGenerator` - Valid URL-friendly slugs (3-100 chars, lowercase, hyphens)
- `titleGenerator` - Blog post titles (10-200 chars)
- `excerptGenerator` - Post excerpts (50-500 chars)
- `contentGenerator` - Post content (100-10000 chars)
- `statusGenerator` - Post status (draft, published, archived)
- `blogPostGenerator(authorId, categoryId?)` - Complete blog post objects
- `publishedBlogPostGenerator(authorId, categoryId?)` - Published posts only
- `draftBlogPostGenerator(authorId, categoryId?)` - Draft posts only
- `archivedBlogPostGenerator(authorId, categoryId?)` - Archived posts only
- `blogAuthorGenerator` - Complete author objects
- `blogCategoryGenerator` - Complete category objects
- `blogTagGenerator` - Complete tag objects
- `uniqueSlugGenerator(prefix)` - Unique slugs with timestamps to avoid collisions

### 2. `blog-test-utils.ts`
Helper functions for test setup, teardown, and assertions.

**Key Functions:**
- `createTestAuthor(supabase, data)` - Creates test author, returns ID
- `createTestCategory(supabase, data)` - Creates test category, returns ID
- `createTestTag(supabase, data)` - Creates test tag, returns ID
- `createTestPost(supabase, data)` - Creates test post, returns ID
- `cleanupTestData(supabase, options)` - Deletes test data by pattern
- `deleteTestRecords(supabase, table, ids)` - Deletes specific records
- `assertValidBlogPost(post)` - Validates post has all required fields
- `assertValidBlogAuthor(author)` - Validates author structure
- `assertValidBlogCategory(category)` - Validates category structure
- `assertValidBlogTag(tag)` - Validates tag structure
- `assertObjectsEqual(obj1, obj2, ignoreFields)` - Deep equality check
- `generateTestId()` - Generates unique test identifier

### 3. `blog-rls-policy.property.test.ts`
Property-based tests for RLS (Row Level Security) policy enforcement.

**Tests Property 4: RLS Policy Enforcement**
- ✅ Public users can read published posts
- ✅ Public users cannot read draft posts
- ✅ Public users cannot read archived posts
- ✅ Public users cannot read soft-deleted posts
- ✅ Public users cannot create posts
- ✅ Public users cannot update posts
- ✅ Public users cannot delete posts
- ✅ Public users can read authors
- ✅ Public users cannot create authors
- ✅ Public users can read categories
- ✅ Public users cannot create categories

Each test runs **100 iterations** with randomly generated data.

## Usage

### Running Tests

```bash
# Run all blog CMS tests
npm test -- api/__tests__/blog-*.property.test.ts

# Run specific test file
npm test -- api/__tests__/blog-rls-policy.property.test.ts

# Run with coverage
npm run test:coverage
```

### Writing New Property Tests

```typescript
import fc from 'fast-check';
import { blogPostGenerator, uniqueSlugGenerator } from './blog-generators';
import { createTestAuthor, cleanupTestData } from './blog-test-utils';

it('should test some property', async () => {
  await fc.assert(
    fc.asyncProperty(
      blogPostGenerator(authorId, categoryId),
      uniqueSlugGenerator('test-prefix'),
      async (postData, slug) => {
        // Test implementation
        // Property assertions go here
      }
    ),
    { numRuns: 100 } // Run 100 iterations
  );
});
```

### Best Practices

1. **Use Unique Slugs**: Always use `uniqueSlugGenerator()` to avoid collisions
2. **Clean Up**: Always clean up test data in `afterAll` or `afterEach`
3. **Test IDs**: Use `generateTestId()` to create unique test identifiers
4. **Iterations**: Run at least 100 iterations per property test
5. **Skip Gracefully**: Check `hasSupabase` and skip tests if not configured
6. **Admin vs Public**: Use separate Supabase clients for RLS testing

## Configuration

The framework is configured in:
- `vitest.config.ts` - Test runner configuration
- `api/__tests__/vitest-setup.ts` - Global test setup
- `api/__tests__/setup.ts` - Environment variable loading

## Environment Variables

Required for tests to run:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access (bypasses RLS)
- `SUPABASE_ANON_KEY` - Public access (enforces RLS)

Tests will skip gracefully if these are not configured.

## Property-Based Testing Philosophy

Property-based testing focuses on **properties** (universal truths) rather than specific examples:

- **Traditional Test**: "When I add post with slug 'test', it should be retrievable"
- **Property Test**: "For ANY valid post data, storing and retrieving should preserve all fields"

This approach:
- Tests edge cases automatically
- Finds bugs that example-based tests miss
- Provides stronger correctness guarantees
- Aligns with formal specifications

## Integration with Spec

Each property test is tagged with:
- **Feature**: blog-cms
- **Property Number**: From design document
- **Validates**: Requirements clause(s)

Example:
```typescript
/**
 * Feature: blog-cms, Property 4: RLS Policy Enforcement
 * Validates: Requirements 1.5
 */
```

This ensures traceability from requirements → design → tests → implementation.
