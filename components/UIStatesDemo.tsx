/**
 * UI States Demo Component
 * Interactive demonstration of all UI state components
 * For development and testing purposes
 */

import { useState } from 'react';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  Skeleton,
  InlineLoading,
  RetryError,
  NoDataState,
  DataLoadingState,
  CardSkeleton,
} from './UIStates';
import { Database, Users } from 'lucide-react';

export function UIStatesDemo() {
  const [activeDemo, setActiveDemo] = useState<string>('loading');
  const [retryCount, setRetryCount] = useState<number>(0);

  const demos = [
    { id: 'loading', label: 'Loading State' },
    { id: 'error', label: 'Error State' },
    { id: 'empty', label: 'Empty State' },
    { id: 'skeleton', label: 'Skeleton Loaders' },
    { id: 'inline', label: 'Inline Loading' },
    { id: 'retry', label: 'Retry Error' },
    { id: 'nodata', label: 'No Data State' },
    { id: 'dataloading', label: 'Data Loading' },
    { id: 'cards', label: 'Card Skeletons' },
  ];

  const renderDemo = () => {
    switch (activeDemo) {
      case 'loading':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Small Size</h4>
              <LoadingState message="Loading data..." size="sm" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Medium Size (Default)</h4>
              <LoadingState message="Processing your request..." size="md" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Large Size</h4>
              <LoadingState message="Analyzing website..." size="lg" />
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">With Retry Button</h4>
              <ErrorState
                title="Failed to Load Data"
                message="Unable to connect to the server. Please check your internet connection and try again."
                onRetry={() => alert('Retry clicked!')}
                retryLabel="Try Again"
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Without Retry Button</h4>
              <ErrorState
                title="Access Denied"
                message="You don't have permission to view this resource. Please contact your administrator."
              />
            </div>
          </div>
        );

      case 'empty':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">With Action Button</h4>
              <EmptyState
                icon={Users}
                title="No Users Found"
                message="You haven't added any users yet. Get started by creating your first user."
                action={{
                  label: 'Add User',
                  onClick: () => alert('Add user clicked!'),
                }}
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Without Action Button</h4>
              <EmptyState
                icon={Database}
                title="No Data Available"
                message="There's no data to display at this time. Check back later."
              />
            </div>
          </div>
        );

      case 'skeleton':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Text Skeleton</h4>
              <div className="space-y-2">
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Circular Skeleton</h4>
              <div className="flex gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={60} height={60} />
                <Skeleton variant="circular" width={80} height={80} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Rectangular Skeleton</h4>
              <Skeleton variant="rectangular" width="100%" height={120} />
            </div>
          </div>
        );

      case 'inline':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Small Inline Loading</h4>
              <div className="p-4 bg-white/5 rounded-lg">
                <InlineLoading message="Saving changes..." size="sm" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Medium Inline Loading</h4>
              <div className="p-4 bg-white/5 rounded-lg">
                <InlineLoading message="Processing payment..." size="md" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">In Button</h4>
              <button className="px-4 py-2 bg-brand-accent rounded-lg flex items-center gap-2">
                <InlineLoading size="sm" />
                <span>Loading...</span>
              </button>
            </div>
          </div>
        );

      case 'retry':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">With Retry Available</h4>
              <RetryError
                message="Failed to fetch data from the server. Network timeout occurred."
                onRetry={() => {
                  // @ts-ignore - TypeScript has issues with setState updater function type inference
                  setRetryCount((prev) => prev + 1);
                }}
                attempts={retryCount}
                maxAttempts={3}
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Max Attempts Reached</h4>
              <RetryError
                message="Failed to fetch data from the server. Network timeout occurred."
                onRetry={() => {}}
                attempts={3}
                maxAttempts={3}
              />
            </div>
          </div>
        );

      case 'nodata':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">With Suggestion</h4>
              <NoDataState
                title="No Analytics Data"
                message="We haven't collected enough data yet to show analytics."
                suggestion="Check back in 24 hours after some activity has been recorded."
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Without Suggestion</h4>
              <NoDataState
                title="No Results"
                message="Your search didn't return any results."
              />
            </div>
          </div>
        );

      case 'dataloading':
        return (
          <div className="space-y-6">
            <DataLoadingState
              title="Loading Dashboard Metrics"
              description="Fetching your latest analytics data and performance metrics..."
            />
            <DataLoadingState
              title="Analyzing Content"
              description="Running NLP analysis on your website content..."
            />
          </div>
        );

      case 'cards':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Single Card</h4>
              <CardSkeleton count={1} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 mb-3">Multiple Cards</h4>
              <div className="grid grid-cols-2 gap-4">
                <CardSkeleton count={4} />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">UI States Demo</h1>
          <p className="text-white/60">
            Interactive demonstration of all UI state components for async operations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sticky top-4">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">
                Components
              </h3>
              <div className="space-y-1">
                {demos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setActiveDemo(demo.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-brand-bg ${
                      activeDemo === demo.id
                        ? 'bg-brand-accent text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                    role="tab"
                    aria-selected={activeDemo === demo.id}
                    aria-controls={`demo-panel-${demo.id}`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">
                {demos.find(d => d.id === activeDemo)?.label}
              </h2>
              {renderDemo()}
            </div>

            {/* Code Example */}
            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-wide">
                Usage Example
              </h3>
              <pre className="text-xs text-white/80 overflow-x-auto">
                <code>{getCodeExample(activeDemo)}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getCodeExample(demo: string): string {
  const examples: Record<string, string> = {
    loading: `<LoadingState 
  message="Loading data..." 
  size="md" 
/>`,
    error: `<ErrorState
  title="Failed to Load Data"
  message="Unable to connect to the server."
  onRetry={() => refetch()}
  retryLabel="Try Again"
/>`,
    empty: `<EmptyState
  icon={Users}
  title="No Users Found"
  message="Get started by creating your first user."
  action={{
    label: 'Add User',
    onClick: () => navigate('/add-user'),
  }}
/>`,
    skeleton: `<Skeleton variant="text" width="100%" />
<Skeleton variant="circular" width={40} height={40} />
<Skeleton variant="rectangular" height={120} />`,
    inline: `<button disabled={loading}>
  {loading ? (
    <InlineLoading message="Saving..." size="sm" />
  ) : (
    'Save Changes'
  )}
</button>`,
    retry: `<RetryError
  message="Failed to fetch data."
  onRetry={() => refetch()}
  attempts={attempts}
  maxAttempts={3}
/>`,
    nodata: `<NoDataState
  title="No Analytics Data"
  message="We haven't collected enough data yet."
  suggestion="Check back in 24 hours."
/>`,
    dataloading: `<DataLoadingState
  title="Loading Dashboard Metrics"
  description="Fetching your latest analytics..."
/>`,
    cards: `<CardSkeleton count={3} />`,
  };

  return examples[demo] || '';
}

export default UIStatesDemo;
