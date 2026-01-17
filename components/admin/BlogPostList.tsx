import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  User, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Local interfaces for admin view
interface BlogAuthorData {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

interface BlogCategoryData {
  id: string;
  name: string;
  slug: string;
}

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  published_date: string | null;
  created_at: string;
  author?: BlogAuthorData;
  category?: BlogCategoryData;
}

interface BlogPostListProps {
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

export default function BlogPostList({ onEdit, onDelete }: BlogPostListProps) {
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [authors, setAuthors] = useState<BlogAuthorData[]>([]);
  const [categories, setCategories] = useState<BlogCategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const postsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [statusFilter, categoryFilter, authorFilter, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth token
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Calculate pagination
      const from = (currentPage - 1) * postsPerPage;
      const to = from + postsPerPage - 1;

      // Build query for posts - fetch ALL posts (including drafts) for admin
      let query = supabase
        .from('blog_posts')
        .select(`
          *,
          blog_authors!inner(id, name, slug, image_url),
          blog_categories(id, name, slug)
        `, { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (categoryFilter !== 'all') {
        // Get category ID first
        const { data: category } = await supabase
          .from('blog_categories')
          .select('id')
          .eq('slug', categoryFilter)
          .single();
        
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      if (authorFilter !== 'all') {
        // Get author ID first
        const { data: author } = await supabase
          .from('blog_authors')
          .select('id')
          .eq('slug', authorFilter)
          .single();
        
        if (author) {
          query = query.eq('author_id', author.id);
        }
      }

      // Apply pagination
      query = query.range(from, to);

      // Execute query
      const { data: postsData, error: postsError, count } = await query;

      if (postsError) {
        throw postsError;
      }

      // Transform data to match expected format
      const transformedPosts = (postsData || []).map((post: any) => ({
        ...post,
        author: post.blog_authors,
        category: post.blog_categories,
      }));

      setPosts(transformedPosts);
      setTotalPosts(count || 0);

      // Fetch authors and categories for filters
      const [authorsRes, categoriesRes] = await Promise.all([
        supabase.from('blog_authors').select('id, name, slug, image_url').order('name'),
        supabase.from('blog_categories').select('id, name, slug').order('name'),
      ]);

      if (authorsRes.data) {
        setAuthors(authorsRes.data as BlogAuthorData[]);
      }

      if (categoriesRes.data) {
        setCategories(categoriesRes.data as BlogCategoryData[]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Soft delete the post by setting deleted_at timestamp
      const { error } = await supabase
        .from('blog_posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) {
        throw error;
      }

      // Refresh the list
      fetchData();
      
      if (onDelete) {
        onDelete(postId);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      published: 'bg-green-500/10 text-green-500 border-green-500/20',
      archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalPages = Math.ceil(totalPosts / postsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text/60">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
        <p className="font-semibold">Error loading posts</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-text">Blog Posts</h2>
          <p className="text-brand-text/60 mt-1">Manage your blog content</p>
        </div>
        <Link
          to="/admin/blog/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-brand-secondary/30 rounded-lg p-4 border border-brand-accent/10">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-brand-accent" />
          <span className="text-sm font-semibold text-brand-text">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Author
            </label>
            <select
              value={authorFilter}
              onChange={(e) => {
                setAuthorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
            >
              <option value="all">All Authors</option>
              {authors.map((author) => (
                <option key={author.id} value={author.slug}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-brand-secondary/20 rounded-lg border border-brand-accent/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-brand-secondary/50 border-b border-brand-accent/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-text/70 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-text/70 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-text/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-brand-text/70 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-brand-text/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-accent/10">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-text/60">
                    No posts found
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="hover:bg-brand-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-brand-text truncate">
                            {post.title}
                          </p>
                          <p className="text-sm text-brand-text/60 truncate">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-brand-text/70">
                        <User className="w-4 h-4" />
                        <span>{post.author?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(post.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-brand-text/70">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {post.published_date
                            ? new Date(post.published_date).toLocaleDateString()
                            : 'Not published'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/blog/${post.slug}`}
                          target="_blank"
                          className="p-2 text-brand-text/70 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                          title="View post"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/blog/edit/${post.id}`}
                          className="p-2 text-brand-text/70 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                          title="Edit post"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-brand-text/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-text/60">
            Showing {(currentPage - 1) * postsPerPage + 1} to{' '}
            {Math.min(currentPage * postsPerPage, totalPosts)} of {totalPosts} posts
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 text-brand-text/70 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-brand-text">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-brand-text/70 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
