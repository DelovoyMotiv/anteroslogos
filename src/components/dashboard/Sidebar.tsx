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
  Shield,
  FileText,
  Search,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { BalanceDisplay } from './BalanceDisplay';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Main navigation items
const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Audit', href: '/dashboard/audit', icon: Search },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Agent Keys', href: '/dashboard/agent-keys', icon: Cpu },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

// Administration items
const adminNav: NavItem[] = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Security', href: '/dashboard/security', icon: Shield },
  { name: 'Documentation', href: '/docs', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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


  const handleSignOut = async () => {
    // Check if Supabase is configured
    if (!supabase) {
      console.warn('[DEV MODE] Sidebar: Supabase not configured - redirecting to home');
      window.location.href = '/';
      return;
    }
    
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div
      className={`
        fixed top-0 left-0 h-screen bg-black/70 backdrop-blur-xl border-r border-slate-800/50 flex flex-col
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Header - Logo + Subtitle */}
      <div className="px-3 py-4 border-b border-slate-800/50">
        {!collapsed ? (
          <Link to="/dashboard" className="block">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-sm bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-white" />
              </div>
              <span className="font-semibold text-sm text-slate-100">
                Anóteros Lógos
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono ml-7">
              GEO Audit Control
            </p>
          </Link>
        ) : (
          <Link to="/dashboard" className="flex justify-center">
            <div className="w-5 h-5 rounded-sm bg-blue-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-white" />
            </div>
          </Link>
        )}
      </div>

      {/* Scrollable Nav Container */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation Section */}
        <div className="px-3 py-3">
          {!collapsed && (
            <h3 className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider mb-2 px-2">
              Main Navigation
            </h3>
          )}
          <nav className="space-y-0.5">
            {mainNav.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-2 py-1.5 rounded transition-colors group
                    ${
                      isActive
                        ? 'bg-slate-800/50 text-slate-100'
                        : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
                    }
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="ml-2.5 text-xs font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        <div className="px-3 py-3 border-t border-slate-800/50">
          {!collapsed && (
            <h3 className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider mb-2 px-2">
              Administration
            </h3>
          )}
          <nav className="space-y-0.5">
            {adminNav.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-2 py-1.5 rounded transition-colors group
                    ${
                      isActive
                        ? 'bg-slate-800/50 text-slate-100'
                        : 'text-slate-400 hover:bg-slate-900/30 hover:text-slate-200'
                    }
                  `}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="ml-2.5 text-xs font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer - System Status + Version */}
      <div className="border-t border-slate-800/50 p-3 space-y-2">
        {/* Balance Display */}
        {user && (
          <BalanceDisplay userId={user.id} collapsed={collapsed} />
        )}

        {/* User + Sign Out */}
        {!collapsed && user && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                {user.email?.[0].toUpperCase()}
              </div>
              <span className="text-[10px] text-slate-400 truncate flex-1">
                {user.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-2 py-1 rounded text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
            >
              <LogOut className="w-3 h-3 mr-2" />
              Sign Out
            </button>
          </div>
        )}

        {/* System Status - ASI Control Style */}
        {!collapsed && (
          <div className="pt-2 border-t border-slate-800/50">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[9px] text-slate-600 font-mono">System Status:</span>
              <span className="text-[9px] text-emerald-500 font-mono">Operational</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-slate-600 font-mono">All systems nominal</span>
            </div>
          </div>
        )}

        {/* Version */}
        {!collapsed && (
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[9px] text-slate-700 font-mono">Version 1.0.0</span>
            <button
              onClick={toggleCollapsed}
              className="text-slate-700 hover:text-slate-500"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="w-full flex justify-center py-1 text-slate-700 hover:text-slate-500"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
