/**
 * Example: React Integration with Sentry Error Tracking
 * 
 * Demonstrates how to integrate Sentry error tracking with React applications.
 * 
 * Note: This is an example file showing integration patterns.
 * Some type issues may exist due to Sentry SDK version compatibility.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  initSentryReact, 
  ErrorBoundary, 
  withErrorBoundary,
  useSentryError,
  useSentryUser,
  useSentryBreadcrumb,
} from '../react';
import { getSentryConfig } from '../config';
import { createSentryFallback } from '../types';

// Initialize Sentry
const sentryConfig = getSentryConfig();
initSentryReact(sentryConfig);

// Error Fallback Component
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Oops! Something went wrong</h1>
      <p style={{ color: 'red' }}>{error.message}</p>
      <button onClick={resetError}>Try again</button>
    </div>
  );
}

// Example component with error tracking
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const captureError = useSentryError();
  const setUserContext = useSentryUser();
  const addBreadcrumb = useSentryBreadcrumb();

  useEffect(() => {
    async function fetchUser() {
      try {
        addBreadcrumb({
          type: 'user',
          category: 'action',
          message: 'Fetching user profile',
          data: { userId },
        });

        const response = await fetch(`/api/users/${userId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const userData = await response.json();
        setUser(userData);

        // Set user context for error tracking
        setUserContext({
          id: userData.id,
          email: userData.email,
          username: userData.username,
        });

        addBreadcrumb({
          type: 'user',
          category: 'action',
          message: 'User profile loaded',
          level: 'info',
        });
      } catch (error) {
        // Capture error with context
        captureError(error, {
          tags: {
            component: 'UserProfile',
            operation: 'fetch_user',
          },
          extra: {
            userId,
          },
        });

        // Re-throw to trigger error boundary
        throw error;
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, captureError, setUserContext, addBreadcrumb]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
}

// Example component with manual error handling
function PaymentForm() {
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const captureError = useSentryError();
  const addBreadcrumb = useSentryBreadcrumb();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setProcessing(true);

      addBreadcrumb({
        type: 'user',
        category: 'payment',
        message: 'User submitted payment form',
        data: { amount },
      });

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), currency: 'USD' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment failed');
      }

      const payment = await response.json();

      addBreadcrumb({
        type: 'user',
        category: 'payment',
        message: 'Payment successful',
        level: 'info',
        data: { paymentId: payment.id },
      });

      alert('Payment successful!');
    } catch (error) {
      // Capture error without re-throwing (show error to user)
      captureError(error, {
        tags: {
          component: 'PaymentForm',
          operation: 'process_payment',
        },
        extra: {
          amount,
        },
        level: 'error',
      });

      alert(`Payment failed: ${(error as Error).message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Payment Form</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        required
      />
      <button type="submit" disabled={processing}>
        {processing ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
}

// Example component that throws error
function BuggyComponent() {
  const [count, setCount] = useState(0);

  if (count > 5) {
    // This will trigger error boundary
    throw new Error('Count exceeded maximum value!');
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// Wrap component with error boundary using HOC
const BuggyComponentWithBoundary = withErrorBoundary(BuggyComponent, {
  fallback: createSentryFallback(ErrorFallback),
  showDialog: true,
});

// Main App Component
function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Sentry Error Tracking Demo</h1>

      {/* Error Boundary for entire section */}
      <ErrorBoundary fallback={createSentryFallback(ErrorFallback)} showDialog>
        <section style={{ marginBottom: '40px' }}>
          <h2>User Profile</h2>
          <UserProfile userId="user-123" />
        </section>
      </ErrorBoundary>

      {/* Separate error boundary for payment form */}
      <ErrorBoundary fallback={createSentryFallback(ErrorFallback)}>
        <section style={{ marginBottom: '40px' }}>
          <PaymentForm />
        </section>
      </ErrorBoundary>

      {/* Component with its own error boundary (HOC) */}
      <section style={{ marginBottom: '40px' }}>
        <h2>Buggy Component</h2>
        <BuggyComponentWithBoundary />
      </section>
    </div>
  );
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={createSentryFallback(ErrorFallback)}
      showDialog
      onError={(error, errorInfo) => {
        console.error('Error caught by root boundary:', error, errorInfo);
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

export default App;
