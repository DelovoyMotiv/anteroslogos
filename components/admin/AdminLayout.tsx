import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  FolderOpen, 
  LogOut, 
  Menu, 
  X,
  Home
} from 'lucide-react';
import { supabase, getCurrentUser } from '../../lib/supabase';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        navigate('/auth/login?redirect=/admin/blog');
        return;
      }

      setIsAuthenticated(true);
      setUserName(user.email || 'Admin');

      // Check if user has admin role
      if (supabase) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          setIsAdmin(false);
          setLoading(false);
          navigate('/');
          return;
        }

        const metadata = profile.metadata as { role?: string } | null;
        const hasAdminRole = metadata?.role === 'admin';

        if (!hasAdminRole) {
          setIsAdmin(false);
          setLoading(false);
          navigate('/');
          return;
        }

        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      navigate('/auth/login?redirect=/admin/blog');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  const navItems = [
    { path: '/admin/blog', label: 'Posts', icon: FileText },
    { path: '/admin/blog/authors', label: 'Authors', icon: Users },
    { path: '/admin/blog/categories', label: 'Categories & Tags', icon: FolderOpen },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/blog') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-brand-text/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-brand-secondary/95 backdrop-blur-sm border-b border-brand-accent/20">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-brand-text">Blog Admin</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-brand-text hover:text-brand-accent transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-brand-secondary/50 backdrop-blur-sm border-r border-brand-accent/20 z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-brand-accent/20">
            <h1 className="text-2xl font-bold text-brand-text mb-1">Blog Admin</h1>
            <p className="text-sm text-brand-text/60">{userName}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-accent text-white'
                      : 'text-brand-text/70 hover:bg-brand-accent/10 hover:text-brand-text'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-brand-accent/20 space-y-2">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-brand-text/70 hover:bg-brand-accent/10 hover:text-brand-text transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Back to Site</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-brand-text/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 p-6 lg:p-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
