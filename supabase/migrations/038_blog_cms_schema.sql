-- Blog CMS Schema Migration
-- Creates tables for blog posts, authors, categories, and tags
-- Includes proper constraints, foreign keys, and indexes

-- =====================================================
-- BLOG AUTHORS TABLE
-- Stores author profiles with credentials and expertise
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_authors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  email TEXT,
  job_title TEXT,
  expertise TEXT[],
  knows_about TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT blog_authors_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT blog_authors_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- =====================================================
-- BLOG CATEGORIES TABLE
-- Stores blog post categories for organization
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT blog_categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT blog_categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- =====================================================
-- BLOG POSTS TABLE
-- Main table for blog content with full metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.blog_authors(id) ON DELETE RESTRICT NOT NULL,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' NOT NULL,
  published_date TIMESTAMPTZ,
  modified_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_time INTEGER NOT NULL,
  meta_description TEXT,
  meta_keywords TEXT[],
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT blog_posts_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT blog_posts_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT blog_posts_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT blog_posts_excerpt_not_empty CHECK (LENGTH(TRIM(excerpt)) > 0),
  CONSTRAINT blog_posts_content_not_empty CHECK (LENGTH(TRIM(content)) > 0),
  CONSTRAINT blog_posts_read_time_positive CHECK (read_time > 0),
  CONSTRAINT blog_posts_published_date_when_published CHECK (
    (status = 'published' AND published_date IS NOT NULL) OR 
    (status != 'published')
  )
);

-- =====================================================
-- BLOG TAGS TABLE
-- Stores tags for flexible post categorization
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT blog_tags_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT blog_tags_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- =====================================================
-- BLOG POST TAGS JUNCTION TABLE
-- Many-to-many relationship between posts and tags
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (post_id, tag_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- Optimized for common query patterns
-- =====================================================

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_date ON public.blog_posts(published_date DESC) WHERE published_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted_at ON public.blog_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(featured) WHERE featured = true;

-- Composite index for common filtering pattern
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_date 
ON public.blog_posts(status, published_date DESC) 
WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_blog_posts_search 
ON public.blog_posts 
USING gin(to_tsvector('english', title || ' ' || excerpt || ' ' || content));

-- Blog authors indexes
CREATE INDEX IF NOT EXISTS idx_blog_authors_slug ON public.blog_authors(slug);
CREATE INDEX IF NOT EXISTS idx_blog_authors_email ON public.blog_authors(email) WHERE email IS NOT NULL;

-- Blog categories indexes
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order ON public.blog_categories(display_order);

-- Blog tags indexes
CREATE INDEX IF NOT EXISTS idx_blog_tags_name ON public.blog_tags(name);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON public.blog_tags(slug);

-- Blog post tags indexes
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON public.blog_post_tags(tag_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- Automatically update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_authors_updated_at
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Public read access, admin-only write access
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND metadata->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Blog posts policies
CREATE POLICY "Public can read published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Admins have full access to posts"
ON public.blog_posts FOR ALL
USING (is_admin());

-- Blog authors policies
CREATE POLICY "Public can read authors"
ON public.blog_authors FOR SELECT
USING (true);

CREATE POLICY "Admins can manage authors"
ON public.blog_authors FOR ALL
USING (is_admin());

-- Blog categories policies
CREATE POLICY "Public can read categories"
ON public.blog_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.blog_categories FOR ALL
USING (is_admin());

-- Blog tags policies
CREATE POLICY "Public can read tags"
ON public.blog_tags FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tags"
ON public.blog_tags FOR ALL
USING (is_admin());

-- Blog post tags policies
CREATE POLICY "Public can read post tags"
ON public.blog_post_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE id = post_id
    AND status = 'published'
    AND deleted_at IS NULL
  )
);

CREATE POLICY "Admins can manage post tags"
ON public.blog_post_tags FOR ALL
USING (is_admin());

-- =====================================================
-- ADMIN ROLE SETUP
-- Set svetolesov@gmail.com as admin
-- =====================================================

-- Update profiles table to ensure metadata column exists (it should from migration 001)
-- This is idempotent and safe to run

-- Set admin role for svetolesov@gmail.com
DO $$
BEGIN
  UPDATE public.profiles
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{role}',
    '"admin"'
  )
  WHERE email = 'svetolesov@gmail.com';
  
  -- Log if user was found and updated
  IF FOUND THEN
    RAISE NOTICE 'Admin role set for svetolesov@gmail.com';
  ELSE
    RAISE NOTICE 'User svetolesov@gmail.com not found in profiles table';
  END IF;
END $$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.blog_posts IS 'Blog posts with full content and metadata';
COMMENT ON TABLE public.blog_authors IS 'Author profiles with credentials and expertise';
COMMENT ON TABLE public.blog_categories IS 'Categories for organizing blog posts';
COMMENT ON TABLE public.blog_tags IS 'Tags for flexible post categorization';
COMMENT ON TABLE public.blog_post_tags IS 'Many-to-many relationship between posts and tags';

COMMENT ON COLUMN public.blog_posts.slug IS 'URL-friendly identifier, must be unique';
COMMENT ON COLUMN public.blog_posts.status IS 'Post status: draft, published, or archived';
COMMENT ON COLUMN public.blog_posts.deleted_at IS 'Soft delete timestamp, NULL means not deleted';
COMMENT ON COLUMN public.blog_posts.read_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN public.blog_authors.expertise IS 'Array of expertise areas for E-E-A-T signals';
COMMENT ON COLUMN public.blog_authors.knows_about IS 'Array of knowledge domains for Schema.org';
