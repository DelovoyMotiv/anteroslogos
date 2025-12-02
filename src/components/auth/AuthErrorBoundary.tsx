/**
 * Auth Error Boundary
 * Production-grade error handling for authentication flows
 * Catches Supabase errors, network failures, and unexpected crashes
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Logo } from '../../../components/Icons';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'network' | 'auth' | 'supabase' | 'unknown';
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Classify error type for better user messaging
    const errorType = AuthErrorBoundary.classifyError(error);
    
    return {
      hasError: true,
      error,
      errorType,
    };
  }

  static classifyError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      error.name === 'NetworkError'
    ) {
      return 'network';
    }
    
    // Supabase-specific errors
    if (
      message.includes('supabase') ||
      message.includes('not configured') ||
      message.includes('invalid api key') ||
      message.includes('jwt')
    ) {
      return 'supabase';
    }
    
    // Auth errors
    if (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('token') ||
      message.includes('session')
    ) {
      return 'auth';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring service (e.g., Sentry, LogRocket)
    console.error('Auth Error Boundary caught error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, send to monitoring service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      // Example: LogRocket.captureException(error);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  getErrorMessage(): { title: string; description: string; actions: string[] } {
    const { errorType, error } = this.state;
    
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Error',
          description: 'Unable to connect to authentication service. Please check your internet connection and try again.',
          actions: ['reload', 'home'],
        };
      
      case 'supabase':
        return {
          title: 'Service Configuration Error',
          description: 'Authentication service is not properly configured. Please contact support if this persists.',
          actions: ['home'],
        };
      
      case 'auth':
        return {
          title: 'Authentication Error',
          description: error?.message || 'An authentication error occurred. Please try logging in again.',
          actions: ['reset', 'home'],
        };
      
      default:
        return {
          title: 'Unexpected Error',
          description: this.props.fallbackMessage || 'Something went wrong. Please try again or contact support.',
          actions: ['reset', 'reload', 'home'],
        };
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { title, description, actions } = this.getErrorMessage();
    const { error, errorInfo } = this.state;
    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Logo className="h-9 w-9 text-brand-accent" />
            <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Anóteros Lógos
            </span>
          </div>

          {/* Error Card */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-red-900/50 rounded-lg p-8 shadow-xl">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Title */}
            <h1 className="text-xl font-semibold text-white text-center mb-3">
              {title}
            </h1>

            {/* Description */}
            <p className="text-sm text-zinc-400 text-center mb-6">
              {description}
            </p>

            {/* Actions */}
            <div className="space-y-3 mb-6">
              {actions.includes('reset') && (
                <button
                  onClick={this.handleReset}
                  className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>
              )}
              
              {actions.includes('reload') && (
                <button
                  onClick={this.handleReload}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm rounded transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </button>
              )}
              
              {actions.includes('home') && (
                <button
                  onClick={this.handleGoHome}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm rounded transition-colors flex items-center justify-center"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Homepage
                </button>
              )}
            </div>

            {/* Error Details (Dev Only) */}
            {isDev && error && (
              <details className="mt-6 pt-6 border-t border-zinc-800">
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 mb-3">
                  Error Details (Development Only)
                </summary>
                <div className="bg-zinc-950/50 border border-zinc-800 rounded p-4 space-y-3">
                  <div>
                    <p className="text-xs font-mono text-red-400 mb-1">
                      {error.name}: {error.message}
                    </p>
                  </div>
                  {error.stack && (
                    <div>
                      <p className="text-xs text-zinc-600 mb-1">Stack Trace:</p>
                      <pre className="text-xs font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo && (
                    <div>
                      <p className="text-xs text-zinc-600 mb-1">Component Stack:</p>
                      <pre className="text-xs font-mono text-zinc-500 overflow-x-auto whitespace-pre-wrap break-words">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Support Link */}
            <p className="text-xs text-zinc-600 text-center mt-6">
              If this problem persists, please{' '}
              <a
                href="mailto:support@anoteros-logos.com"
                className="text-brand-accent hover:text-blue-400 underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default AuthErrorBoundary;
