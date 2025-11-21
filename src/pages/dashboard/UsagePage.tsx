// @ts-nocheck
/**
 * Usage Analytics Page
 * Visualize API usage, UCPT metrics, and tool-level statistics
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/dashboard/auth-guard';
import { getDailyUsage, getTopTools, getUCPTRate } from '../../../lib/dashboard/usage-analytics';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Cpu, Zap, Activity, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function UsagePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [toolStats, setToolStats] = useState<any[]>([]);
  const [ucptStats, setUCPTStats] = useState<any>(null);
  const [dateRange, setDateRange] = useState(7); // days

  useEffect(() => {
    fetchUsageData();
  }, [dateRange]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const [daily, tools, ucptRate] = await Promise.all([
        getDailyUsage(user.id, dateRange),
        getTopTools(user.id, dateRange),
        getUCPTRate(user.id, dateRange),
      ]);

      if ('error' in daily || 'error' in tools || typeof ucptRate === 'object' && 'error' in ucptRate) {
        toast.error('Failed to load usage data');
        return;
      }

      setDailyStats(Array.isArray(daily) ? daily : []);
      setToolStats(Array.isArray(tools) ? tools : []);
      setUCPTStats({ average_ucpt: typeof ucptRate === 'number' ? ucptRate : 0, high_ucpt_calls: 0, low_ucpt_calls: 0, total_calls: dailyStats.length });
    } catch (error) {
      toast.error('Failed to fetch usage statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const totalCalls = dailyStats.reduce((acc, day) => acc + day.total_calls, 0);
  const avgSuccessRate = dailyStats.length > 0
    ? (dailyStats.reduce((acc, day) => acc + day.success_rate, 0) / dailyStats.length)
    : 0;
  const totalTokens = dailyStats.reduce((acc, day) => acc + day.total_tokens, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage Analytics</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Monitor API usage, token consumption, and UCPT metrics
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Calls"
          value={totalCalls.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Success Rate"
          value={`${avgSuccessRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Total Tokens"
          value={(totalTokens / 1000).toFixed(1) + 'K'}
          icon={<Cpu className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Avg UCPT"
          value={ucptStats?.average_ucpt?.toFixed(1) || '0.0'}
          icon={<Zap className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Daily API Calls
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="total_calls"
              stroke="#3B82F6"
              strokeWidth={2}
              name="API Calls"
              dot={{ fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tool Usage Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tool Usage Distribution
          </h3>
          {toolStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={toolStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ tool_name, percentage }) => `${tool_name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="call_count"
                >
                  {toolStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No tool usage data available
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tool Call Volume
          </h3>
          {toolStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={toolStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="tool_name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="call_count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No tool usage data available
            </div>
          )}
        </div>
      </div>

      {/* UCPT Breakdown */}
      {ucptStats && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            UCPT (Useful Computation Per Token) Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UCPTMetric
              label="Average UCPT"
              value={ucptStats.average_ucpt?.toFixed(2) || '0.00'}
              description="Overall efficiency score"
            />
            <UCPTMetric
              label="High UCPT %"
              value={`${((ucptStats.high_ucpt_calls / ucptStats.total_calls) * 100 || 0).toFixed(1)}%`}
              description="Calls with UCPT > 0.7"
              color="green"
            />
            <UCPTMetric
              label="Low UCPT %"
              value={`${((ucptStats.low_ucpt_calls / ucptStats.total_calls) * 100 || 0).toFixed(1)}%`}
              description="Calls with UCPT < 0.3"
              color="red"
            />
          </div>
        </div>
      )}

      {/* Recent Activity Table */}
      {dailyStats.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Breakdown
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tokens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Avg UCPT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {dailyStats.map((day) => (
                  <tr key={day.date}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {day.total_calls.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {day.success_rate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {day.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {day.average_ucpt?.toFixed(2) || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color = 'blue' }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function UCPTMetric({ label, value, description, color = 'blue' }: any) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-64" />
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
  );
}

export default UsagePage;
