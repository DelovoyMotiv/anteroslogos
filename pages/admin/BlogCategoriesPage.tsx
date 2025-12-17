import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import CategoryTagManager from '../../components/admin/CategoryTagManager';

export default function BlogCategoriesPage() {
  return (
    <AdminLayout>
      <CategoryTagManager />
    </AdminLayout>
  );
}
