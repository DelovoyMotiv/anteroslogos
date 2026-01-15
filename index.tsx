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

// KaTeX CSS for mathematical notation rendering
import 'katex/dist/katex.min.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runStartupValidation } from './lib/config/startup';

// Validate environment configuration at startup
runStartupValidation();

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

// PWA Service Worker disabled - not needed for this application
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/sw.js')
//       .then((registration) => {
//         console.log('SW registered: ', registration);
//       })
//       .catch((registrationError) => {
//         console.log('SW registration failed: ', registrationError);
//       });
//   });
// }

// Core Web Vitals monitoring
import type { CLSMetric, FCPMetric, INPMetric, LCPMetric, TTFBMetric } from 'web-vitals';

if (typeof window !== 'undefined') {
  import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const sendToAnalytics = (metric: CLSMetric | FCPMetric | INPMetric | LCPMetric | TTFBMetric) => {
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
