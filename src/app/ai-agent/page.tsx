'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, MessageSquare, Clock, Target, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type {
  FunnelMetricsResponse,
  ConversionRatesResponse,
  ConversionSummaryResponse,
  ConversationsCountResponse,
  MessagesByRoleResponse,
  TotalMessagesResponse,
  ResponseTimeResponse,
  ConversionDailyResponse,
} from '@/types/cortex';

type DateRange = '7d' | '14d' | '30d' | '90d';

interface MetricsData {
  funnel: FunnelMetricsResponse;
  conversionRates: ConversionRatesResponse;
  conversionSummary: ConversionSummaryResponse;
  conversationsCount: ConversationsCountResponse;
  messagesByRole: MessagesByRoleResponse;
  totalMessages: TotalMessagesResponse;
  responseTime: ResponseTimeResponse;
  conversionsDaily: ConversionDailyResponse;
}

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// Fetcher function for SWR
const fetcher = async (url: string): Promise<MetricsData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to load metrics');
  }
  return response.json();
};

function getDateRange(range: DateRange): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '14d':
      startDate.setDate(endDate.getDate() - 14);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function AIAgentPage() {
  const [dateRange, setDateRange] = useState<DateRange>('14d');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { startDate, endDate } = getDateRange(dateRange);
  const apiUrl = `/api/metrics?start_date=${startDate}&end_date=${endDate}&type=all`;

  const { data: metrics, error, isLoading, isValidating, mutate } = useSWR<MetricsData>(
    apiUrl,
    fetcher,
    {
      dedupingInterval: CACHE_DURATION,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      onSuccess: () => {
        setLastFetched(new Date());
      },
    }
  );

  const handleRefresh = () => {
    mutate();
  };

  const loading = isLoading;

  // Calculate funnel totals from the data
  const funnelTotals = useMemo(() => {
    if (!metrics?.funnel?.data) return null;

    const data = metrics.funnel.data;
    return {
      totalConversations: data.reduce((sum, d) => sum + d.total_conversations, 0),
      conversationsMultiMsg: data.reduce((sum, d) => sum + d.conversations_multi_msg, 0),
      inQualification: data.reduce((sum, d) => sum + d.in_qualification, 0),
      qualifiedLeads: data.reduce((sum, d) => sum + d.qualified_leads, 0),
      schedulingIntent: data.reduce((sum, d) => sum + d.scheduling_intent, 0),
      conversationsWithDemo: data.reduce((sum, d) => sum + d.conversations_with_demo, 0),
    };
  }, [metrics]);

  // Calculate messages by role
  const messageStats = useMemo(() => {
    if (!metrics?.messagesByRole?.data) return { user: 0, assistant: 0, total: 0 };

    const data = metrics.messagesByRole.data;
    const user = data.filter(d => d.role === 'user').reduce((sum, d) => sum + d.messages_count, 0);
    const assistant = data.filter(d => d.role === 'assistant').reduce((sum, d) => sum + d.messages_count, 0);

    return { user, assistant, total: metrics.messagesByRole.total_messages };
  }, [metrics]);

  // Format response time
  const avgResponseTime = useMemo(() => {
    const seconds = metrics?.responseTime?.avg_user_to_assistant_response_seconds;
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  }, [metrics]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!metrics?.conversionsDaily?.data) return [];
    return metrics.conversionsDaily.data.map(d => ({
      ...d,
      date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [metrics]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="ai-agent" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Agent Dashboard</h1>
              <p className="text-gray-500">Track conversion performance and messaging metrics</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Last Updated & Refresh */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {lastFetched && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatLastUpdated(lastFetched)}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isValidating}
                  className="gap-1.5"
                >
                  <RefreshCw className={cn('w-4 h-4', isValidating && 'animate-spin')} />
                  Refresh
                </Button>
              </div>

              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="14d">Last 14 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error.message || 'Failed to load metrics'}
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Conversations"
              value={metrics?.conversionSummary?.total_conversations}
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title="Multi-message"
              value={metrics?.conversionSummary?.conversations_multi_msg}
              subtitle={`${((metrics?.conversionSummary?.conversations_multi_msg || 0) / Math.max(metrics?.conversionSummary?.total_conversations || 1, 1) * 100).toFixed(1)}% of total`}
              icon={MessageSquare}
              loading={loading}
            />
            <MetricCard
              title="Demos Booked"
              value={metrics?.conversionSummary?.conversations_with_demo}
              icon={Target}
              loading={loading}
              highlight
            />
            <MetricCard
              title="Conversion Rate"
              value={`${metrics?.conversionSummary?.conversion_rate_percentage?.toFixed(1) || '0'}%`}
              icon={Zap}
              loading={loading}
              highlight
            />
          </div>

          {/* Conversion Rates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <RateCard
              title="In-Qualification Rate"
              value={metrics?.conversionRates?.inqualification_conversion_rate}
              description="% entering qualification"
              loading={loading}
            />
            <RateCard
              title="Qualified Rate"
              value={metrics?.conversionRates?.qualified_conversion_rate}
              description="% that qualified"
              loading={loading}
            />
            <RateCard
              title="Scheduling Rate"
              value={metrics?.conversionRates?.scheduling_conversion_rate}
              description="% with scheduling intent"
              loading={loading}
            />
          </div>

          {/* Messaging & Response Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Message Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Activity</h3>
              {loading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Messages</span>
                    <span className="text-2xl font-bold text-gray-900">{messageStats.total.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">User Messages</span>
                      <span className="font-medium">{messageStats.user.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(messageStats.user / Math.max(messageStats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Assistant Messages</span>
                      <span className="font-medium">{messageStats.assistant.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(messageStats.assistant / Math.max(messageStats.total, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Performance</h3>
              {loading ? (
                <Skeleton className="h-32" />
              ) : (
                <div className="flex flex-col items-center justify-center h-32">
                  <Clock className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-3xl font-bold text-gray-900">{avgResponseTime}</span>
                  <span className="text-sm text-gray-500">Avg. Response Time</span>
                </div>
              )}
            </div>
          </div>

          {/* Charts with Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Tabs defaultValue="conversations" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Daily Trends</h2>
                <TabsList>
                  <TabsTrigger value="conversations">Conversations</TabsTrigger>
                  <TabsTrigger value="demos">Demos</TabsTrigger>
                  <TabsTrigger value="conversion">Conversion Rate</TabsTrigger>
                </TabsList>
              </div>

              {loading ? (
                <Skeleton className="h-80" />
              ) : chartData.length > 0 ? (
                <>
                  <TabsContent value="conversations" className="mt-0">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="total_conversations"
                          name="Total Conversations"
                          stroke="#94a3b8"
                          fillOpacity={1}
                          fill="url(#colorTotal)"
                        />
                        <Area
                          type="monotone"
                          dataKey="conversations_multi_msg"
                          name="Multi-message"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorValid)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="demos" className="mt-0">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDemos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="conversations_with_demo"
                          name="Demos Booked"
                          stroke="#22c55e"
                          fillOpacity={1}
                          fill="url(#colorDemos)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>

                  <TabsContent value="conversion" className="mt-0">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" unit="%" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Conversion Rate']}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="conversion_rate_percentage"
                          name="Conversion Rate"
                          stroke="#a855f7"
                          fillOpacity={1}
                          fill="url(#colorRate)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-500">
                  No data available
                </div>
              )}
            </Tabs>
          </div>

          {/* Funnel Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Funnel Breakdown</h2>

            {loading ? (
              <Skeleton className="h-80" />
            ) : funnelTotals ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={[
                    { name: 'Total Conversations', value: funnelTotals.totalConversations, fill: '#94a3b8' },
                    { name: 'Multi-message', value: funnelTotals.conversationsMultiMsg, fill: '#3b82f6' },
                    { name: 'In Qualification', value: funnelTotals.inQualification, fill: '#eab308' },
                    { name: 'Qualified Leads', value: funnelTotals.qualifiedLeads, fill: '#f97316' },
                    { name: 'Scheduling Intent', value: funnelTotals.schedulingIntent, fill: '#a855f7' },
                    { name: 'Demos Booked', value: funnelTotals.conversationsWithDemo, fill: '#22c55e' },
                  ]}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    width={110}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value, _name, props) => {
                      const val = value as number;
                      const total = funnelTotals.conversationsMultiMsg || 1;
                      const percentage = props.payload.name === 'Total Conversations'
                        ? 100
                        : ((val / total) * 100).toFixed(1);
                      return [`${val.toLocaleString()} (${percentage}%)`, ''];
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[
                      { name: 'Total Conversations', fill: '#94a3b8' },
                      { name: 'Multi-message', fill: '#3b82f6' },
                      { name: 'In Qualification', fill: '#eab308' },
                      { name: 'Qualified Leads', fill: '#f97316' },
                      { name: 'Scheduling Intent', fill: '#a855f7' },
                      { name: 'Demos Booked', fill: '#22c55e' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  highlight,
}: {
  title: string;
  value?: number | string;
  subtitle?: string;
  icon: React.ElementType;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4',
      highlight ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', highlight ? 'text-gray-400' : 'text-gray-500')} />
        <span className={cn('text-sm', highlight ? 'text-gray-400' : 'text-gray-500')}>{title}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <>
          <div className={cn('text-2xl font-bold', highlight ? 'text-white' : 'text-gray-900')}>
            {typeof value === 'number' ? value.toLocaleString() : value || '0'}
          </div>
          {subtitle && (
            <div className={cn('text-xs mt-1', highlight ? 'text-gray-400' : 'text-gray-500')}>
              {subtitle}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RateCard({
  title,
  value,
  description,
  loading,
}: {
  title: string;
  value?: number;
  description?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {value?.toFixed(1) || '0.0'}%
          </span>
        </div>
      )}
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
}
