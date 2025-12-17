import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AuthorManager from '../../components/admin/AuthorManager';

export default function BlogAuthorsPage() {
  return (
    <AdminLayout>
      <AuthorManager />
    </AdminLayout>
  );
}
