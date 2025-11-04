/**
 * Skeleton Loader Component - Hi-End UX
 * Animated loading placeholders for better perceived performance
 */

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'chart' | 'metric' | 'table' | 'full-report';
  count?: number;
  className?: string;
}

const SkeletonLoader = ({ variant = 'text', count = 1, className = '' }: SkeletonLoaderProps) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded';

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`h-4 ${baseClasses} ${className}`} style={{ width: `${70 + Math.random() * 30}%` }} />
            ))}
          </>
        );

      case 'card':
        return (
          <>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`p-6 border border-white/10 rounded-xl space-y-4 ${className}`}>
                <div className={`h-6 w-1/3 ${baseClasses}`} />
                <div className={`h-4 w-full ${baseClasses}`} />
                <div className={`h-4 w-5/6 ${baseClasses}`} />
                <div className={`h-10 w-1/4 ${baseClasses} rounded-lg`} />
              </div>
            ))}
          </>
        );

      case 'metric':
        return (
          <>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`p-4 border border-white/10 rounded-xl space-y-2 ${className}`}>
                <div className={`h-3 w-1/2 ${baseClasses}`} />
                <div className={`h-8 w-16 ${baseClasses}`} />
                <div className={`h-2 w-full ${baseClasses} rounded-full`} />
              </div>
            ))}
          </>
        );

      case 'chart':
        return (
          <div className={`p-6 border border-white/10 rounded-xl ${className}`}>
            <div className={`h-6 w-1/4 ${baseClasses} mb-4`} />
            <div className={`h-64 ${baseClasses} rounded-lg`} />
          </div>
        );

      case 'table':
        return (
          <div className={`space-y-3 ${className}`}>
            {/* Header */}
            <div className="flex gap-4">
              <div className={`h-4 w-1/3 ${baseClasses}`} />
              <div className={`h-4 w-1/6 ${baseClasses}`} />
              <div className={`h-4 w-1/6 ${baseClasses}`} />
              <div className={`h-4 w-1/4 ${baseClasses}`} />
            </div>
            {/* Rows */}
            {Array.from({ length: count || 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className={`h-8 w-1/3 ${baseClasses}`} />
                <div className={`h-8 w-1/6 ${baseClasses}`} />
                <div className={`h-8 w-1/6 ${baseClasses}`} />
                <div className={`h-8 w-1/4 ${baseClasses}`} />
              </div>
            ))}
          </div>
        );

      case 'full-report':
        return (
          <div className="space-y-8">
            {/* Overall Score Block */}
            <div className="p-6 lg:p-8 border border-white/10 rounded-2xl">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className={`h-8 w-48 ${baseClasses}`} />
                  <div className={`h-4 w-32 ${baseClasses}`} />
                </div>
                <div className={`h-24 w-24 ${baseClasses} rounded-full`} />
                <div className="flex gap-3">
                  <div className={`h-12 w-12 ${baseClasses} rounded-lg`} />
                  <div className={`h-12 w-12 ${baseClasses} rounded-lg`} />
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-6">
              <div className={`h-8 w-64 ${baseClasses}`} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 border border-white/10 rounded-xl space-y-2">
                    <div className={`h-3 w-1/2 ${baseClasses}`} />
                    <div className={`h-10 w-20 ${baseClasses}`} />
                    <div className={`h-2 w-full ${baseClasses}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-6 border border-white/10 rounded-xl">
                  <div className={`h-6 w-1/3 ${baseClasses} mb-4`} />
                  <div className={`h-64 ${baseClasses} rounded-lg`} />
                </div>
              ))}
            </div>

            {/* Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-6 border border-white/10 rounded-xl space-y-4">
                  <div className={`h-6 w-1/2 ${baseClasses}`} />
                  <div className={`h-4 w-full ${baseClasses}`} />
                  <div className={`h-4 w-4/5 ${baseClasses}`} />
                  <div className={`h-4 w-3/4 ${baseClasses}`} />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div className={`h-4 ${baseClasses} ${className}`} />;
    }
  };

  return <div className={count > 1 && variant !== 'full-report' ? 'space-y-3' : ''}>{renderSkeleton()}</div>;
};

export default SkeletonLoader;
