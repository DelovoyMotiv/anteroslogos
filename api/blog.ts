/**
 * Unified Blog API Endpoints
 * 
 * Public endpoints:
 * GET /api/blog?action=posts
 * GET /api/blog?action=post&slug={slug}
 * GET /api/blog?action=authors
 * GET /api/blog?action=author&slug={slug}
 * GET /api/blog?action=categories
 * GET /api/blog?action=tags
 * 
 * Admin endpoints (require authentication):
 * POST /api/blog?action=admin-create-post
 * PUT /api/blog?action=admin-update-post&id={id}
 * DELETE /api/blog?action=admin-delete-post&id={id}
 * POST /api/blog?action=admin-upload-image
 * POST /api/blog?action=admin-create-author
 * PUT /api/blog?action=admin-update-author&id={id}
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Database } from '../types/database.types';
import type { BlogPost, BlogAuthor, BlogCategory, BlogTag } from '../types/database.types';
import { sendErrorResponse, notFoundError, databaseError } from './_lib/blog/errorHandler.js';
import { getSupabaseClient, withRetry, logDatabaseError } from './_lib/blog/databaseConnection.js';

// Lazy initialization of Supabase client
// This ensures environment variables are available when the function runs
function getClient() {
  try {
    return getSupabaseClient();
  } catch (error) {
    console.error('[api/blog] Failed to initialize Supabase client:', error);
    throw databaseError('Database not configured');
  }
}

/**
 * GET /api/blog?action=posts
 * Query params: page, limit, category, tag, author, status
 */
async function getPosts(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const author = req.query.author as string;
    const status = req.query.status as string;

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query - only return published posts for public access
    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        blog_authors!inner(*),
        blog_categories(*)
      `, { count: 'exact' })
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_date', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('blog_categories.slug', category);
    }

    if (author) {
      query = query.eq('blog_authors.slug', author);
    }

    // For tag filtering, we need a different approach since it's a many-to-many relationship
    if (tag) {
      // First get tag ID
      const { data: tagData } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tag)
        .single();

      if (tagData) {
        // Get post IDs that have this tag
        const { data: postTags } = await supabase
          .from('blog_post_tags')
          .select('post_id')
          .eq('tag_id', tagData.id);

        if (postTags && postTags.length > 0) {
          const postIds = postTags.map(pt => pt.post_id);
          query = query.in('id', postIds);
        } else {
          // No posts with this tag
          res.status(200).json({ posts: [], total: 0, page, limit });
          return;
        }
      } else {
        // Tag doesn't exist
        res.status(200).json({ posts: [], total: 0, page, limit });
        return;
      }
    }

    // Apply pagination
    query = query.range(from, to);

    // Execute query with retry logic
    const result = await withRetry(async () => {
      const { data: posts, error, count } = await query;
      
      if (error) {
        logDatabaseError('getPosts', error, { page, limit, category, tag, author });
        throw error;
      }
      
      return { data: posts, count };
    });

    const { data: posts, count } = result;

    // Transform data to include author and category as nested objects
    const transformedPosts = posts?.map(post => ({
      ...post,
      author: post.blog_authors,
      category: post.blog_categories,
    })) || [];

    res.status(200).json({
      posts: transformedPosts,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch posts');
  }
}

/**
 * GET /api/blog?action=post&slug={slug}
 */
async function getPostBySlug(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    const slug = req.query.slug as string;

    if (!slug) {
      throw notFoundError('Post');
    }

    // Fetch post with author and category populated
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_authors(*),
        blog_categories(*)
      `)
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      throw notFoundError('Post');
    }

    // Check status
    if (post.status === 'archived') {
      res.status(410).json({ 
        error: 'Gone',
        message: 'Post has been archived',
        statusCode: 410
      });
      return;
    }

    // Only return published posts for public access
    if (post.status !== 'published') {
      throw notFoundError('Post');
    }

    // Fetch tags for this post
    const { data: postTags } = await supabase
      .from('blog_post_tags')
      .select('blog_tags(*)')
      .eq('post_id', post.id);

    const tags = postTags?.map(pt => pt.blog_tags).filter(Boolean) || [];

    // Transform data
    const transformedPost = {
      ...post,
      author: post.blog_authors,
      category: post.blog_categories,
      tags,
    };

    res.status(200).json(transformedPost);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch post');
  }
}

/**
 * GET /api/blog?action=authors
 */
async function getAuthors(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    
    // Get all authors with post counts
    const { data: authors, error } = await supabase
      .from('blog_authors')
      .select(`
        *,
        blog_posts!inner(id)
      `)
      .eq('blog_posts.status', 'published')
      .is('blog_posts.deleted_at', null);

    if (error) {
      throw databaseError('Failed to fetch authors');
    }

    // Count posts per author and sort
    const authorMap = new Map<string, { author: BlogAuthor; postCount: number }>();

    authors?.forEach((item: any) => {
      const authorId = item.id;
      if (!authorMap.has(authorId)) {
        authorMap.set(authorId, {
          author: {
            id: item.id,
            slug: item.slug,
            name: item.name,
            bio: item.bio,
            image_url: item.image_url,
            email: item.email,
            job_title: item.job_title,
            expertise: item.expertise,
            knows_about: item.knows_about,
            created_at: item.created_at,
            updated_at: item.updated_at,
          },
          postCount: 0,
        });
      }
      authorMap.get(authorId)!.postCount++;
    });

    // Convert to array and sort by post count
    const sortedAuthors = Array.from(authorMap.values())
      .sort((a, b) => b.postCount - a.postCount)
      .map(({ author, postCount }) => ({
        ...author,
        post_count: postCount,
      }));

    res.status(200).json(sortedAuthors);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch authors');
  }
}

/**
 * GET /api/blog?action=author&slug={slug}
 */
async function getAuthorBySlug(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    const slug = req.query.slug as string;

    if (!slug) {
      throw notFoundError('Author');
    }

    // Fetch author
    const { data: author, error: authorError } = await supabase
      .from('blog_authors')
      .select('*')
      .eq('slug', slug)
      .single();

    if (authorError || !author) {
      throw notFoundError('Author');
    }

    // Fetch all published posts by this author
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_categories(*)
      `)
      .eq('author_id', author.id)
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('published_date', { ascending: false });

    if (postsError) {
      throw databaseError('Failed to fetch author posts');
    }

    res.status(200).json({
      author,
      posts: posts || [],
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch author');
  }
}

/**
 * GET /api/blog?action=categories
 */
async function getCategories(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    
    // Get all categories
    const { data: categories, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw databaseError('Failed to fetch categories');
    }

    // Get post counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count } = await supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('status', 'published')
          .is('deleted_at', null);

        return {
          ...category,
          post_count: count || 0,
        };
      })
    );

    res.status(200).json(categoriesWithCounts);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch categories');
  }
}

/**
 * GET /api/blog?action=tags
 */
async function getTags(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const supabase = getClient();
    
    // Get all tags
    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw databaseError('Failed to fetch tags');
    }

    res.status(200).json(tags || []);
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch tags');
  }
}

/**
 * Main handler
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = req.query.action as string || 'posts';

  // Check if this is an admin action (starts with 'admin-')
  if (action.startsWith('admin-')) {
    // Admin endpoints temporarily disabled due to Vercel function limit
    return res.status(501).json({
      error: 'Not Implemented',
      message: 'Admin blog endpoints are being consolidated. Please use direct admin endpoint temporarily.',
      action,
      timestamp: new Date().toISOString()
    });
  }

  // Public endpoints - only allow GET
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    switch (action) {
      case 'posts':
        await getPosts(req, res);
        break;
      case 'post':
        await getPostBySlug(req, res);
        break;
      case 'authors':
        await getAuthors(req, res);
        break;
      case 'author':
        await getAuthorBySlug(req, res);
        break;
      case 'categories':
        await getCategories(req, res);
        break;
      case 'tags':
        await getTags(req, res);
        break;
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[api/blog] Unhandled error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default handler;
