import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import NotFound from './components/NotFound';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
};

export default App;
