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
  FileJson,
  Bot,
  ChevronDown,
  ChevronRight,
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
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Agent Keys', href: '/dashboard/agent-keys', icon: Cpu },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

// Audit Suite items
const auditNav: NavItem[] = [
  { name: 'GEO Audit', href: '/dashboard/audit', icon: Search },
  { name: 'AUX Audit', href: '/dashboard/aux-audit', icon: Bot },
];

// Identity Layer items
const identityNav: NavItem[] = [
  { name: 'Agent Manifest', href: '/dashboard/agent-manifest', icon: FileJson },
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
  const [auditSuiteExpanded, setAuditSuiteExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setCollapsed(saved === 'true');
    }
    
    const auditExpanded = localStorage.getItem('audit-suite-expanded');
    if (auditExpanded !== null) {
      setAuditSuiteExpanded(auditExpanded === 'true');
    }
  }, []);

  // Save collapsed state
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
    
    // Dispatch custom event to notify DashboardLayout
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  // Toggle audit suite section
  const toggleAuditSuite = () => {
    const newState = !auditSuiteExpanded;
    setAuditSuiteExpanded(newState);
    localStorage.setItem('audit-suite-expanded', String(newState));
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);


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
    <>
      {/* Mobile Menu Button - Fixed at top */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black/70 backdrop-blur-xl border border-slate-800/50 rounded-lg text-slate-300 hover:text-slate-100 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-screen bg-black/70 backdrop-blur-xl border-r border-slate-800/50 flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-56'}
          lg:z-40 z-50
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
              AI Audit Platform
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

        {/* Audit Suite Section */}
        <div className="px-3 py-3 border-t border-slate-800/50">
          {!collapsed ? (
            <>
              <button
                onClick={toggleAuditSuite}
                className="flex items-center justify-between w-full px-2 mb-2 text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider hover:text-slate-500 transition-colors"
              >
                <span>Audit Suite</span>
                {auditSuiteExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              {auditSuiteExpanded && (
                <nav className="space-y-0.5">
                  {auditNav.map((item) => {
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
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="ml-2.5 text-xs font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </>
          ) : (
            <nav className="space-y-0.5">
              {auditNav.map((item) => {
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
                    title={item.name}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Identity Layer Section */}
        <div className="px-3 py-3 border-t border-slate-800/50">
          {!collapsed && (
            <h3 className="text-[10px] font-mono font-semibold text-slate-600 uppercase tracking-wider mb-2 px-2">
              Identity Layer
            </h3>
          )}
          <nav className="space-y-0.5">
            {identityNav.map((item) => {
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
    </>
  );
}
