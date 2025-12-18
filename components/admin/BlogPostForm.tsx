import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, Clock } from 'lucide-react';
import BlogPostEditor from './BlogPostEditor';
import type { BlogPost, BlogAuthor, BlogCategory, BlogTag } from '../../types/database.types';
import { supabase } from '../../lib/supabase';
import { validateBlogPostForm, generateSlug as generateSlugUtil } from '../../lib/blog/clientValidation';

interface BlogPostFormProps {
  post?: BlogPost;
  mode: 'create' | 'edit';
}

export default function BlogPostForm({ post, mode }: BlogPostFormProps) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [content, setContent] = useState(post?.content || '');
  const [authorId, setAuthorId] = useState(post?.author_id || '');
  const [categoryId, setCategoryId] = useState(post?.category_id || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(post?.status || 'draft');
  const [featured, setFeatured] = useState(post?.featured || false);
  const [readTime, setReadTime] = useState(post?.read_time || 5);
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || '');
  const [metaKeywords, setMetaKeywords] = useState(post?.meta_keywords?.join(', ') || '');
  const [ogImageUrl, setOgImageUrl] = useState(post?.og_image_url || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(post?.tags?.map(t => t.name) || []);
  const [tagInput, setTagInput] = useState('');

  // Data for dropdowns
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (mode === 'create' || status === 'draft') {
      const interval = setInterval(() => {
        handleAutoSave();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [title, content, excerpt, authorId, categoryId, status]);

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && title && !slug) {
      const generatedSlug = generateSlugUtil(title);
      setSlug(generatedSlug);
    }
  }, [title, mode]);

  // Calculate read time from content
  useEffect(() => {
    if (content) {
      const wordCount = content.split(/\s+/).length;
      const calculatedReadTime = Math.ceil(wordCount / 200);
      setReadTime(calculatedReadTime);
    }
  }, [content]);

  const fetchDropdownData = async () => {
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Use admin API to get ALL authors (including those without posts)
      const [authorsRes, categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/admin/blog?action=authors', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }),
        fetch('/api/blog?action=categories'),
        fetch('/api/blog?action=tags'),
      ]);

      if (authorsRes.ok) {
        const authorsData = await authorsRes.json();
        setAuthors(authorsData);
        if (!authorId && authorsData.length > 0) {
          setAuthorId(authorsData[0].id);
        }
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData);
      }
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const validateForm = (): boolean => {
    const validation = validateBlogPostForm({
      title,
      slug,
      excerpt,
      content,
      author_id: authorId,
      read_time: readTime,
      og_image_url: ogImageUrl,
    });

    setErrors(validation.errors);
    return validation.valid;
  };

  const handleAutoSave = async () => {
    if (!title || !content || mode === 'create') return;

    setAutoSaving(true);
    try {
      await handleSave(true);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave && !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const postData = {
        title,
        slug,
        excerpt,
        content,
        author_id: authorId,
        category_id: categoryId || null,
        status,
        featured,
        read_time: readTime,
        meta_description: metaDescription || null,
        meta_keywords: metaKeywords ? metaKeywords.split(',').map(k => k.trim()) : null,
        og_image_url: ogImageUrl || null,
        tags: selectedTags, // API expects 'tags' array, not 'tag_ids'
      };

      const url = mode === 'create' 
        ? '/api/admin/blog?action=create-post'
        : `/api/admin/blog?action=update-post&id=${post!.id}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle validation errors from API
        if (errorData.details && Array.isArray(errorData.details)) {
          const apiErrors: Record<string, string> = {};
          errorData.details.forEach((detail: string) => {
            // Parse field-specific errors
            if (detail.includes('title')) apiErrors.title = detail;
            else if (detail.includes('slug')) apiErrors.slug = detail;
            else if (detail.includes('excerpt')) apiErrors.excerpt = detail;
            else if (detail.includes('content')) apiErrors.content = detail;
            else if (detail.includes('author')) apiErrors.authorId = detail;
            else if (detail.includes('read_time')) apiErrors.readTime = detail;
          });
          
          if (Object.keys(apiErrors).length > 0) {
            setErrors(apiErrors);
            return;
          }
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to save post');
      }

      if (!isAutoSave) {
        navigate('/admin/blog');
      } else {
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error('Error saving post:', err);
      if (!isAutoSave) {
        alert(err instanceof Error ? err.message : 'Failed to save post');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      navigate('/admin/blog');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-text">
            {mode === 'create' ? 'Create New Post' : 'Edit Post'}
          </h2>
          {lastSaved && (
            <p className="text-sm text-brand-text/60 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last saved: {lastSaved.toLocaleTimeString()}
              {autoSaving && <span className="text-brand-accent">(Auto-saving...)</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/50 text-brand-text rounded-lg font-semibold hover:bg-brand-secondary transition-colors"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Post
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              className={`w-full px-4 py-3 bg-brand-bg border ${errors.title ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                const newSlug = e.target.value.toLowerCase();
                setSlug(newSlug);
                // Clear error on change
                if (errors.slug) {
                  const newErrors = { ...errors, slug: '' };
                  setErrors(newErrors);
                }
              }}
              onBlur={() => {
                // Validate on blur
                const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                if (slug && !slugRegex.test(slug)) {
                  const newErrors = { 
                    ...errors, 
                    slug: 'Slug must contain only lowercase letters, numbers, and hyphens' 
                  };
                  setErrors(newErrors);
                }
              }}
              placeholder="post-url-slug"
              className={`w-full px-4 py-3 bg-brand-bg border ${errors.slug ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
            />
            {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
            <p className="text-xs text-brand-text/60 mt-1">
              URL: /blog/{slug || 'your-slug'}
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-brand-text/70 mb-2">
              Excerpt *
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the post..."
              rows={3}
              className={`w-full px-4 py-3 bg-brand-bg border ${errors.excerpt ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent resize-none`}
            />
            {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt}</p>}
          </div>

          {/* Content Editor */}
          <BlogPostEditor
            content={content}
            onChange={setContent}
            metadata={{ title, excerpt, og_image_url: ogImageUrl }}
          />
          {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-brand-secondary/30 rounded-lg p-4 border border-brand-accent/10">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Publishing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 text-brand-accent bg-brand-bg border-brand-accent/20 rounded focus:ring-brand-accent"
                />
                <label htmlFor="featured" className="text-sm text-brand-text/70">
                  Featured post
                </label>
              </div>
            </div>
          </div>

          {/* Author & Category */}
          <div className="bg-brand-secondary/30 rounded-lg p-4 border border-brand-accent/10">
            <h3 className="text-lg font-semibold text-brand-text mb-4">Organization</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Author *
                </label>
                <select
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className={`w-full px-3 py-2 bg-brand-bg border ${errors.authorId ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
                >
                  <option value="">Select author...</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
                {errors.authorId && <p className="text-red-500 text-sm mt-1">{errors.authorId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Read Time (minutes) *
                </label>
                <input
                  type="number"
                  value={readTime}
                  onChange={(e) => setReadTime(parseInt(e.target.value) || 0)}
                  min="1"
                  className={`w-full px-3 py-2 bg-brand-bg border ${errors.readTime ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
                />
                {errors.readTime && <p className="text-red-500 text-sm mt-1">{errors.readTime}</p>}
                <p className="text-xs text-brand-text/60 mt-1">
                  Auto-calculated from content
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        const newTag = tagInput.trim().toLowerCase();
                        if (!selectedTags.includes(newTag)) {
                          setSelectedTags([...selectedTags, newTag]);
                        }
                        setTagInput('');
                      }
                    }}
                    placeholder="Type tag and press Enter..."
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-accent"
                  />
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-brand-accent/10 text-brand-accent rounded text-xs"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTags(selectedTags.filter((_, i) => i !== index));
                            }}
                            className="hover:text-brand-accent/70"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-brand-text/60">
                    Press Enter to add tags
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-brand-secondary/30 rounded-lg p-4 border border-brand-accent/10">
            <h3 className="text-lg font-semibold text-brand-text mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-accent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  OG Image URL
                </label>
                <input
                  type="url"
                  value={ogImageUrl}
                  onChange={(e) => {
                    setOgImageUrl(e.target.value);
                    // Clear error on change
                    if (errors.ogImageUrl) {
                      const newErrors = { ...errors, ogImageUrl: '' };
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={() => {
                    // Validate URL on blur
                    if (ogImageUrl) {
                      try {
                        new URL(ogImageUrl);
                      } catch {
                        const newErrors = { 
                          ...errors, 
                          ogImageUrl: 'Must be a valid URL' 
                        };
                        setErrors(newErrors);
                      }
                    }
                  }}
                  placeholder="https://..."
                  className={`w-full px-3 py-2 bg-brand-bg border ${errors.ogImageUrl ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text text-sm focus:outline-none focus:border-brand-accent`}
                />
                {errors.ogImageUrl && <p className="text-red-500 text-xs mt-1">{errors.ogImageUrl}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
