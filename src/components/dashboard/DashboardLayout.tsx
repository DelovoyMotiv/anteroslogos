/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and content area
 */

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'sonner';
import { AuthGuard } from '../../../lib/dashboard/auth-guard';
import DigitalBackground from '../../../components/DigitalBackground';

export function DashboardLayout() {
  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <div className="min-h-screen bg-black relative">
        {/* Animated background - same as main site */}
        <DigitalBackground />
        
        {/* Content layer with glassmorphism */}
        <div className="relative z-10">
          <Sidebar />
        
          {/* Main content - offset by sidebar width, HUD-style */}
          <main className="pl-64 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>

      {/* Toast notifications - HUD style */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          className: 'font-mono text-xs',
          style: {
            background: 'rgb(15 23 42 / 0.95)',
            color: 'rgb(226 232 240)',
            border: '1px solid rgb(51 65 85 / 0.5)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
      </div>
    </AuthGuard>
  );
}

export default DashboardLayout;
