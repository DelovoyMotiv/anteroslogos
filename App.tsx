import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IOSInstallPrompt } from './components/IOSInstallPrompt';

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
const DashboardAPIKeys = lazy(() => import('./src/pages/dashboard/APIKeysPage'));
const DashboardAgentKeys = lazy(() => import('./src/pages/dashboard/AgentKeysPage'));
const DashboardBilling = lazy(() => import('./src/pages/dashboard/BillingPage'));
const DashboardUsage = lazy(() => import('./src/pages/dashboard/UsagePage'));
const DashboardSettings = lazy(() => import('./src/pages/dashboard/SettingsPage'));

// Auth pages
const LoginPage = lazy(() => import('./src/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./src/pages/auth/SignupPage'));

const App: React.FC = () => {
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
                        
                        {/* Auth Routes */}
                        <Route path="/auth/login" element={<LoginPage />} />
                        <Route path="/auth/signup" element={<SignupPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        
                        {/* Dashboard Routes (with Layout) */}
                        <Route path="/dashboard" element={<DashboardLayout />}>
                            <Route index element={<DashboardOverview />} />
                            <Route path="api-keys" element={<DashboardAPIKeys />} />
                            <Route path="agent-keys" element={<DashboardAgentKeys />} />
                            <Route path="billing" element={<DashboardBilling />} />
                            <Route path="usage" element={<DashboardUsage />} />
                            <Route path="settings" element={<DashboardSettings />} />
                        </Route>
                        
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
                <IOSInstallPrompt />
            </Router>
        </ErrorBoundary>
    );
};

export default App;
