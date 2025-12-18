import React, { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, FolderOpen, Tag, X, Save, FileText } from 'lucide-react';
import type { BlogCategory, BlogTag } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

type TabType = 'categories' | 'tags';

export default function CategoryTagManager() {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BlogCategory | BlogTag | null>(null);

  // Form state for categories
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState(0);

  // Form state for tags
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/blog?action=categories'),
        fetch('/api/blog?action=tags'),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);

        // Fetch post counts for categories
        const counts: Record<string, number> = {};
        for (const category of categoriesData) {
          const postsRes = await fetch(`/api/blog?action=posts&category=${category.slug}&limit=1`);
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            counts[category.id] = postsData.total || 0;
          }
        }
        setPostCounts(counts);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategoryName('');
    setCategorySlug('');
    setCategoryDescription('');
    setCategoryDisplayOrder(0);
    setTagName('');
    setTagSlug('');
    setFormErrors({});
    setEditingItem(null);
  };

  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditCategory = (category: BlogCategory) => {
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryDescription(category.description || '');
    setCategoryDisplayOrder(category.display_order);
    setEditingItem(category);
    setShowForm(true);
  };

  const handleEditTag = (tag: BlogTag) => {
    setTagName(tag.name);
    setTagSlug(tag.slug);
    setEditingItem(tag);
    setShowForm(true);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const validateCategoryForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!categoryName.trim()) {
      errors.categoryName = 'Name is required';
    }
    if (!categorySlug.trim()) {
      errors.categorySlug = 'Slug is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTagForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!tagName.trim()) {
      errors.tagName = 'Name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCategory = async () => {
    if (!validateCategoryForm()) {
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

      const categoryData = {
        name: categoryName,
        slug: categorySlug,
        description: categoryDescription || null,
        display_order: categoryDisplayOrder,
      };

      const url = editingItem
        ? `/api/admin/blog?action=update-category&id=${(editingItem as BlogCategory).id}`
        : '/api/admin/blog?action=create-category';
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save category');
      }

      await fetchData();
      handleCancel();
    } catch (err) {
      console.error('Error saving category:', err);
      alert(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTag = async () => {
    if (!validateTagForm()) {
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

      const tagData = {
        name: tagName,
        slug: tagSlug || tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };

      const url = editingItem
        ? `/api/admin/blog?action=update-tag&id=${(editingItem as BlogTag).id}`
        : '/api/admin/blog?action=create-tag';
      
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(tagData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save tag');
      }

      await fetchData();
      handleCancel();
    } catch (err) {
      console.error('Error saving tag:', err);
      alert(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
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

      const response = await fetch(`/api/admin/blog?action=delete-category&id=${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to delete category');
      }

      fetchData();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) {
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

      const response = await fetch(`/api/admin/blog?action=delete-tag&id=${tagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to delete tag');
      }

      fetchData();
    } catch (err) {
      console.error('Error deleting tag:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (activeTab === 'categories' && !editingItem && categoryName && !categorySlug) {
      const generatedSlug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setCategorySlug(generatedSlug);
    }
  }, [categoryName, activeTab, editingItem]);

  useEffect(() => {
    if (activeTab === 'tags' && !editingItem && tagName && !tagSlug) {
      const generatedSlug = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setTagSlug(generatedSlug);
    }
  }, [tagName, activeTab, editingItem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
        <p className="font-semibold">Error loading data</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-text">Categories & Tags</h2>
          <p className="text-brand-text/60 mt-1">Organize your blog content</p>
        </div>
        {!showForm && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New {activeTab === 'categories' ? 'Category' : 'Tag'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-accent/10">
        <button
          onClick={() => {
            setActiveTab('categories');
            handleCancel();
          }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'categories'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-text/60 hover:text-brand-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Categories ({categories.length})
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('tags');
            handleCancel();
          }}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'tags'
              ? 'text-brand-accent border-b-2 border-brand-accent'
              : 'text-brand-text/60 hover:text-brand-text'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Tags ({tags.length})
          </div>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-brand-secondary/30 rounded-lg p-6 border border-brand-accent/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-brand-text">
              {editingItem ? 'Edit' : 'New'} {activeTab === 'categories' ? 'Category' : 'Tag'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 text-brand-text/70 hover:text-brand-text hover:bg-brand-accent/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {activeTab === 'categories' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text/70 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category name"
                    className={`w-full px-3 py-2 bg-brand-bg border ${formErrors.categoryName ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
                  />
                  {formErrors.categoryName && <p className="text-red-500 text-sm mt-1">{formErrors.categoryName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text/70 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    placeholder="category-slug"
                    className={`w-full px-3 py-2 bg-brand-bg border ${formErrors.categorySlug ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
                  />
                  {formErrors.categorySlug && <p className="text-red-500 text-sm mt-1">{formErrors.categorySlug}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Description
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Category description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text/70 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={categoryDisplayOrder}
                  onChange={(e) => setCategoryDisplayOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-brand-secondary/50 text-brand-text rounded-lg font-semibold hover:bg-brand-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
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
                      Save Category
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-text/70 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="Tag name"
                    className={`w-full px-3 py-2 bg-brand-bg border ${formErrors.tagName ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
                  />
                  {formErrors.tagName && <p className="text-red-500 text-sm mt-1">{formErrors.tagName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text/70 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={tagSlug}
                    onChange={(e) => setTagSlug(e.target.value)}
                    placeholder="tag-slug"
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                  <p className="text-xs text-brand-text/60 mt-1">Auto-generated if left empty</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-brand-secondary/50 text-brand-text rounded-lg font-semibold hover:bg-brand-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTag}
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
                      Save Tag
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {activeTab === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-brand-secondary/20 rounded-lg p-5 border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-brand-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brand-text mb-1">{category.name}</h3>
                  <p className="text-xs text-brand-text/60">/{category.slug}</p>
                </div>
              </div>

              {category.description && (
                <p className="text-sm text-brand-text/70 mb-3 line-clamp-2">
                  {category.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-brand-text/60 mb-4">
                <FileText className="w-4 h-4" />
                <span>{postCounts[category.id] || 0} posts</span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-brand-accent/10">
                <button
                  onClick={() => handleEditCategory(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && !showForm && (
            <div className="col-span-full text-center py-12 text-brand-text/60">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No categories yet. Create your first category to get started.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group bg-brand-secondary/20 rounded-lg px-4 py-3 border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
            >
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-brand-accent" />
                <span className="font-medium text-brand-text">{tag.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditTag(tag)}
                    className="p-1 text-brand-accent hover:bg-brand-accent/10 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {tags.length === 0 && !showForm && (
            <div className="w-full text-center py-12 text-brand-text/60">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tags yet. Create your first tag to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
