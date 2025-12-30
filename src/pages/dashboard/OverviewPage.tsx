/**
 * Dashboard Overview Page - HUD Style
 * High-density, data-first dashboard with scientific aesthetic
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { getCurrentCycleUsage, getUCPTRate } from '../../../lib/dashboard/usage-analytics';
import { getSubscription, getUsageStats, type USDCSubscription, type UsageStats } from '../../../lib/dashboard/billing-client';
import { Activity, Shield, ArrowUpRight, Terminal, Cpu, Zap } from 'lucide-react';

interface Stats {
  totalCalls: number;
  successfulCalls: number;
  totalTokens: number;
  ucptRate: number;
}

export function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [subscription, setSubscription] = useState<USDCSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      getCurrentCycleUsage(user.id),
      getUCPTRate(user.id, 7),
      getSubscription(user.id),
    ]).then(([cycleUsage, ucptRate, subscriptionResult]) => {
      // Handle both primitive and error object returns
      const hasCycleError = typeof cycleUsage === 'object' && cycleUsage !== null && 'error' in cycleUsage;
      const hasUcptError = typeof ucptRate === 'object' && ucptRate !== null && 'error' in ucptRate;
      
      if (hasCycleError || hasUcptError) {
        setLoading(false);
        return;
      }

      // Type guard: ensure cycleUsage has the expected properties
      const hasValidCycleUsage = typeof cycleUsage === 'object' && 
        cycleUsage !== null && 
        'total_calls' in cycleUsage &&
        'successful_calls' in cycleUsage &&
        'total_tokens' in cycleUsage;

      setStats({
        totalCalls: hasValidCycleUsage ? cycleUsage.total_calls : 0,
        successfulCalls: hasValidCycleUsage ? cycleUsage.successful_calls : 0,
        totalTokens: hasValidCycleUsage ? cycleUsage.total_tokens : 0,
        ucptRate: typeof ucptRate === 'number' ? ucptRate : 0,
      });
      
      // Type guard: ensure subscriptionResult is a valid subscription
      const hasSubError = typeof subscriptionResult === 'object' && subscriptionResult !== null && 'error' in subscriptionResult;
      const isValidSubscription = !hasSubError && 
        subscriptionResult !== null &&
        typeof subscriptionResult === 'object' &&
        'subscription_id' in subscriptionResult;
      
      if (isValidSubscription) {
        setSubscription(subscriptionResult as USDCSubscription);
        getUsageStats(subscriptionResult as USDCSubscription).then(setUsageStats);
      }
      
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const successRate = stats
    ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) || 0
    : 0;

  const auditsUsed = usageStats?.auditsUsed || 0;
  const auditsQuota = usageStats?.auditsQuota || 1;
  const auditsPercent = auditsQuota === -1 ? 100 : Math.min((auditsUsed / auditsQuota) * 100, 100);
  const daysRemaining = usageStats?.daysRemaining || 0;
  const totalTokens = stats?.totalTokens || 0;

  return (
    <div className="space-y-3 pb-8">
      {/* Compact Header */}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
        <div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {user?.email} · {subscription?.plan_tier?.toUpperCase() || 'FREE'} TIER
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Cycle Remaining
          </div>
          <div className="text-lg font-mono font-bold text-slate-200">
            {daysRemaining}<span className="text-xs text-slate-500 ml-0.5">days</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid - Ultra Dense */}
      <div className="grid grid-cols-4 gap-2">
        {/* API Calls */}
        <MetricPanel
          label="API Calls"
          value={formatNumber(stats?.totalCalls || 0)}
          sublabel={`${stats?.successfulCalls || 0} success`}
          trend="+12%"
          status="nominal"
        />
        
        {/* Success Rate */}
        <MetricPanel
          label="Success Rate"
          value={`${successRate}%`}
          sublabel="last 24h"
          trend={successRate >= 95 ? 'optimal' : 'warning'}
          status={successRate >= 95 ? 'nominal' : 'warning'}
        />
        
        {/* UCPT Verification */}
        <MetricPanel
          label="UCPT Verified"
          value={`${stats?.ucptRate || 0}%`}
          sublabel="compliance rate"
          trend="stable"
          status="nominal"
        />
        
        {/* Token Usage */}
        <MetricPanel
          label="Tokens"
          value={formatNumber(totalTokens)}
          sublabel="this cycle"
          trend="+8%"
          status="nominal"
        />
      </div>

      {/* Audit Quota - HUD Style Bar Chart */}
      <div className="border border-slate-800/50 bg-black/20 backdrop-blur-md">
        <div className="px-3 py-2 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              GEO Audit Quota
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              {auditsQuota === -1 ? '∞ UNLIMITED' : `${auditsUsed}/${auditsQuota}`}
            </span>
            {subscription?.plan_tier === 'free' && (
              <Link
                to="/dashboard/billing"
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1"
              >
                UPGRADE
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
        <div className="p-3">
          <div className="relative h-8 bg-slate-900/50 border border-slate-800/50">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600/20 to-blue-500/30 border-r border-blue-500/50"
              style={{ width: `${auditsPercent}%` }}
            >
              <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-300 drop-shadow-lg">
                {auditsQuota === -1 ? 'UNLIMITED' : `${Math.round(auditsPercent)}% CONSUMED`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Panels - Compact Grid */}
      <div className="grid grid-cols-3 gap-2">
        <ActionPanel
          icon={Terminal}
          label="API Keys"
          description="Manage authentication"
          href="/dashboard/api-keys"
        />
        <ActionPanel
          icon={Cpu}
          label="Agent Keys"
          description="Ed25519 keypairs"
          href="/dashboard/agent-keys"
        />
        <ActionPanel
          icon={Activity}
          label="Analytics"
          description="Usage metrics"
          href="/dashboard/usage"
        />
      </div>

      {/* Upgrade Notice - Minimal */}
      {subscription?.plan_tier === 'free' && (
        <div className="border border-blue-500/20 bg-black/15 backdrop-blur-md">
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-mono text-slate-300">
                  Free Tier · {auditsQuota - auditsUsed} audit{(auditsQuota - auditsUsed) !== 1 ? 's' : ''} remaining
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  Starter $19/mo · Pro $49/mo · Enterprise $499/mo
                </div>
              </div>
            </div>
            <Link
              to="/dashboard/billing"
              className="px-3 py-1 text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors uppercase tracking-wider"
            >
              View Plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HUD-Style Metric Panel - High Density
 */
function MetricPanel({
  label,
  value,
  sublabel,
  trend,
  status,
}: {
  label: string;
  value: string;
  sublabel: string;
  trend: string;
  status: 'nominal' | 'warning' | 'critical';
}) {
  const statusColors = {
    nominal: 'border-slate-700/50 bg-black/20',
    warning: 'border-amber-500/20 bg-amber-950/10',
    critical: 'border-red-500/20 bg-red-950/10',
  };

  const statusIndicators = {
    nominal: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  return (
    <div className={`border ${statusColors[status]} backdrop-blur-md p-2.5`}>
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-1 h-1 rounded-full ${statusIndicators[status]}`} />
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            {label}
          </span>
        </div>
        {trend && trend !== 'stable' && (
          <span className="text-[9px] font-mono text-emerald-400">{trend}</span>
        )}
      </div>
      
      {/* Value */}
      <div className="font-mono font-bold text-2xl text-slate-100 leading-none mb-1">
        {value}
      </div>
      
      {/* Sublabel */}
      <div className="text-[10px] font-mono text-slate-600">
        {sublabel}
      </div>
    </div>
  );
}

/**
 * HUD-Style Action Panel - Compact
 */
function ActionPanel({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="border border-slate-800/50 bg-black/20 backdrop-blur-md hover:border-slate-700 hover:bg-black/30 transition-all group"
    >
      <div className="p-2.5 flex items-center gap-2.5">
        <div className="p-1.5 border border-slate-800/50 bg-black/30">
          <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-semibold text-slate-300 group-hover:text-slate-200">
            {label}
          </div>
          <div className="text-[10px] font-mono text-slate-600 truncate">
            {description}
          </div>
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-800/50" />
          <div className="h-3 w-64 bg-slate-800/30" />
        </div>
        <div className="h-8 w-24 bg-slate-800/50" />
      </div>
      
      {/* Metrics Skeleton */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-slate-800/50 bg-black/20 p-2.5 h-24" />
        ))}
      </div>
      
      {/* Bar Chart Skeleton */}
      <div className="border border-slate-800/50 bg-black/20 h-32" />
      
      {/* Action Panels Skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-slate-800/50 bg-black/20 h-16" />
        ))}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

export default OverviewPage;
