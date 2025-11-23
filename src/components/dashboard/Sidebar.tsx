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
    
    // Dev mode: skip if supabase not configured (local only)
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev && !supabase) {
      console.warn('[DEV MODE] Sidebar: Supabase not configured, using default free plan (LOCAL ONLY)');
      setCurrentPlan('free');
      return;
    }

    supabase
      .from('profiles')
      .select('current_plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentPlan(data.current_plan as 'free' | 'pro' | 'agency');
        }
      })
      .catch((error) => {
        console.error('Failed to fetch user plan:', error);
        setCurrentPlan('free');
      });
  }, [user]);

  const handleSignOut = async () => {
    // Dev mode: just redirect (local only)
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev && !supabase) {
      console.warn('[DEV MODE] Sidebar: Bypassing signOut (LOCAL ONLY)');
      window.location.href = '/';
      return;
    }
    
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const planColors = {
    free: 'border-slate-700/50 bg-slate-900/50',
    pro: 'border-blue-500/30 bg-blue-950/30',
    agency: 'border-purple-500/30 bg-purple-950/30',
  };

  const planDots = {
    free: 'bg-slate-500',
    pro: 'bg-blue-400',
    agency: 'bg-purple-400',
  };

  const planLabels = {
    free: 'FREE',
    pro: 'PRO',
    agency: 'AGENCY',
  };

  return (
    <div
      className={`
        fixed top-0 left-0 h-screen bg-black/60 backdrop-blur-xl border-r border-slate-800/50
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Header - Compact HUD */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-slate-800/50">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 border border-blue-500/50 bg-blue-950/30 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500" />
            </div>
            <span className="font-mono font-bold text-sm text-slate-200 tracking-tight">
              ANÓTEROS
            </span>
          </Link>
        )}
        
        <button
          onClick={toggleCollapsed}
          className="p-1.5 border border-slate-800/50 hover:border-slate-700 hover:bg-slate-900/50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigation - Dense */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-2.5 py-2 transition-all group border-l-2
                ${
                  isActive
                    ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-300 hover:border-slate-700'
                }
              `}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`
                  w-4 h-4 flex-shrink-0
                  ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}
                `}
              />
              {!collapsed && (
                <span className="ml-2.5 text-xs font-mono font-medium tracking-wide">{item.name.toUpperCase()}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Compact HUD */}
      <div className="border-t border-slate-800/50 p-2.5 space-y-2">
        {/* Plan Badge - Minimal */}
        {!collapsed && (
          <div
            className={`
              border ${planColors[currentPlan]} px-2.5 py-1.5 text-[10px] font-mono font-bold
              flex items-center justify-between backdrop-blur-sm
            `}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${planDots[currentPlan]}`} />
              <span className="text-slate-300 tracking-widest">{planLabels[currentPlan]}</span>
            </div>
            {currentPlan === 'free' && (
              <Link
                to="/dashboard/billing"
                className="text-blue-400 hover:text-blue-300 uppercase tracking-wider"
              >
                UP
              </Link>
            )}
          </div>
        )}

        {/* User Info - Minimal */}
        {user && !collapsed && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 border border-slate-800/50 bg-slate-900/30">
            <div className="w-6 h-6 border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-400 text-[10px] font-mono font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Sign Out - Compact */}
        <button
          onClick={handleSignOut}
          className={`
            flex items-center w-full px-2.5 py-1.5 transition-colors border border-slate-800/50
            text-slate-500 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400
          `}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span className="ml-2 text-[10px] font-mono font-medium uppercase tracking-wider">Exit</span>}
        </button>
      </div>
    </div>
  );
}
