import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import BlogPostForm from '../../components/admin/BlogPostForm';
import type { BlogPost } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

export default function BlogEditPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/admin/blog');
      return;
    }

    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/admin/blog?action=get-post&id=${id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }

      const data = await response.json();
      setPost(data);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-brand-text/60">Loading post...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !post) {
    return (
      <AdminLayout>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
          <p className="font-semibold">Error loading post</p>
          <p className="text-sm mt-1">{error || 'Post not found'}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <BlogPostForm mode="edit" post={post} />
    </AdminLayout>
  );
}
