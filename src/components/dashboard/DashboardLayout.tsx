/**
 * Dashboard Layout
 * Main layout wrapper with sidebar and content area
 */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'sonner';
import { AuthGuard } from '../../../lib/dashboard/auth-guard';
import DigitalBackground from '../../../components/DigitalBackground';

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar state changes from localStorage
  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem('sidebar-collapsed');
      setSidebarCollapsed(saved === 'true');
    };

    // Initial check
    checkSidebarState();

    // Listen for storage events (when sidebar toggles)
    window.addEventListener('storage', checkSidebarState);
    
    // Also listen for custom event from Sidebar component
    const handleSidebarToggle = () => checkSidebarState();
    window.addEventListener('sidebar-toggle', handleSidebarToggle);

    return () => {
      window.removeEventListener('storage', checkSidebarState);
      window.removeEventListener('sidebar-toggle', handleSidebarToggle);
    };
  }, []);

  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <div className="min-h-screen bg-black relative">
        {/* Animated background - same as main site */}
        <DigitalBackground />
        
        {/* Content layer with glassmorphism */}
        <div className="relative z-10">
          <Sidebar />
        
          {/* Main content - offset by sidebar width, HUD-style */}
          <main 
            className={`
              transition-all duration-300 ease-in-out
              pt-16 lg:pt-0
              ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'}
            `}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
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
