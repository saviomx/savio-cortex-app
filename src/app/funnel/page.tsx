'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Header } from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle2,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CRMMetricsResponse, FunnelStage, StepConversionRate } from '@/types/cortex';

type DateRange = '7d' | '14d' | '30d' | '90d' | '180d';

// Cache duration: 1 hour (in milliseconds)
const CACHE_DURATION = 60 * 60 * 1000;

// Fetcher function for SWR
const fetcher = async (url: string): Promise<CRMMetricsResponse> => {
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
    case '180d':
      startDate.setDate(endDate.getDate() - 180);
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

// Stage color mapping - updated for new naming
const STAGE_COLORS: Record<string, string> = {
  'Leads Created': '#3b82f6',
  'Conversations Started': '#6366f1',
  'Replies Received': '#8b5cf6',
  'Qualified Leads': '#eab308',
  'Demo Scheduled': '#f97316',
  'Product Explored': '#10b981',
  'Closed/Converted': '#059669',
};

const STAGE_GRADIENTS: Record<string, { start: string; end: string }> = {
  'Leads Created': { start: '#60a5fa', end: '#3b82f6' },
  'Conversations Started': { start: '#818cf8', end: '#6366f1' },
  'Replies Received': { start: '#a78bfa', end: '#8b5cf6' },
  'Qualified Leads': { start: '#facc15', end: '#eab308' },
  'Demo Scheduled': { start: '#fb923c', end: '#f97316' },
  'Product Explored': { start: '#34d399', end: '#10b981' },
  'Closed/Converted': { start: '#10b981', end: '#059669' },
};

const STAGE_BG_COLORS: Record<string, string> = {
  'Leads Created': 'bg-blue-500',
  'Conversations Started': 'bg-indigo-500',
  'Replies Received': 'bg-purple-500',
  'Qualified Leads': 'bg-yellow-500',
  'Demo Scheduled': 'bg-orange-500',
  'Product Explored': 'bg-emerald-500',
  'Closed/Converted': 'bg-emerald-600',
};

// Custom tooltip with better contrast
const CustomTooltip = ({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; dataKey: string; payload: Record<string, unknown> }>;
  label?: string | number;
  formatter?: (value: number, name: string, props: Record<string, unknown>) => [string, string];
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[140px]">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => {
        const formattedValue = formatter
          ? formatter(entry.value, entry.name, entry.payload)
          : [`${formatNumber(entry.value)}`, entry.name];
        return (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-600">{formattedValue[1]}</span>
            <span className="font-semibold text-gray-900">{formattedValue[0]}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function FunnelMetricsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { startDate, endDate } = getDateRange(dateRange);
  const apiUrl = `/api/metrics/crm?start_date=${startDate}&end_date=${endDate}`;

  const { data: metrics, error, isLoading, isValidating, mutate } = useSWR<CRMMetricsResponse>(
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

  const volume = metrics?.volume;
  const conversions = metrics?.conversions;

  // Prepare chart data for funnel bar chart with gradient IDs
  const funnelChartData = volume?.stages?.map((stage, index) => ({
    name: stage.name,
    count: stage.count,
    percentage: stage.percentage || 0,
    fill: STAGE_COLORS[stage.name] || '#94a3b8',
    gradientId: `gradient-${index}`,
  })) || [];

  // Prepare chart data for conversion rates
  const conversionChartData = conversions?.steps?.map((step, index) => ({
    name: `${step.from_stage.split(' ')[0]} → ${step.to_stage.split(' ')[0]}`,
    fullName: `${step.from_stage} → ${step.to_stage}`,
    rate: step.conversion_rate,
    fromCount: step.from_count,
    toCount: step.to_count,
    fill: step.conversion_rate >= 50 ? '#10b981' : step.conversion_rate >= 20 ? '#eab308' : '#ef4444',
    gradientId: `conv-gradient-${index}`,
  })) || [];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Header activeTab="funnel" />

      <div className="flex-1 overflow-auto p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-indigo-600" />
                CRM Funnel Metrics
              </h1>
              <p className="text-gray-500">Track your sales funnel volume and conversion rates</p>
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
                  <SelectItem value="180d">Last 180 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{error.message || 'Failed to load metrics'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Key Metrics Cards */}
          {!isLoading && volume && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Leads Created"
                value={volume.leads_created}
                icon={<Users className="w-5 h-5" />}
                iconBg="bg-blue-100 text-blue-600"
              />
              <MetricCard
                title="Conversations"
                value={volume.conversations_started}
                icon={<MessageSquare className="w-5 h-5" />}
                iconBg="bg-indigo-100 text-indigo-600"
              />
              <MetricCard
                title="Qualified"
                value={volume.qualified_leads}
                icon={<CheckCircle2 className="w-5 h-5" />}
                iconBg="bg-yellow-100 text-yellow-600"
              />
              <MetricCard
                title="Product Explored"
                value={volume.product_explored}
                icon={<Sparkles className="w-5 h-5" />}
                iconBg="bg-emerald-100 text-emerald-600"
                highlight
              />
            </div>
          )}

          {/* Overall Conversion - Now from Product Explored */}
          {!isLoading && conversions && volume && (
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">Overall Conversion Rate</p>
                  <p className="text-5xl font-bold mt-1">{conversions.overall_conversion.toFixed(1)}%</p>
                  <p className="text-white/70 text-sm mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                      {formatNumber(volume.leads_created)} leads
                    </span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                      {formatNumber(volume.product_explored)} explored
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-white/80" />
                  </div>
                  <p className="text-white/60 text-xs">
                    {conversions.start_date} - {conversions.end_date}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Volume */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                Funnel Volume
              </h2>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : volume?.stages && volume.stages.length > 0 ? (
                <div className="space-y-3">
                  {volume.stages.map((stage) => (
                    <FunnelVolumeRow
                      key={stage.name}
                      stage={stage}
                      maxCount={volume.leads_created}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No funnel data available
                </div>
              )}
            </div>

            {/* Step Conversion Rates */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-purple-600" />
                </div>
                Step Conversion Rates
              </h2>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : conversions?.steps && conversions.steps.length > 0 ? (
                <div className="space-y-3">
                  {conversions.steps.map((step, index) => (
                    <ConversionRateRow key={index} step={step} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No conversion data available
                </div>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Bar Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart className="w-4 h-4 text-blue-600" />
                </div>
                Funnel Visualization
              </h2>

              {isLoading ? (
                <Skeleton className="h-80" />
              ) : funnelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={funnelChartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="funnelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      stroke="#e2e8f0"
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#e2e8f0"
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <CustomTooltip
                          active={active}
                          payload={payload as Array<{ value: number; name: string; dataKey: string; payload: Record<string, unknown> }>}
                          label={label}
                          formatter={(value, _, props) => {
                            const percentage = (props as { percentage?: number })?.percentage;
                            return [`${formatNumber(value)} (${percentage?.toFixed(1) || 0}%)`, 'Count'];
                          }}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#funnelGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Conversion Rate Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600" />
                </div>
                Conversion Rate by Step
              </h2>

              {isLoading ? (
                <Skeleton className="h-80" />
              ) : conversionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={conversionChartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
                  >
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1}/>
                      </linearGradient>
                      <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      stroke="#e2e8f0"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#e2e8f0"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload as { fullName: string; rate: number; fromCount: number; toCount: number };
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                            <p className="text-sm font-medium text-gray-900 mb-2">{data.fullName}</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Rate</span>
                                <span className="font-bold text-gray-900">{data.rate.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">From</span>
                                <span className="text-gray-900">{formatNumber(data.fromCount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">To</span>
                                <span className="text-gray-900">{formatNumber(data.toCount)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                      {conversionChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.rate >= 50 ? 'url(#greenGradient)' :
                            entry.rate >= 20 ? 'url(#yellowGradient)' :
                            'url(#redGradient)'
                          }
                        />
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

          {/* Detailed Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-gray-600" />
              </div>
              Stage Details
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : conversions?.steps && conversions.steps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">From Stage</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">To Stage</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">From Count</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">To Count</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Conversion</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversions.steps.map((step, index) => {
                      const dropOff = step.from_count - step.to_count;
                      const dropOffPercent = step.from_count > 0 ? (dropOff / step.from_count) * 100 : 0;

                      return (
                        <tr key={index} className={cn(
                          'hover:bg-gray-50 transition-colors',
                          index !== conversions.steps.length - 1 ? 'border-b border-gray-100' : ''
                        )}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', STAGE_BG_COLORS[step.from_stage] || 'bg-gray-400')} />
                              <span className="font-medium text-gray-900">{step.from_stage}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', STAGE_BG_COLORS[step.to_stage] || 'bg-gray-400')} />
                              <span className="font-medium text-gray-900">{step.to_stage}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {formatNumber(step.from_count)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {formatNumber(step.to_count)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'font-semibold',
                                step.conversion_rate >= 50 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                step.conversion_rate >= 20 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              )}
                            >
                              {step.conversion_rate.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500 text-sm">
                            <span className="text-red-500">{formatNumber(dropOff)}</span>
                            <span className="text-gray-400 ml-1">({dropOffPercent.toFixed(1)}%)</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 text-gray-500">
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
  icon,
  iconBg,
  highlight,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      highlight
        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-200'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2.5 rounded-xl',
          highlight ? 'bg-white/10' : iconBg
        )}>
          {icon}
        </div>
        <div>
          <p className={cn(
            'text-2xl font-bold',
            highlight ? 'text-white' : 'text-gray-900'
          )}>
            {formatNumber(value)}
          </p>
          <p className={cn(
            'text-sm',
            highlight ? 'text-gray-400' : 'text-gray-500'
          )}>
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

function FunnelVolumeRow({
  stage,
  maxCount,
}: {
  stage: FunnelStage;
  maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 5) : 5;
  const gradient = STAGE_GRADIENTS[stage.name] || { start: '#94a3b8', end: '#64748b' };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700 truncate">{stage.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{formatNumber(stage.count)}</span>
          {stage.percentage !== null && (
            <Badge variant="outline" className="text-xs font-medium">
              {stage.percentage.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>
      <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
        <div
          className="h-full rounded-lg transition-all duration-500 group-hover:opacity-90"
          style={{
            width: `${widthPercent}%`,
            background: `linear-gradient(90deg, ${gradient.start} 0%, ${gradient.end} 100%)`
          }}
        />
      </div>
    </div>
  );
}

function ConversionRateRow({ step }: { step: StepConversionRate }) {
  const isHigh = step.conversion_rate >= 50;
  const isMedium = step.conversion_rate >= 20 && step.conversion_rate < 50;

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-700 truncate font-medium">{step.from_stage}</span>
        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-gray-600 transition-colors" />
        <span className="text-sm text-gray-700 truncate font-medium">{step.to_stage}</span>
      </div>
      <Badge
        variant="outline"
        className={cn(
          'font-bold shrink-0 min-w-[60px] justify-center',
          isHigh ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          isMedium ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
          'bg-red-50 text-red-700 border-red-200'
        )}
      >
        {step.conversion_rate.toFixed(1)}%
      </Badge>
    </div>
  );
}
