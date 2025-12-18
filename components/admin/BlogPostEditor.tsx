import React, { useState } from 'react';
import { Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface BlogPostEditorProps {
  content: string;
  onChange: (content: string) => void;
  metadata?: {
    title?: string;
    excerpt?: string;
    meta_description?: string;
    og_image_url?: string;
  };
}

export default function BlogPostEditor({ content, onChange, metadata }: BlogPostEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      if (!supabase) {
        throw new Error('Supabase not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/blog?action=upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      // Insert markdown image syntax at cursor position
      const imageMarkdown = `\n![${file.name}](${data.url})\n`;
      onChange(content + imageMarkdown);
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };



  return (
    <div className="space-y-4">
      {/* Editor Controls */}
      <div className="flex items-center justify-between bg-brand-secondary/30 rounded-lg p-3 border border-brand-accent/10">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-brand-accent/10 text-brand-accent rounded-lg cursor-pointer hover:bg-brand-accent/20 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Upload Image</span>
              </>
            )}
          </label>
          <span className="text-xs text-brand-text/60">
            Supports: JPG, PNG, GIF (max 5MB)
          </span>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-3 py-2 bg-brand-secondary/50 text-brand-text rounded-lg hover:bg-brand-secondary transition-colors"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-sm font-medium">Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Show Preview</span>
            </>
          )}
        </button>
      </div>

      {/* Editor/Preview Layout */}
      <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Markdown Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-brand-text/70">
            Content (Markdown)
          </label>
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your post content in Markdown..."
            className="w-full h-[600px] px-4 py-3 bg-brand-bg border border-brand-accent/20 rounded-lg text-brand-text font-mono text-sm focus:outline-none focus:border-brand-accent resize-none"
          />
          <div className="text-xs text-brand-text/60 space-y-1">
            <p className="font-semibold">Markdown Quick Reference:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span># Heading 1</span>
              <span>**bold text**</span>
              <span>## Heading 2</span>
              <span>*italic text*</span>
              <span>### Heading 3</span>
              <span>`inline code`</span>
              <span>[link text](url)</span>
              <span>* list item</span>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text/70">
              Live Preview
            </label>
            <div className="h-[600px] px-6 py-4 bg-brand-secondary/20 border border-brand-accent/10 rounded-lg overflow-y-auto">
              {/* Preview Header */}
              {metadata && (
                <div className="mb-8 pb-6 border-b border-brand-accent/10">
                  {metadata.title && (
                    <h1 className="text-3xl font-bold text-brand-text mb-3">
                      {metadata.title}
                    </h1>
                  )}
                  {metadata.excerpt && (
                    <p className="text-lg text-brand-text/70 mb-4">
                      {metadata.excerpt}
                    </p>
                  )}
                  {metadata.og_image_url && (
                    <img
                      src={metadata.og_image_url}
                      alt="Featured"
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                </div>
              )}
              
              {/* Preview Content */}
              {content ? (
                <MarkdownRenderer 
                  content={content}
                  className="prose prose-invert max-w-none"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-brand-text/40">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Preview will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
