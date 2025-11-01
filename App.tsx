import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load all route components for optimal bundle splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const NotFound = lazy(() => import('./components/NotFound'));

const App: React.FC = () => {
    return (
        <Router>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </Router>
    );
};

export default App;
