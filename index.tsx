// Self-hosted fonts for optimal performance and reduced CLS
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Core Web Vitals monitoring
if (typeof window !== 'undefined') {
  import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const sendToAnalytics = (metric: any) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
      }
      
      // In production, send to your analytics endpoint
      // Example: fetch('/analytics', { method: 'POST', body: JSON.stringify(metric) });
    };

    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  });
}
