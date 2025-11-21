/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and content area
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'sonner';
import { AuthGuard } from '../../../lib/dashboard/auth-guard';

export function DashboardLayout() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
      
      {/* Main content - offset by sidebar width */}
      <main className="pl-64 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-text)',
            border: '1px solid var(--toast-border)',
          },
        }}
      />
      </div>
    </AuthGuard>
  );
}
