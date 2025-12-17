import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import BlogPostList from '../../components/admin/BlogPostList';

export default function BlogAdminPage() {
  return (
    <AdminLayout>
      <BlogPostList />
    </AdminLayout>
  );
}
