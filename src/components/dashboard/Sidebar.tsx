// @ts-nocheck
/**
 * Dashboard Sidebar
 * Collapsible navigation with Vercel/Linear/Claude UX
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Key,
  Cpu,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/dashboard/auth-guard';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Agent Keys', href: '/dashboard/agent-keys', icon: Cpu },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'agency'>('free');

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Fetch user plan
  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('current_plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentPlan(data.current_plan as 'free' | 'pro' | 'agency');
        }
      });
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const planColors = {
    free: 'bg-gray-500',
    pro: 'bg-blue-500',
    agency: 'bg-purple-500',
  };

  const planLabels = {
    free: 'Free',
    pro: 'Pro',
    agency: 'Agency',
  };

  return (
    <div
      className={`
        fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Anóteros
            </span>
          </Link>
        )}
        
        <button
          onClick={toggleCollapsed}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-5 h-5 text-gray-500 transition-transform ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2 rounded-lg transition-colors group
                ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`
                  w-5 h-5 flex-shrink-0
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}
                `}
              />
              {!collapsed && (
                <span className="ml-3 text-sm font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
        {/* Plan Badge */}
        {!collapsed && (
          <div
            className={`
              ${planColors[currentPlan]} text-white px-3 py-1.5 rounded-lg text-xs font-semibold
              flex items-center justify-between
            `}
          >
            <span>{planLabels[currentPlan]} Plan</span>
            {currentPlan === 'free' && (
              <Link
                to="/dashboard/billing"
                className="text-white/80 hover:text-white underline"
              >
                Upgrade
              </Link>
            )}
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
              {user.email?.[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className={`
            flex items-center w-full px-3 py-2 rounded-lg transition-colors
            text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20
            hover:text-red-600 dark:hover:text-red-400
          `}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="ml-3 text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
