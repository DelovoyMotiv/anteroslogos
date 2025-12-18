/**
 * Admin Blog API Endpoints
 * POST /api/admin/blog?action=create-post
 * PUT /api/admin/blog?action=update-post&id={id}
 * DELETE /api/admin/blog?action=delete-post&id={id}
 * POST /api/admin/blog?action=upload-image
 * POST /api/admin/blog?action=create-author
 * PUT /api/admin/blog?action=update-author&id={id}
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import { requireAdminAuth } from '../../lib/auth/blogAdminAuth.js';
import {
  sendErrorResponse,
  validationError,
  notFoundError,
  databaseError,
  validateRequired,
  validateUrl,
  validateSlug,
  validateEnum,
} from '../_lib/blog/errorHandler.js';

// Lazy initialization of Supabase client for server-side use
// This ensures environment variables are available when the function runs
function getAdminClient() {
  // IMPORTANT: VITE_ prefixed variables are NOT available in Vercel Functions
  // They are only for browser builds. Use non-VITE_ prefixed variables for server-side
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration in admin API:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    });
    throw databaseError('Database not configured');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Generate unique slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Ensure slug is unique by appending number if needed
 */
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const supabase = getAdminClient();

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Validate required fields for blog post
 */
function validatePostFields(body: any): void {
  validateRequired(body, ['title', 'content', 'excerpt', 'author_id', 'read_time']);
  
  // Validate URL fields if provided
  if (body.og_image_url) {
    validateUrl(body.og_image_url, 'og_image_url');
  }
}

/**
 * POST /api/admin/blog?action=create-post
 */
async function createPost(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const body = req.body;

    // Validate required fields
    validatePostFields(body);

    // Generate unique slug from title
    const baseSlug = body.slug || generateSlug(body.title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Validate category exists if provided
    if (body.category_id) {
      const { data: category, error: categoryError } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('id', body.category_id)
        .single();

      if (categoryError || !category) {
        throw validationError('Validation failed', ['category_id does not exist']);
      }
    }

    // Prepare post data
    const postData: any = {
      slug,
      title: body.title.trim(),
      excerpt: body.excerpt.trim(),
      content: body.content.trim(),
      author_id: body.author_id,
      read_time: body.read_time,
      featured: body.featured || false,
      status: body.status || 'draft',
      category_id: body.category_id || null,
      meta_description: body.meta_description || null,
      meta_keywords: body.meta_keywords || null,
      og_image_url: body.og_image_url || null,
      published_date: body.published_date || null,
    };

    // Validate status
    validateEnum(postData.status, ['draft', 'published', 'archived'] as const, 'status');

    // Auto-set published_date when creating with published status
    if (postData.status === 'published' && !postData.published_date) {
      postData.published_date = new Date().toISOString();
    }

    // Create blog post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      throw databaseError('Failed to create post');
    }

    // Handle tags if provided
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      for (const tagName of body.tags) {
        // Normalize tag name
        const normalizedName = tagName.toLowerCase().trim();
        const tagSlug = generateSlug(normalizedName);

        // Get or create tag
        let { data: tag, error: tagError } = await supabase
          .from('blog_tags')
          .select('id')
          .eq('slug', tagSlug)
          .single();

        if (tagError || !tag) {
          // Create new tag
          const { data: newTag, error: createTagError } = await supabase
            .from('blog_tags')
            .insert({ name: normalizedName, slug: tagSlug })
            .select('id')
            .single();

          if (createTagError) {
            console.error('Error creating tag:', createTagError);
            continue;
          }

          tag = newTag;
        }

        // Create junction record (ignore if already exists due to PRIMARY KEY constraint)
        if (tag) {
          await supabase
            .from('blog_post_tags')
            .insert({ post_id: post.id, tag_id: tag.id })
            .select();
          // Ignore errors from duplicate key constraint
        }
      }
    }

    res.status(201).json(post);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to create post');
  }
}

/**
 * PUT /api/admin/blog?action=update-post&id={id}
 */
async function updatePost(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const postId = req.query.id as string;

    if (!postId) {
      throw validationError('Post ID is required');
    }

    // Load existing post
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingPost) {
      throw notFoundError('Post');
    }

    const body = req.body;

    // Prepare update data - only include fields that are provided
    const updateData: any = {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        throw validationError('Validation failed', ['title must be a non-empty string']);
      }
      updateData.title = body.title.trim();

      // If title changed, regenerate slug if not explicitly provided
      if (body.slug === undefined && body.title !== existingPost.title) {
        const baseSlug = generateSlug(body.title);
        updateData.slug = await ensureUniqueSlug(baseSlug, postId);
      }
    }

    if (body.slug !== undefined) {
      const slug = await ensureUniqueSlug(body.slug, postId);
      updateData.slug = slug;
    }

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim().length === 0) {
        throw validationError('Validation failed', ['content must be a non-empty string']);
      }
      updateData.content = body.content.trim();
    }

    if (body.excerpt !== undefined) {
      if (typeof body.excerpt !== 'string' || body.excerpt.trim().length === 0) {
        throw validationError('Validation failed', ['excerpt must be a non-empty string']);
      }
      updateData.excerpt = body.excerpt.trim();
    }

    if (body.author_id !== undefined) {
      updateData.author_id = body.author_id;
    }

    if (body.category_id !== undefined) {
      // Validate category exists if provided (null is allowed)
      if (body.category_id !== null) {
        const { data: category, error: categoryError } = await supabase
          .from('blog_categories')
          .select('id')
          .eq('id', body.category_id)
          .single();

        if (categoryError || !category) {
          throw validationError('Validation failed', ['category_id does not exist']);
        }
      }
      updateData.category_id = body.category_id;
    }

    if (body.read_time !== undefined) {
      if (typeof body.read_time !== 'number' || body.read_time <= 0) {
        throw validationError('Validation failed', ['read_time must be a positive number']);
      }
      updateData.read_time = body.read_time;
    }

    if (body.featured !== undefined) {
      updateData.featured = body.featured;
    }

    if (body.status !== undefined) {
      validateEnum(body.status, ['draft', 'published', 'archived'] as const, 'status');
      updateData.status = body.status;

      // Auto-set published_date when transitioning to published
      if (body.status === 'published' && !existingPost.published_date && body.published_date === undefined) {
        updateData.published_date = new Date().toISOString();
      }
    }

    if (body.meta_description !== undefined) {
      updateData.meta_description = body.meta_description;
    }

    if (body.meta_keywords !== undefined) {
      updateData.meta_keywords = body.meta_keywords;
    }

    if (body.og_image_url !== undefined) {
      if (body.og_image_url) {
        validateUrl(body.og_image_url, 'og_image_url');
      }
      updateData.og_image_url = body.og_image_url;
    }

    if (body.published_date !== undefined) {
      updateData.published_date = body.published_date;
    }

    // Always update modified_date
    updateData.updated_at = new Date().toISOString();

    // Update blog post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      throw databaseError('Failed to update post');
    }

    // Handle tags if provided
    if (body.tags !== undefined && Array.isArray(body.tags)) {
      // Delete existing tags
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', postId);

      // Add new tags
      for (const tagName of body.tags) {
        const normalizedName = tagName.toLowerCase().trim();
        const tagSlug = generateSlug(normalizedName);

        // Get or create tag
        let { data: tag, error: tagError } = await supabase
          .from('blog_tags')
          .select('id')
          .eq('slug', tagSlug)
          .single();

        if (tagError || !tag) {
          const { data: newTag, error: createTagError } = await supabase
            .from('blog_tags')
            .insert({ name: normalizedName, slug: tagSlug })
            .select('id')
            .single();

          if (createTagError) {
            console.error('Error creating tag:', createTagError);
            continue;
          }

          tag = newTag;
        }

        if (tag) {
          await supabase
            .from('blog_post_tags')
            .insert({ post_id: postId, tag_id: tag.id })
            .select();
          // Ignore errors from duplicate key constraint
        }
      }
    }

    res.status(200).json(post);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update post');
  }
}

/**
 * PUT /api/admin/blog?action=update-author&id={id}
 */
async function updateAuthor(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const authorId = req.query.id as string;

    if (!authorId) {
      res.status(400).json({ error: 'Author ID is required' });
      return;
    }

    // Load existing author
    const { data: existingAuthor, error: fetchError } = await supabase
      .from('blog_authors')
      .select('*')
      .eq('id', authorId)
      .single();

    if (fetchError || !existingAuthor) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    const body = req.body;

    // Prepare update data
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: ['name must be a non-empty string'],
        });
        return;
      }
      updateData.name = body.name.trim();

      // If name changed, regenerate slug if not explicitly provided
      if (body.slug === undefined && body.name !== existingAuthor.name) {
        const baseSlug = generateSlug(body.name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const { data, error } = await supabase
            .from('blog_authors')
            .select('id')
            .eq('slug', slug)
            .neq('id', authorId);

          if (error) {
            throw error;
          }

          if (!data || data.length === 0) {
            break;
          }

          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        updateData.slug = slug;
      }
    }

    if (body.slug !== undefined) {
      // Ensure slug is unique
      let slug = body.slug;
      let counter = 1;

      while (true) {
        const { data, error } = await supabase
          .from('blog_authors')
          .select('id')
          .eq('slug', slug)
          .neq('id', authorId);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          break;
        }

        slug = `${body.slug}-${counter}`;
        counter++;
      }

      updateData.slug = slug;
    }

    if (body.bio !== undefined) {
      updateData.bio = body.bio;
    }

    if (body.image_url !== undefined) {
      updateData.image_url = body.image_url;
    }

    if (body.email !== undefined) {
      updateData.email = body.email;
    }

    if (body.job_title !== undefined) {
      updateData.job_title = body.job_title;
    }

    if (body.expertise !== undefined) {
      updateData.expertise = body.expertise;
    }

    if (body.knows_about !== undefined) {
      updateData.knows_about = body.knows_about;
    }

    // Always update updated_at
    updateData.updated_at = new Date().toISOString();

    // Update author
    const { data: author, error } = await supabase
      .from('blog_authors')
      .update(updateData)
      .eq('id', authorId)
      .select()
      .single();

    if (error) {
      console.error('Error updating author:', error);
      res.status(500).json({ error: 'Failed to update author' });
      return;
    }

    // Note: Changes to author are automatically propagated to all posts
    // via the foreign key relationship (author_id references blog_authors.id)
    // When querying posts, the updated author data will be fetched

    res.status(200).json(author);
  } catch (error) {
    console.error('Error in updateAuthor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/blog?action=create-author
 */
async function createAuthor(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const body = req.body;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: ['name is required and must be a non-empty string'],
      });
      return;
    }

    // Generate unique slug
    const baseSlug = body.slug || generateSlug(body.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from('blog_authors')
        .select('id')
        .eq('slug', slug);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Prepare author data
    const authorData: any = {
      slug,
      name: body.name.trim(),
      bio: body.bio || null,
      image_url: body.image_url || null,
      email: body.email || null,
      job_title: body.job_title || null,
      expertise: body.expertise || null,
      knows_about: body.knows_about || null,
    };

    // Create author
    const { data: author, error } = await supabase
      .from('blog_authors')
      .insert(authorData)
      .select()
      .single();

    if (error) {
      console.error('Error creating author:', error);
      res.status(500).json({ error: 'Failed to create author' });
      return;
    }

    res.status(201).json(author);
  } catch (error) {
    console.error('Error in createAuthor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/admin/blog?action=delete-author&id={id}
 */
async function deleteAuthor(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const authorId = req.query.id as string;

    if (!authorId) {
      res.status(400).json({ error: 'Author ID is required' });
      return;
    }

    // Check if author exists
    const { data: existingAuthor, error: fetchError } = await supabase
      .from('blog_authors')
      .select('id')
      .eq('id', authorId)
      .single();

    if (fetchError || !existingAuthor) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    // Check if author has posts
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('author_id', authorId)
      .limit(1);

    if (postsError) {
      console.error('Error checking author posts:', postsError);
      res.status(500).json({ error: 'Failed to check author posts' });
      return;
    }

    if (posts && posts.length > 0) {
      res.status(400).json({ 
        error: 'Cannot delete author with existing posts',
        message: 'Please reassign or delete all posts by this author first'
      });
      return;
    }

    // Delete author
    const { error } = await supabase
      .from('blog_authors')
      .delete()
      .eq('id', authorId);

    if (error) {
      console.error('Error deleting author:', error);
      res.status(500).json({ error: 'Failed to delete author' });
      return;
    }

    res.status(200).json({ success: true, message: 'Author deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAuthor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/blog?action=upload-image
 */
async function uploadImage(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const body = req.body;

    if (!body.file || !body.fileName) {
      throw validationError('File and fileName are required');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileType = body.fileType || 'image/jpeg';

    if (!allowedTypes.includes(fileType)) {
      throw validationError('Invalid file type', ['Only JPEG, PNG, GIF, and WebP images are allowed']);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    const fileSize = body.fileSize || 0;

    if (fileSize > maxSize) {
      throw validationError('File too large', ['Maximum file size is 5MB']);
    }

    // Generate unique file name
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = body.fileName.split('.').pop();
    const uniqueFileName = `blog/${timestamp}-${randomString}.${extension}`;

    // Convert base64 to buffer if needed
    let fileBuffer: Buffer;
    if (typeof body.file === 'string') {
      // Remove data URL prefix if present
      const base64Data = body.file.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = Buffer.from(body.file);
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw databaseError('Failed to upload image');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(uniqueFileName);

    res.status(200).json({
      url: urlData.publicUrl,
      fileName: uniqueFileName,
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to upload image');
  }
}

/**
 * DELETE /api/admin/blog?action=delete-post&id={id}
 */
async function deletePost(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const postId = req.query.id as string;

    if (!postId) {
      throw validationError('Post ID is required');
    }

    // Check if post exists
    const { data: existingPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingPost) {
      throw notFoundError('Post');
    }

    // Perform soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('blog_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', postId);

    if (error) {
      throw databaseError('Failed to delete post');
    }

    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to delete post');
  }
}

/**
 * GET /api/admin/blog?action=posts
 * Admin endpoint to get all posts (including drafts)
 */
async function getPosts(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const author = req.query.author as string;
    const status = req.query.status as string;

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query - admin can see all posts including drafts
    // Use proper foreign key syntax for Supabase joins
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        author:blog_authors!blog_posts_author_id_fkey(*),
        category:blog_categories!blog_posts_category_id_fkey(*)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data: posts, error, count } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
      return;
    }

    // Filter by category or author if needed (in-memory filtering)
    let filteredPosts: any[] = posts || [];
    
    if (category && category !== 'all') {
      filteredPosts = filteredPosts.filter((post: any) => post.category?.slug === category);
    }
    
    if (author && author !== 'all') {
      filteredPosts = filteredPosts.filter((post: any) => post.author?.slug === author);
    }

    res.status(200).json({
      posts: filteredPosts,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error in getPosts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/blog?action=create-category
 */
async function createCategory(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const body = req.body;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: ['name is required and must be a non-empty string'],
      });
      return;
    }

    // Generate unique slug
    const baseSlug = body.slug || generateSlug(body.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', slug);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Prepare category data
    const categoryData: any = {
      slug,
      name: body.name.trim(),
      description: body.description || null,
      display_order: body.display_order || 0,
    };

    // Create category
    const { data: category, error } = await supabase
      .from('blog_categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
      return;
    }

    res.status(201).json(category);
  } catch (error) {
    console.error('Error in createCategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/admin/blog?action=update-category&id={id}
 */
async function updateCategory(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const categoryId = req.query.id as string;

    if (!categoryId) {
      res.status(400).json({ error: 'Category ID is required' });
      return;
    }

    // Load existing category
    const { data: existingCategory, error: fetchError } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const body = req.body;
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: ['name must be a non-empty string'],
        });
        return;
      }
      updateData.name = body.name.trim();
    }

    if (body.slug !== undefined) {
      // Ensure slug is unique
      let slug = body.slug;
      let counter = 1;

      while (true) {
        const { data, error } = await supabase
          .from('blog_categories')
          .select('id')
          .eq('slug', slug)
          .neq('id', categoryId);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          break;
        }

        slug = `${body.slug}-${counter}`;
        counter++;
      }

      updateData.slug = slug;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.display_order !== undefined) {
      updateData.display_order = body.display_order;
    }

    updateData.updated_at = new Date().toISOString();

    // Update category
    const { data: category, error } = await supabase
      .from('blog_categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
      return;
    }

    res.status(200).json(category);
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/admin/blog?action=authors
 * Admin endpoint to get all authors (including those without posts)
 */
async function getAuthors(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    
    // Get all authors - admin can see all authors regardless of post count
    const { data: authors, error } = await supabase
      .from('blog_authors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ error: 'Failed to fetch authors', details: error.message });
      return;
    }

    res.status(200).json(authors || []);
  } catch (error) {
    console.error('Error in getAuthors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/blog?action=create-tag
 */
async function createTag(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const body = req.body;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: ['name is required and must be a non-empty string'],
      });
      return;
    }

    // Normalize tag name
    const normalizedName = body.name.toLowerCase().trim();
    const tagSlug = body.slug || generateSlug(normalizedName);

    // Check if tag already exists
    const { data: existingTag, error: checkError } = await supabase
      .from('blog_tags')
      .select('*')
      .eq('slug', tagSlug)
      .single();

    if (existingTag) {
      // Tag already exists, return it
      res.status(200).json(existingTag);
      return;
    }

    // Create new tag
    const { data: tag, error } = await supabase
      .from('blog_tags')
      .insert({ name: normalizedName, slug: tagSlug })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      res.status(500).json({ error: 'Failed to create tag' });
      return;
    }

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error in createTag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/admin/blog?action=update-tag&id={id}
 */
async function updateTag(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const tagId = req.query.id as string;

    if (!tagId) {
      res.status(400).json({ error: 'Tag ID is required' });
      return;
    }

    // Load existing tag
    const { data: existingTag, error: fetchError } = await supabase
      .from('blog_tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (fetchError || !existingTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    const body = req.body;
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: ['name must be a non-empty string'],
        });
        return;
      }
      updateData.name = body.name.toLowerCase().trim();
    }

    if (body.slug !== undefined) {
      // Ensure slug is unique
      let slug = body.slug;
      let counter = 1;

      while (true) {
        const { data, error } = await supabase
          .from('blog_tags')
          .select('id')
          .eq('slug', slug)
          .neq('id', tagId);

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          break;
        }

        slug = `${body.slug}-${counter}`;
        counter++;
      }

      updateData.slug = slug;
    }

    // Update tag
    const { data: tag, error } = await supabase
      .from('blog_tags')
      .update(updateData)
      .eq('id', tagId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      res.status(500).json({ error: 'Failed to update tag' });
      return;
    }

    res.status(200).json(tag);
  } catch (error) {
    console.error('Error in updateTag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/admin/blog?action=delete-category&id={id}
 */
async function deleteCategory(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const categoryId = req.query.id as string;

    if (!categoryId) {
      res.status(400).json({ error: 'Category ID is required' });
      return;
    }

    // Check if category exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('blog_categories')
      .select('id')
      .eq('id', categoryId)
      .single();

    if (fetchError || !existingCategory) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // Check if category has posts
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (postsError) {
      console.error('Error checking category posts:', postsError);
      res.status(500).json({ error: 'Failed to check category posts' });
      return;
    }

    if (posts && posts.length > 0) {
      res.status(400).json({ 
        error: 'Cannot delete category with existing posts',
        message: 'Please reassign or delete all posts in this category first'
      });
      return;
    }

    // Delete category
    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
      return;
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/admin/blog?action=delete-tag&id={id}
 */
async function deleteTag(req: VercelRequest, res: VercelResponse, userId: string): Promise<void> {
  try {
    const supabase = getAdminClient();
    const tagId = req.query.id as string;

    if (!tagId) {
      res.status(400).json({ error: 'Tag ID is required' });
      return;
    }

    // Check if tag exists
    const { data: existingTag, error: fetchError } = await supabase
      .from('blog_tags')
      .select('id')
      .eq('id', tagId)
      .single();

    if (fetchError || !existingTag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Delete tag associations first
    await supabase
      .from('blog_post_tags')
      .delete()
      .eq('tag_id', tagId);

    // Delete tag
    const { error } = await supabase
      .from('blog_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ error: 'Failed to delete tag' });
      return;
    }

    res.status(200).json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error in deleteTag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Main handler
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const action = req.query.action as string || 'create-post';

  switch (action) {
    case 'posts':
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, getPosts);
      break;

    case 'authors':
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, getAuthors);
      break;

    case 'create-post':
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, createPost);
      break;

    case 'update-post':
      if (req.method !== 'PUT') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, updatePost);
      break;

    case 'delete-post':
      if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, deletePost);
      break;

    case 'upload-image':
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, uploadImage);
      break;

    case 'create-author':
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, createAuthor);
      break;

    case 'update-author':
      if (req.method !== 'PUT') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, updateAuthor);
      break;

    case 'delete-author':
      if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, deleteAuthor);
      break;

    case 'create-category':
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, createCategory);
      break;

    case 'update-category':
      if (req.method !== 'PUT') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, updateCategory);
      break;

    case 'create-tag':
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, createTag);
      break;

    case 'update-tag':
      if (req.method !== 'PUT') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, updateTag);
      break;

    case 'delete-category':
      if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, deleteCategory);
      break;

    case 'delete-tag':
      if (req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }
      await requireAdminAuth(req, res, deleteTag);
      break;

    default:
      res.status(400).json({ error: 'Invalid action' });
  }
}

export default handler;
