// @ts-nocheck
/**
 * Dashboard Overview Page
 * Main dashboard with KPIs and quick actions
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/dashboard/auth-guard';
import { getUsageStats, getCurrentCycleUsage, getUCPTRate } from '../../lib/dashboard/usage-analytics';
import { getSubscription } from '../../lib/dashboard/billing';
import { Activity, TrendingUp, Shield, Zap } from 'lucide-react';

interface Stats {
  totalCalls: number;
  successfulCalls: number;
  totalTokens: number;
  ucptRate: number;
}

export function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [plan, setPlan] = useState<'free' | 'pro' | 'agency'>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      getCurrentCycleUsage(user.id),
      getUCPTRate(user.id, 7),
      getSubscription(user.id),
    ]).then(([cycleUsage, ucptRate, subscription]) => {
      if ('error' in cycleUsage || 'error' in ucptRate || 'error' in subscription) {
        setLoading(false);
        return;
      }

      setStats({
        totalCalls: cycleUsage.total_calls,
        successfulCalls: cycleUsage.successful_calls,
        totalTokens: cycleUsage.total_tokens,
        ucptRate: typeof ucptRate === 'number' ? ucptRate : 0,
      });
      
      setPlan(subscription.plan_id);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const successRate = stats
    ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Monitor your API usage and manage your account
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Calls"
          value={stats?.totalCalls || 0}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber(stats?.totalTokens || 0)}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="UCPT Verified"
          value={`${stats?.ucptRate || 0}%`}
          icon={Shield}
          color="orange"
          subtitle={plan === 'free' ? 'Upgrade to Pro' : undefined}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="Create API Key"
            description="Generate a new API key for programmatic access"
            href="/dashboard/api-keys"
            buttonText="Create Key"
          />
          <QuickAction
            title="Generate Agent Key"
            description="Create Ed25519 keypair for AI agent authentication"
            href="/dashboard/agent-keys"
            buttonText="Generate"
          />
          <QuickAction
            title="View Usage"
            description="Analyze your API usage and performance metrics"
            href="/dashboard/usage"
            buttonText="View Analytics"
          />
        </div>
      </div>

      {/* Upgrade CTA (Free tier only) */}
      {plan === 'free' && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-2">Upgrade to Pro</h3>
          <p className="text-white/90 mb-4">
            Unlock unlimited calls, UCPT verification, causal tracer, and priority support
          </p>
          <Link
            to="/dashboard/billing"
            className="inline-flex px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            View Plans
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  buttonText,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <Link
        to={href}
        className="inline-flex px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
      >
        {buttonText}
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
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
