import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthErrorBoundary } from './src/components/auth/AuthErrorBoundary';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';
import { logConfig, validateConfig } from './lib/config/env';

// Lazy load all route components for optimal bundle splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const GeoAuditPage = lazy(() => import('./pages/GeoAuditPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const AuthorPage = lazy(() => import('./pages/Author'));
const InvestorRelationsPage = lazy(() => import('./pages/InvestorRelationsPage'));
const AgentIdentityPage = lazy(() => import('./pages/AgentIdentityPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const NotFound = lazy(() => import('./components/NotFound'));

// Dashboard layout and pages (protected)
const DashboardLayout = lazy(() => import('./src/components/dashboard/DashboardLayout'));
const DashboardOverview = lazy(() => import('./src/pages/dashboard/OverviewPage'));
const DashboardAudit = lazy(() => import('./src/pages/dashboard/AuditPage'));
const DashboardAPIKeys = lazy(() => import('./src/pages/dashboard/APIKeysPage'));
const DashboardAgentKeys = lazy(() => import('./src/pages/dashboard/AgentKeysPage'));
const DashboardBilling = lazy(() => import('./src/pages/dashboard/BillingPage'));
const DashboardUsage = lazy(() => import('./src/pages/dashboard/UsagePage'));
const DashboardSettings = lazy(() => import('./src/pages/dashboard/SettingsPage'));

// Admin pages (protected)
const BlogAdminPage = lazy(() => import('./pages/admin/BlogAdminPage'));
const BlogNewPostPage = lazy(() => import('./pages/admin/BlogNewPostPage'));
const BlogEditPostPage = lazy(() => import('./pages/admin/BlogEditPostPage'));
const BlogAuthorsPage = lazy(() => import('./pages/admin/BlogAuthorsPage'));
const BlogCategoriesPage = lazy(() => import('./pages/admin/BlogCategoriesPage'));

// Auth pages
const LoginPage = lazy(() => import('./src/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./src/pages/auth/SignupPage'));
const CallbackPage = lazy(() => import('./src/pages/auth/CallbackPage'));
const ForgotPasswordPage = lazy(() => import('./src/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./src/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./src/pages/auth/VerifyEmailPage'));
const OnboardingPage = lazy(() => import('./src/pages/dashboard/OnboardingPage'));

const App: React.FC = () => {
    // Initialize and validate environment configuration on mount
    useEffect(() => {
        // Log configuration (development only)
        logConfig();
        
        // Validate configuration
        const validation = validateConfig();
        
        // Log errors (critical)
        if (validation.errors.length > 0) {
            console.error('❌ Configuration errors:', validation.errors);
        }
        
        // Log warnings (non-critical)
        if (validation.warnings.length > 0) {
            console.warn('⚠️ Configuration warnings:', validation.warnings);
        }
    }, []);

    return (
        <ErrorBoundary>
            <Router>
                <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                        
                        {/* 301 Redirects */}
                        <Route path="/geo-vs-seo" element={<Navigate to="/knowledge-base/geo-vs-seo" replace />} />
                        <Route path="/geo-audit" element={<Navigate to="/method" replace />} />
                        <Route path="/method" element={<GeoAuditPage />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:slug" element={<BlogPost />} />
                        <Route path="/author/:slug" element={<AuthorPage />} />
                        <Route path="/investors" element={<InvestorRelationsPage />} />
                        <Route path="/agent-identity" element={<AgentIdentityPage />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                        
                        {/* Auth Routes (wrapped in AuthErrorBoundary) */}
                        <Route path="/auth/login" element={<AuthErrorBoundary><LoginPage /></AuthErrorBoundary>} />
                        <Route path="/auth/signup" element={<AuthErrorBoundary><SignupPage /></AuthErrorBoundary>} />
                        <Route path="/auth/callback" element={<AuthErrorBoundary><CallbackPage /></AuthErrorBoundary>} />
                        <Route path="/auth/forgot-password" element={<AuthErrorBoundary><ForgotPasswordPage /></AuthErrorBoundary>} />
                        <Route path="/auth/reset-password" element={<AuthErrorBoundary><ResetPasswordPage /></AuthErrorBoundary>} />
                        <Route path="/auth/verify-email" element={<AuthErrorBoundary><VerifyEmailPage /></AuthErrorBoundary>} />
                        <Route path="/login" element={<AuthErrorBoundary><LoginPage /></AuthErrorBoundary>} />
                        <Route path="/signup" element={<AuthErrorBoundary><SignupPage /></AuthErrorBoundary>} />
                        
                        {/* Onboarding */}
                        <Route path="/onboarding" element={<OnboardingPage />} />
                        
                        {/* Dashboard Routes (with Layout) */}
                        <Route path="/dashboard" element={<DashboardLayout />}>
                            <Route index element={<DashboardOverview />} />
                            <Route path="audit" element={<DashboardAudit />} />
                            <Route path="api-keys" element={<DashboardAPIKeys />} />
                            <Route path="agent-keys" element={<DashboardAgentKeys />} />
                            <Route path="billing" element={<DashboardBilling />} />
                            <Route path="usage" element={<DashboardUsage />} />
                            <Route path="settings" element={<DashboardSettings />} />
                        </Route>
                        
                        {/* Admin Routes (protected) */}
                        <Route path="/admin/blog" element={<BlogAdminPage />} />
                        <Route path="/admin/blog/new" element={<BlogNewPostPage />} />
                        <Route path="/admin/blog/edit/:id" element={<BlogEditPostPage />} />
                        <Route path="/admin/blog/authors" element={<BlogAuthorsPage />} />
                        <Route path="/admin/blog/categories" element={<BlogCategoriesPage />} />
                        
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
                <IOSInstallPrompt />
            </Router>
        </ErrorBoundary>
    );
};

export default App;
