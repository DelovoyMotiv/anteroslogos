/**
 * Transaction History Component
 * Displays user's CCC transaction history with filtering and pagination
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/dashboard/auth-guard';
import { getBillingService } from '../lib/billing/BillingService';
import type { Transaction, EventType } from '../lib/billing/types';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Filter,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TransactionHistoryProps {
  userId?: string;
  limit?: number;
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  DEPOSIT_STRIPE: 'Stripe Deposit',
  DEPOSIT_CRYPTO: 'Crypto Deposit',
  MIGRATION_CREDIT: 'Migration Credit',
  SPEND_API: 'API Usage',
  SPEND_AUDIT: 'GEO Audit',
  SPEND_CONSENSUS: 'Agent Consensus',
  REWARD_CONTRIBUTION: 'Contribution Reward',
};

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  DEPOSIT_STRIPE: 'text-green-400',
  DEPOSIT_CRYPTO: 'text-green-400',
  MIGRATION_CREDIT: 'text-blue-400',
  SPEND_API: 'text-orange-400',
  SPEND_AUDIT: 'text-purple-400',
  SPEND_CONSENSUS: 'text-pink-400',
  REWARD_CONTRIBUTION: 'text-cyan-400',
};

/**
 * TransactionHistory Component
 * Displays transaction list with pagination and filtering
 */
export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  userId: propUserId,
  limit = 20,
}) => {
  const { user } = useAuth();
  const userId = propUserId || user?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Filter state
  const [filterEventType, setFilterEventType] = useState<EventType | 'ALL'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  /**
   * Load transactions from billing service
   */
  const loadTransactions = async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const billingService = getBillingService();
      const offset = currentPage * limit;

      const options: any = {
        limit: limit + 1, // Fetch one extra to check if there are more
        offset,
      };

      // Apply filters
      if (filterEventType !== 'ALL') {
        options.eventType = filterEventType;
      }

      if (filterStartDate) {
        options.startDate = new Date(filterStartDate);
      }

      if (filterEndDate) {
        options.endDate = new Date(filterEndDate);
      }

      const result = await billingService.getTransactionHistory(userId, options);

      // Check if there are more pages
      if (result.length > limit) {
        setHasMore(true);
        setTransactions(result.slice(0, limit));
      } else {
        setHasMore(false);
        setTransactions(result);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Load transactions on mount and when filters/pagination change
  useEffect(() => {
    loadTransactions();
  }, [userId, currentPage, filterEventType, filterStartDate, filterEndDate]);

  /**
   * Check if transaction is from last 24 hours
   */
  const isRecent = (createdAt: string): boolean => {
    const transactionTime = new Date(createdAt).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - transactionTime < twentyFourHours;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setFilterEventType('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
    setCurrentPage(0);
  };

  /**
   * Handle page navigation
   */
  const goToNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!userId) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-500 mb-1">Authentication Required</h3>
            <p className="text-sm text-red-400">Please log in to view transaction history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-text mb-1">
            Transaction History
          </h2>
          <p className="text-sm text-brand-text/60">
            View all your CCC deposits and expenditures
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-secondary/50 border border-brand-text/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-brand-accent" />
          <h3 className="text-sm font-semibold text-brand-text">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Type Filter */}
          <div>
            <label className="block text-xs text-brand-text/70 mb-1">Transaction Type</label>
            <select
              value={filterEventType}
              onChange={(e) => {
                setFilterEventType(e.target.value as EventType | 'ALL');
                setCurrentPage(0);
              }}
              className="w-full bg-brand-secondary border border-brand-text/20 rounded px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT_STRIPE">Stripe Deposits</option>
              <option value="DEPOSIT_CRYPTO">Crypto Deposits</option>
              <option value="MIGRATION_CREDIT">Migration Credits</option>
              <option value="SPEND_API">API Usage</option>
              <option value="SPEND_AUDIT">GEO Audits</option>
              <option value="SPEND_CONSENSUS">Agent Consensus</option>
              <option value="REWARD_CONTRIBUTION">Contribution Rewards</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-xs text-brand-text/70 mb-1">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40" />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full bg-brand-secondary border border-brand-text/20 rounded pl-10 pr-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-xs text-brand-text/70 mb-1">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40" />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full bg-brand-secondary border border-brand-text/20 rounded pl-10 pr-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {(filterEventType !== 'ALL' || filterStartDate || filterEndDate) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-xs text-brand-accent hover:text-blue-400 underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-500 mb-1">Error</h3>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={loadTransactions}
                className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-brand-secondary/30 border border-brand-text/10 rounded-lg p-8 text-center">
          <p className="text-brand-text/60">No transactions found.</p>
          {(filterEventType !== 'ALL' || filterStartDate || filterEndDate) && (
            <button
              onClick={resetFilters}
              className="mt-2 text-sm text-brand-accent hover:text-blue-400 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => {
            const isDeposit = transaction.amount > 0;
            const recent = isRecent(transaction.created_at);

            return (
              <div
                key={transaction.id}
                className={`bg-brand-secondary/50 border rounded-lg p-4 transition-all hover:bg-brand-secondary/70 ${
                  recent
                    ? 'border-brand-accent/50 shadow-lg shadow-brand-accent/10'
                    : 'border-brand-text/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Icon and Details */}
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isDeposit ? 'bg-green-500/10' : 'bg-orange-500/10'
                      }`}
                    >
                      {isDeposit ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-orange-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            EVENT_TYPE_COLORS[transaction.event_type]
                          }`}
                        >
                          {EVENT_TYPE_LABELS[transaction.event_type]}
                        </span>
                        {recent && (
                          <span className="text-[10px] font-mono bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-text mb-1">{transaction.description}</p>
                      <div className="flex items-center gap-3 text-xs text-brand-text/60">
                        <span>{formatDate(transaction.created_at)}</span>
                        <span>•</span>
                        <span>{formatTime(transaction.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-lg font-bold font-mono ${
                        isDeposit ? 'text-green-400' : 'text-orange-400'
                      }`}
                    >
                      {isDeposit ? '+' : ''}
                      {transaction.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-brand-text/60">CCC</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && transactions.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-brand-text/10">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary border border-brand-text/20 rounded-lg text-sm text-brand-text hover:bg-brand-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-brand-text/60">
            Page {currentPage + 1}
          </span>

          <button
            onClick={goToNextPage}
            disabled={!hasMore}
            className="flex items-center gap-2 px-4 py-2 bg-brand-secondary border border-brand-text/20 rounded-lg text-sm text-brand-text hover:bg-brand-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
