# Blog Admin Panel Components

This directory contains all the UI components for the blog CMS admin panel.

## Components

### AdminLayout
**File:** `AdminLayout.tsx`

Main layout component for the admin panel with:
- Sidebar navigation with links to Posts, Authors, and Categories
- Authentication check (redirects non-admin users)
- Mobile-responsive design with hamburger menu
- Sign out functionality

**Requirements:** 2.1, 3.2

### BlogPostList
**File:** `BlogPostList.tsx`

Displays a paginated list of all blog posts with:
- Status indicators (draft, published, archived)
- Filters for status, category, and author
- Pagination controls
- Actions: View, Edit, Delete
- Post count display

**Requirements:** 2.1, 9.3

### BlogPostEditor
**File:** `BlogPostEditor.tsx`

Rich text editor with markdown support featuring:
- Live preview pane (side-by-side or hidden)
- Image upload functionality
- Markdown syntax highlighting
- Quick reference guide
- Preview with metadata (title, excerpt, featured image)

**Requirements:** 2.2

### BlogPostForm
**File:** `BlogPostForm.tsx`

Complete form for creating/editing blog posts with:
- All post metadata fields (title, slug, excerpt, content)
- Author and category selection
- Status management (draft/published/archived)
- Featured post toggle
- SEO fields (meta description, keywords, OG image)
- Auto-save drafts every 30 seconds
- Client-side validation
- Auto-generated slug from title
- Auto-calculated read time

**Requirements:** 2.3, 2.4, 9.1

### AuthorManager
**File:** `AuthorManager.tsx`

Manage blog authors with:
- List all authors with post counts
- Create/edit author profiles
- Delete authors
- Fields: name, slug, bio, image, email, job title, expertise, knows about
- Auto-generated slug from name

**Requirements:** 5.1, 5.4

### CategoryTagManager
**File:** `CategoryTagManager.tsx`

Manage categories and tags with:
- Tabbed interface for categories and tags
- Create/edit/delete categories
- Create/edit/delete tags
- Post counts for categories
- Display order for categories
- Tag normalization

**Requirements:** 6.1, 6.3

## Pages

The following pages use these components:

- `/admin/blog` - BlogAdminPage (uses BlogPostList)
- `/admin/blog/new` - BlogNewPostPage (uses BlogPostForm in create mode)
- `/admin/blog/edit/:id` - BlogEditPostPage (uses BlogPostForm in edit mode)
- `/admin/blog/authors` - BlogAuthorsPage (uses AuthorManager)
- `/admin/blog/categories` - BlogCategoriesPage (uses CategoryTagManager)

## Authentication

All admin components check for:
1. User authentication (via Supabase Auth)
2. Admin role in user profile metadata

Non-admin users are redirected to the home page or login page.

## Styling

Components use the existing brand design system with:
- `brand-bg` - Background color
- `brand-text` - Text color
- `brand-accent` - Accent/primary color
- `brand-secondary` - Secondary background color

All components are fully responsive and work on mobile, tablet, and desktop.

## Property-Based Tests

Two property tests validate the admin UI behavior:

1. **Property 35: Draft Post Visibility** - Validates that draft posts don't appear in public API responses
2. **Property 36: Admin View All Posts** - Validates that admins can view posts of all statuses

Tests are located in `api/__tests__/blog-admin-ui.property.test.ts`
