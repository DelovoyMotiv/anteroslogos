/**
 * Skeleton Loader Components
 * Reusable loading skeletons for auth pages
 * Provides visual feedback during async operations
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-zinc-800/50 rounded ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
};

/**
 * Skeleton for input fields
 */
export const SkeletonInput: React.FC = () => {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-16" /> {/* Label */}
      <Skeleton className="h-10 w-full" /> {/* Input */}
    </div>
  );
};

/**
 * Skeleton for buttons
 */
export const SkeletonButton: React.FC<{ fullWidth?: boolean }> = ({ 
  fullWidth = true 
}) => {
  return (
    <Skeleton className={`h-10 ${fullWidth ? 'w-full' : 'w-24'}`} />
  );
};

/**
 * Skeleton for OAuth button
 */
export const SkeletonOAuthButton: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2.5 h-10 bg-zinc-950 border border-zinc-800 rounded animate-pulse">
      <div className="w-4 h-4 bg-zinc-800 rounded" />
      <div className="h-3 w-36 bg-zinc-800 rounded" />
    </div>
  );
};

/**
 * Skeleton for form with multiple inputs
 */
export const SkeletonForm: React.FC<{ 
  inputs?: number;
  showOAuth?: boolean;
}> = ({ 
  inputs = 2,
  showOAuth = false 
}) => {
  return (
    <div className="space-y-4">
      {showOAuth && (
        <>
          <SkeletonOAuthButton />
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-900/50 text-zinc-500">Loading...</span>
            </div>
          </div>
        </>
      )}
      
      {Array.from({ length: inputs }).map((_, i) => (
        <SkeletonInput key={i} />
      ))}
      
      <SkeletonButton />
    </div>
  );
};

/**
 * Skeleton for auth card (full page loader)
 */
export const SkeletonAuthCard: React.FC<{
  inputs?: number;
  showOAuth?: boolean;
}> = ({ 
  inputs = 2,
  showOAuth = false 
}) => {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo skeleton */}
        <div className="flex items-center justify-center mb-12">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="ml-3 h-8 w-48 rounded" />
        </div>

        {/* Card skeleton */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 shadow-xl">
          {/* Header */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>

          {/* Form */}
          <SkeletonForm inputs={inputs} showOAuth={showOAuth} />

          {/* Footer */}
          <div className="mt-5 pt-5 border-t border-zinc-800">
            <Skeleton className="h-3 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for success/verification screen
 */
export const SkeletonSuccessCard: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 text-center">
          {/* Icon */}
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          
          {/* Title */}
          <Skeleton className="h-5 w-48 mx-auto mb-2" />
          
          {/* Subtitle */}
          <Skeleton className="h-3 w-36 mx-auto mb-1" />
          <Skeleton className="h-4 w-56 mx-auto mb-6" />
          
          {/* Description */}
          <Skeleton className="h-3 w-72 mx-auto mb-6" />
          
          {/* Button */}
          <SkeletonButton />
        </div>
      </div>
    </div>
  );
};

/**
 * Inline spinner (for button loading states)
 */
export const Spinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3 border',
    md: 'w-4 h-4 border-2',
    lg: 'w-6 h-6 border-2',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-white border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * Loading overlay (for page transitions)
 */
export const LoadingOverlay: React.FC<{
  message?: string;
}> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-brand-bg/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-zinc-400">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Progress bar (for multi-step processes)
 */
export const ProgressBar: React.FC<{
  progress: number; // 0-100
  className?: string;
}> = ({ progress, className = '' }) => {
  return (
    <div className={`w-full h-1 bg-zinc-800 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-brand-accent transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};

/**
 * Shimmer effect (for content loading)
 */
export const Shimmer: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`relative overflow-hidden bg-zinc-800/30 rounded ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};

// Add shimmer animation to global styles if needed
// @keyframes shimmer {
//   100% {
//     transform: translateX(100%);
//   }
// }
