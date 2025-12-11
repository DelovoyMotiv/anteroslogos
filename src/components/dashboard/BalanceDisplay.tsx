/**
 * Balance Display Component
 * Shows CCC balance with animated counter and low balance warning
 */

import { useState, useEffect, useRef } from 'react';
import { Wallet, AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface BalanceDisplayProps {
  userId: string;
  collapsed?: boolean;
}

const LOW_BALANCE_THRESHOLD = 50; // CCC

/**
 * Animated counter hook
 * Smoothly animates from current value to target value
 */
function useAnimatedCounter(target: number, duration: number = 500): number {
  const [current, setCurrent] = useState(target);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // If target hasn't changed, don't animate
    if (current === target) return;

    startValueRef.current = current;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValueRef.current + (target - startValueRef.current) * eased;

      setCurrent(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, duration]);

  return current;
}

export function BalanceDisplay({ userId, collapsed = false }: BalanceDisplayProps) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const animatedBalance = useAnimatedCounter(balance, 500);
  const isLowBalance = balance < LOW_BALANCE_THRESHOLD && balance > 0;

  /**
   * Fetch balance from user_balances table
   */
  const fetchBalance = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      }
      setError(null);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Fetch from user_balances table
      const { data, error: fetchError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch balance: ${fetchError.message}`);
      }

      // If no balance record exists, default to 0
      if (!data) {
        setBalance(0);
        return;
      }

      setBalance(Number((data as { balance: number }).balance) || 0);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load balance');
    } finally {
      setLoading(false);
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchBalance();
  }, [userId]);

  // Set up real-time subscription for balance updates
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`balance:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_balances',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && 'balance' in payload.new) {
            setBalance(Number(payload.new.balance) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const handleRefresh = () => {
    fetchBalance(true);
  };

  if (collapsed) {
    return (
      <div className="flex justify-center py-2" title={`${balance.toFixed(2)} CCC`}>
        <div className="relative">
          <Wallet className={`w-4 h-4 ${isLowBalance ? 'text-yellow-500' : 'text-blue-400'}`} />
          {isLowBalance && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-20 mb-1" />
        <div className="h-6 bg-slate-800 rounded w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-mono text-red-500 uppercase">Error</span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-[10px] text-red-400 hover:text-red-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-2 rounded-lg border transition-all ${
        isLowBalance
          ? 'bg-yellow-900/20 border-yellow-500/30'
          : 'bg-slate-900/30 border-slate-800/50'
      }`}
    >
      {/* Header with icon and refresh */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Wallet className={`w-3 h-3 ${isLowBalance ? 'text-yellow-500' : 'text-blue-400'}`} />
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Balance
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Animated balance display */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className={`text-xl font-bold font-mono ${isLowBalance ? 'text-yellow-400' : 'text-slate-100'}`}>
          {animatedBalance.toFixed(2)}
        </span>
        <span className="text-[10px] font-mono text-slate-500">CCC</span>
      </div>

      {/* Low balance warning */}
      {isLowBalance && (
        <div className="flex items-center gap-1 mb-2 pt-1 border-t border-yellow-500/20">
          <AlertTriangle className="w-3 h-3 text-yellow-500" />
          <span className="text-[9px] text-yellow-500 font-mono">Low balance</span>
        </div>
      )}

      {/* Purchase link */}
      <Link
        to="/dashboard/billing"
        className={`block text-center text-[10px] font-mono font-bold py-1 rounded transition-colors ${
          isLowBalance
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
        }`}
      >
        {isLowBalance ? 'TOP UP NOW' : 'ADD CREDITS'}
      </Link>
    </div>
  );
}
