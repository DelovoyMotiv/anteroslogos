import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import BlogPostForm from '../../components/admin/BlogPostForm';

export default function BlogNewPostPage() {
  return (
    <AdminLayout>
      <BlogPostForm mode="create" />
    </AdminLayout>
  );
}
