/**
 * Reusable UI State Components
 * Loading, Error, and Empty states for async components
 * Property 29: UI Loading States - Validates Requirements 6.5
 */

import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Inbox, TrendingUp } from 'lucide-react';

// ==================== LOADING STATE ====================

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses} role="status" aria-live="polite" aria-label={message}>
      <div className="text-center">
        <Loader2 className={`${sizeClasses[size]} text-brand-accent animate-spin mx-auto mb-3`} aria-hidden="true" />
        <p className="text-white/60 text-sm">{message}</p>
      </div>
    </div>
  );
};

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  fullScreen = false,
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'
    : 'flex items-center justify-center py-12 px-4';

  return (
    <div className={containerClasses} role="alert" aria-live="assertive">
      <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2" id="error-title">{title}</h3>
        <p className="text-sm text-white/70 mb-4 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/80 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label={`${retryLabel} - ${title}`}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  fullScreen?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  message,
  action,
  fullScreen = false,
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'
    : 'flex items-center justify-center py-12 px-4';

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Icon className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2" id="empty-title">{title}</h3>
        <p className="text-sm text-white/60 mb-4 leading-relaxed">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/80 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg"
            aria-label={`${action.label} - ${title}`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};

// ==================== SKELETON LOADER ====================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-white/10';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// ==================== CARD SKELETON ====================

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </div>
          </div>
          <Skeleton variant="rectangular" height={60} />
          <div className="flex gap-2">
            <Skeleton variant="rectangular" width="30%" height={32} />
            <Skeleton variant="rectangular" width="30%" height={32} />
          </div>
        </div>
      ))}
    </>
  );
};

// ==================== INLINE LOADING ====================

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'sm',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2 text-white/60">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
};

// ==================== DATA LOADING STATE ====================

interface DataLoadingStateProps {
  title: string;
  description?: string;
}

export const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  title,
  description,
}) => {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-brand-accent/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{title}</h4>
          {description && (
            <p className="text-sm text-white/60">{description}</p>
          )}
          <div className="mt-3 space-y-2">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== RETRY ERROR ====================

interface RetryErrorProps {
  message: string;
  onRetry: () => void;
  attempts?: number;
  maxAttempts?: number;
}

export const RetryError: React.FC<RetryErrorProps> = ({
  message,
  onRetry,
  attempts = 0,
  maxAttempts = 3,
}) => {
  const canRetry = attempts < maxAttempts;

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-white/80 mb-2">{message}</p>
          {canRetry ? (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-brand-bg"
              aria-label={`Retry operation, attempt ${attempts + 1} of ${maxAttempts}`}
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry ({attempts}/{maxAttempts})
            </button>
          ) : (
            <p className="text-xs text-red-400">
              Maximum retry attempts reached. Please try again later.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== NO DATA STATE ====================

interface NoDataStateProps {
  title: string;
  message: string;
  suggestion?: string;
}

export const NoDataState: React.FC<NoDataStateProps> = ({
  title,
  message,
  suggestion,
}) => {
  return (
    <div className="p-8 text-center border border-dashed border-white/20 rounded-xl">
      <TrendingUp className="w-12 h-12 text-white/30 mx-auto mb-3" />
      <h4 className="font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-white/60 mb-3">{message}</p>
      {suggestion && (
        <p className="text-xs text-white/40 italic">{suggestion}</p>
      )}
    </div>
  );
};
