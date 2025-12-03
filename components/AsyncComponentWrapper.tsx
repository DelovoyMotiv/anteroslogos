/**
 * Async Component Wrapper
 * Demonstrates proper usage of loading, error, and empty states
 * Property 29: UI Loading States - Validates Requirements 6.5
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { LoadingState, ErrorState, EmptyState } from './UIStates';
import type { 
  AsyncComponentState, 
  AsyncComponentAction, 
  EmptyStateCheck, 
  DataFetcher 
} from '../types/components.types';

interface AsyncComponentWrapperProps<T> {
  // Data fetching function
  fetchData: DataFetcher<T>;
  
  // Render function for successful data load
  children: (data: T) => ReactNode;
  
  // Empty state configuration
  emptyCheck?: EmptyStateCheck<T>;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: AsyncComponentAction;
  
  // Loading state configuration
  loadingMessage?: string;
  
  // Error state configuration
  errorTitle?: string;
  onRetry?: () => void;
  
  // Dependencies for re-fetching
  dependencies?: React.DependencyList;
}

/**
 * Generic wrapper for async components that handles loading, error, and empty states
 * 
 * @example
 * ```tsx
 * <AsyncComponentWrapper
 *   fetchData={async () => await fetchUserData(userId)}
 *   emptyCheck={(data) => data.length === 0}
 *   emptyTitle="No users found"
 *   emptyMessage="Try adjusting your search criteria"
 *   loadingMessage="Loading users..."
 * >
 *   {(data) => <UserList users={data} />}
 * </AsyncComponentWrapper>
 * ```
 */
export function AsyncComponentWrapper<T>({
  fetchData,
  children,
  emptyCheck,
  emptyTitle = 'No Data',
  emptyMessage = 'No data available to display',
  emptyAction,
  loadingMessage = 'Loading...',
  errorTitle = 'Failed to load data',
  onRetry,
  dependencies = [],
}: AsyncComponentWrapperProps<T>) {
  const [state, setState] = useState<AsyncComponentState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  const loadData = async () => {
    setState({ status: 'loading', data: null, error: null });
    
    try {
      const data = await fetchData();
      
      // Check if data is empty
      if (emptyCheck && emptyCheck(data)) {
        setState({ status: 'empty', data, error: null });
      } else {
        setState({ status: 'success', data, error: null });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ status: 'error', data: null, error: errorMessage });
    }
  };

  useEffect(() => {
    loadData();
  }, dependencies);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
    loadData();
  };

  // Render based on state
  switch (state.status) {
    case 'loading':
      return <LoadingState message={loadingMessage} />;
    
    case 'error':
      return (
        <ErrorState
          title={errorTitle}
          message={state.error || 'An error occurred'}
          onRetry={handleRetry}
        />
      );
    
    case 'empty':
      return (
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          action={emptyAction}
        />
      );
    
    case 'success':
      return <>{state.data && children(state.data)}</>;
    
    default:
      return null;
  }
}

// ==================== USAGE EXAMPLES ====================

/**
 * Example 1: Dashboard with async data
 */
export function DashboardExample() {
  return (
    <AsyncComponentWrapper
      fetchData={async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          metrics: [
            { name: 'Users', value: 1234 },
            { name: 'Revenue', value: 56789 },
          ],
        };
      }}
      loadingMessage="Loading dashboard metrics..."
      emptyCheck={(data) => data.metrics.length === 0}
      emptyTitle="No Metrics Available"
      emptyMessage="Dashboard metrics will appear here once data is available"
    >
      {(data) => (
        <div className="grid grid-cols-2 gap-4">
          {data.metrics.map((metric) => (
            <div key={metric.name} className="p-4 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60">{metric.name}</div>
              <div className="text-2xl font-bold">{metric.value}</div>
            </div>
          ))}
        </div>
      )}
    </AsyncComponentWrapper>
  );
}

/**
 * Example 2: User list with empty state
 */
export function UserListExample() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search users..."
        className="mb-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg"
      />
      
      <AsyncComponentWrapper
        fetchData={async () => {
          // Simulate API call with search
          await new Promise(resolve => setTimeout(resolve, 500));
          return searchQuery ? [] : [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Jane Smith' },
          ];
        }}
        dependencies={[searchQuery]}
        loadingMessage="Searching users..."
        emptyCheck={(users) => users.length === 0}
        emptyTitle="No Users Found"
        emptyMessage={`No users match "${searchQuery}". Try a different search term.`}
        emptyAction={{
          label: 'Clear Search',
          onClick: () => setSearchQuery(''),
        }}
      >
        {(users) => (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="p-3 bg-white/5 rounded-lg">
                {user.name}
              </div>
            ))}
          </div>
        )}
      </AsyncComponentWrapper>
    </div>
  );
}

/**
 * Example 3: Chart with error handling
 */
export function ChartExample() {
  return (
    <AsyncComponentWrapper
      fetchData={async () => {
        // Simulate API call that might fail
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate random failure
        if (Math.random() > 0.7) {
          throw new Error('Failed to fetch chart data from server');
        }
        
        return {
          labels: ['Jan', 'Feb', 'Mar'],
          values: [10, 20, 15],
        };
      }}
      loadingMessage="Loading chart data..."
      errorTitle="Chart Data Unavailable"
      emptyCheck={(data) => data.values.length === 0}
      emptyTitle="No Chart Data"
      emptyMessage="Chart data will appear once available"
    >
      {(data) => (
        <div className="p-4 bg-white/5 rounded-lg">
          <h3 className="font-bold mb-4">Monthly Trends</h3>
          <div className="space-y-2">
            {data.labels.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-white/60 w-12">{label}</span>
                <div className="flex-1 h-8 bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-brand-accent"
                    style={{ width: `${(data.values[i] / 20) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-12 text-right">{data.values[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AsyncComponentWrapper>
  );
}
