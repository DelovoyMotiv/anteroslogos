/**
 * VersionChecker Component
 * 
 * Automatically detects when a new version of the app is deployed
 * and prompts the user to reload to get the latest version.
 * 
 * This solves the problem of users seeing cached old versions
 * after deployment.
 */

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

// Version is injected at build time from package.json
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function VersionChecker() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check version on mount
    checkVersion();

    // Set up periodic version checking
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    // Check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const checkVersion = async () => {
    if (isChecking) return;

    try {
      setIsChecking(true);

      // Fetch version.json with cache-busting timestamp
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('[VersionChecker] Failed to fetch version info');
        return;
      }

      const data = await response.json();
      const serverVersion = data.version;
      const buildTime = data.buildTime;

      console.log('[VersionChecker] Current:', CURRENT_VERSION, 'Server:', serverVersion);

      // Compare versions
      if (serverVersion && serverVersion !== CURRENT_VERSION) {
        console.log('[VersionChecker] New version detected!', {
          current: CURRENT_VERSION,
          server: serverVersion,
          buildTime,
        });
        setShowUpdatePrompt(true);
      }
    } catch (error) {
      console.warn('[VersionChecker] Error checking version:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleReload = () => {
    // Clear all caches before reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Force hard reload
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    // Check again in 1 minute if user dismisses
    setTimeout(checkVersion, 60 * 1000);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-2xl border border-blue-400/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              New Version Available
            </h3>
            <p className="text-xs text-blue-50 mb-3">
              A new version of the app is available. Reload to get the latest features and improvements.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 rounded font-medium text-xs hover:bg-blue-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Now
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-blue-100 hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-100 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
