'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, TrendingUp, TrendingDown, Users, MessageSquare, Clock, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(dateRange);
        const response = await fetch(
          `/api/metrics?start_date=${startDate}&end_date=${endDate}&type=all`
        );
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [dateRange]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="funnel" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Funnel Analytics</h1>
              <p className="text-gray-500">Track conversion performance and messaging metrics</p>
            </div>

            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[140px]">
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

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Conversations"
              value={metrics?.conversionSummary?.total_conversations}
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title="Valid Conversations"
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

          {/* Funnel Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Funnel Breakdown</h2>

            <div className="space-y-3">
              <FunnelRow
                label="Total Conversations"
                value={funnelTotals?.totalConversations}
                maxValue={funnelTotals?.totalConversations || 1}
                loading={loading}
                color="bg-gray-400"
              />
              <FunnelRow
                label="Valid Conversations (>1 msg)"
                value={funnelTotals?.conversationsMultiMsg}
                maxValue={funnelTotals?.totalConversations || 1}
                percentage={
                  funnelTotals
                    ? (funnelTotals.conversationsMultiMsg / funnelTotals.totalConversations) * 100
                    : 0
                }
                loading={loading}
                color="bg-blue-500"
              />
              <FunnelRow
                label="In Qualification"
                value={funnelTotals?.inQualification}
                maxValue={funnelTotals?.totalConversations || 1}
                percentage={
                  funnelTotals
                    ? (funnelTotals.inQualification / funnelTotals.conversationsMultiMsg) * 100
                    : 0
                }
                loading={loading}
                color="bg-yellow-500"
              />
              <FunnelRow
                label="Qualified Leads"
                value={funnelTotals?.qualifiedLeads}
                maxValue={funnelTotals?.totalConversations || 1}
                percentage={
                  funnelTotals
                    ? (funnelTotals.qualifiedLeads / funnelTotals.inQualification) * 100
                    : 0
                }
                loading={loading}
                color="bg-orange-500"
              />
              <FunnelRow
                label="Scheduling Intent"
                value={funnelTotals?.schedulingIntent}
                maxValue={funnelTotals?.totalConversations || 1}
                percentage={
                  funnelTotals
                    ? (funnelTotals.schedulingIntent / funnelTotals.qualifiedLeads) * 100
                    : 0
                }
                loading={loading}
                color="bg-purple-500"
              />
              <FunnelRow
                label="Demos Booked"
                value={funnelTotals?.conversationsWithDemo}
                maxValue={funnelTotals?.totalConversations || 1}
                percentage={
                  funnelTotals
                    ? (funnelTotals.conversationsWithDemo / funnelTotals.schedulingIntent) * 100
                    : 0
                }
                loading={loading}
                color="bg-green-500"
              />
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Conversations</h2>
            {loading ? (
              <Skeleton className="h-48" />
            ) : metrics?.conversationsCount?.data && metrics.conversationsCount.data.length > 0 ? (
              <DailyChart data={metrics.conversationsCount.data} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
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

function FunnelRow({
  label,
  value,
  maxValue,
  percentage,
  loading,
  color = 'bg-gray-900',
}: {
  label: string;
  value?: number;
  maxValue: number;
  percentage?: number;
  loading?: boolean;
  color?: string;
}) {
  const barWidth = value ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-48 text-sm text-gray-600">{label}</div>
      <div className="flex-1 flex items-center gap-3">
        {loading ? (
          <Skeleton className="h-8 flex-1" />
        ) : (
          <>
            <div className="flex-1 bg-gray-100 rounded-lg h-8 relative overflow-hidden">
              <div
                className={cn('absolute inset-y-0 left-0 rounded-lg flex items-center pl-3', color)}
                style={{ width: `${Math.max(barWidth, 8)}%` }}
              >
                <span className="text-sm font-medium text-white">
                  {value?.toLocaleString() || 0}
                </span>
              </div>
            </div>
            {percentage !== undefined && (
              <span className="w-16 text-sm text-gray-500 text-right">
                {isNaN(percentage) || !isFinite(percentage) ? '0.0' : percentage.toFixed(1)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DailyChart({ data }: { data: { day: string; conversations_count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.conversations_count), 1);

  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((item, i) => {
        const height = (item.conversations_count / maxCount) * 100;
        const date = new Date(item.day);
        const dayLabel = date.toLocaleDateString('en-US', { day: 'numeric' });

        return (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-gray-900 rounded-t transition-all hover:bg-gray-700"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${item.day}: ${item.conversations_count} conversations`}
            />
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 7) === 0) && (
              <span className="text-xs text-gray-400">{dayLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
