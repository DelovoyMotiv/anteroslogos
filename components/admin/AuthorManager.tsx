import React, { useEffect, useState } from 'react';
import { Edit, Trash2, Plus, User, FileText, X, Save } from 'lucide-react';
import type { BlogAuthor } from '../../types/database.types';
import { supabase } from '../../lib/supabase';

export default function AuthorManager() {
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<BlogAuthor | null>(null);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [expertise, setExpertise] = useState('');
  const [knowsAbout, setKnowsAbout] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blog?action=authors');
      if (!response.ok) {
        throw new Error('Failed to fetch authors');
      }

      const data = await response.json();
      setAuthors(data);

      // Fetch post counts for each author
      const counts: Record<string, number> = {};
      for (const author of data) {
        const postsRes = await fetch(`/api/blog?action=posts&author=${author.slug}&limit=1`);
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          counts[author.id] = postsData.total || 0;
        }
      }
      setPostCounts(counts);
    } catch (err) {
      console.error('Error fetching authors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setBio('');
    setImageUrl('');
    setEmail('');
    setJobTitle('');
    setExpertise('');
    setKnowsAbout('');
    setFormErrors({});
    setEditingAuthor(null);
  };

  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (author: BlogAuthor) => {
    setName(author.name);
    setSlug(author.slug);
    setBio(author.bio || '');
    setImageUrl(author.image_url || '');
    setEmail(author.email || '');
    setJobTitle(author.job_title || '');
    setExpertise(author.expertise?.join(', ') || '');
    setKnowsAbout(author.knows_about?.join(', ') || '');
    setEditingAuthor(author);
    setShowForm(true);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    if (!slug.trim()) {
      errors.slug = 'Slug is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
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

      const authorData = {
        name,
        slug,
        bio: bio || null,
        image_url: imageUrl || null,
        email: email || null,
        job_title: jobTitle || null,
        expertise: expertise ? expertise.split(',').map(e => e.trim()) : null,
        knows_about: knowsAbout ? knowsAbout.split(',').map(k => k.trim()) : null,
      };

      const url = editingAuthor
        ? `/api/admin/blog?action=update-author&id=${editingAuthor.id}`
        : '/api/admin/blog?action=create-author';
      
      const method = editingAuthor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(authorData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save author');
      }

      // Refresh the list
      await fetchAuthors();
      handleCancel();
    } catch (err) {
      console.error('Error saving author:', err);
      alert(err instanceof Error ? err.message : 'Failed to save author');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (authorId: string) => {
    if (!confirm('Are you sure you want to delete this author? This cannot be undone.')) {
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

      const response = await fetch(`/api/admin/blog?action=delete-author&id=${authorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete author');
      }

      // Refresh the list
      fetchAuthors();
    } catch (err) {
      console.error('Error deleting author:', err);
      alert('Failed to delete author');
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingAuthor && name && !slug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [name, editingAuthor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text/60">Loading authors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500">
        <p className="font-semibold">Error loading authors</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-text">Authors</h2>
          <p className="text-brand-text/60 mt-1">Manage blog authors and contributors</p>
        </div>
        {!showForm && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Author
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-brand-secondary/30 rounded-lg p-6 border border-brand-accent/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-brand-text">
              {editingAuthor ? 'Edit Author' : 'New Author'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 text-brand-text/70 hover:text-brand-text hover:bg-brand-accent/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Author name"
                className={`w-full px-3 py-2 bg-brand-bg border ${formErrors.name ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="author-slug"
                className={`w-full px-3 py-2 bg-brand-bg border ${formErrors.slug ? 'border-red-500' : 'border-brand-accent/20'} rounded-lg text-brand-text focus:outline-none focus:border-brand-accent`}
              />
              {formErrors.slug && <p className="text-red-500 text-sm mt-1">{formErrors.slug}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="author@example.com"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Senior Writer"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Author biography..."
                rows={3}
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Expertise (comma-separated)
              </label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="SEO, Content Marketing, GEO"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text/70 mb-2">
                Knows About (comma-separated)
              </label>
              <input
                type="text"
                value={knowsAbout}
                onChange={(e) => setKnowsAbout(e.target.value)}
                placeholder="Digital Marketing, AI, Technology"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-brand-secondary/50 text-brand-text rounded-lg font-semibold hover:bg-brand-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
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
                  Save Author
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Authors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {authors.map((author) => (
          <div
            key={author.id}
            className="bg-brand-secondary/20 rounded-lg p-5 border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {author.image_url ? (
                  <img
                    src={author.image_url}
                    alt={author.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-brand-accent" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-brand-text mb-1">{author.name}</h3>
                {author.job_title && (
                  <p className="text-sm text-brand-text/60 mb-2">{author.job_title}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-brand-text/60">
                  <FileText className="w-4 h-4" />
                  <span>{postCounts[author.id] || 0} posts</span>
                </div>
              </div>
            </div>

            {author.bio && (
              <p className="text-sm text-brand-text/70 mt-3 line-clamp-2">
                {author.bio}
              </p>
            )}

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-brand-accent/10">
              <button
                onClick={() => handleEdit(author)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">Edit</span>
              </button>
              <button
                onClick={() => handleDelete(author.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {authors.length === 0 && !showForm && (
        <div className="text-center py-12 text-brand-text/60">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No authors yet. Create your first author to get started.</p>
        </div>
      )}
    </div>
  );
}
