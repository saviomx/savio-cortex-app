'use client';

import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RefreshIndicatorProps {
  isExpired: boolean;
  timeRemaining: string;
  loading: boolean;
  onRefresh: () => void;
  className?: string;
  showTimeRemaining?: boolean;
  compact?: boolean;
}

export function RefreshIndicator({
  isExpired,
  timeRemaining,
  loading,
  onRefresh,
  className,
  showTimeRemaining = true,
  compact = false,
}: RefreshIndicatorProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {isExpired ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-7 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {!loading && <span className="ml-1 text-xs">Refresh</span>}
          </Button>
        ) : showTimeRemaining ? (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeRemaining}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {isExpired ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-full">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 flex-1">Data may be outdated</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', loading && 'animate-spin')} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      ) : showTimeRemaining ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Clock className="w-4 h-4" />
          <span>Cached: {timeRemaining} remaining</span>
        </div>
      ) : null}
    </div>
  );
}

// Minimal version for inline use
export function RefreshButton({
  isExpired,
  loading,
  onRefresh,
  className,
}: {
  isExpired: boolean;
  loading: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  if (!isExpired && !loading) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className={cn(
        'h-6 w-6 p-0',
        isExpired ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'text-gray-400',
        className
      )}
    >
      <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
    </Button>
  );
}
