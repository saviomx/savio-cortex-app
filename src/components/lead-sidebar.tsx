'use client';

import { useState, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Inbox, UserPlus, MessageSquare, CheckCircle, Calendar, CalendarClock, AlertCircle, CalendarDays, X, MessageCircle, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lead status values matching the API
export type LeadStatus = 'all' | 'new_leads' | 'conversing' | 'qualified' | 'demo' | 'demo_today' | 'manual_mode';

// Window status for 24h filter
export type WindowStatus = 'all' | 'open' | 'expired';

interface SdrOption {
  id: number;
  name: string;
}

interface LeadSidebarProps {
  selectedCategory: LeadStatus;
  onCategoryChange: (category: LeadStatus) => void;
  onDateChange?: (dateFrom: string | null, dateTo: string | null) => void;
  initialDateFrom?: string | null;
  initialDateTo?: string | null;
  windowStatus?: WindowStatus;
  onWindowStatusChange?: (status: WindowStatus) => void;
  assignedSdrId?: number | null;
  onSdrChange?: (sdrId: number | null) => void;
  className?: string;
}

interface CategoryItem {
  id: LeadStatus;
  label: string;
  description: string;
  icon: React.ElementType;
  color?: string;
}

const categories: CategoryItem[] = [
  {
    id: 'all',
    label: 'All Leads',
    description: 'All conversations',
    icon: Inbox,
  },
  {
    id: 'new_leads',
    label: 'New Leads',
    description: '≤2 messages, not qualified',
    icon: UserPlus,
  },
  {
    id: 'conversing',
    label: 'Conversing',
    description: '>2 messages, not qualified',
    icon: MessageSquare,
  },
  {
    id: 'qualified',
    label: 'Qualified',
    description: 'Qualified leads',
    icon: CheckCircle,
    color: 'text-green-600',
  },
  {
    id: 'demo',
    label: 'Demo Scheduled',
    description: 'Has meeting scheduled',
    icon: Calendar,
    color: 'text-blue-600',
  },
  {
    id: 'demo_today',
    label: 'Demo Today',
    description: 'Demo scheduled for today',
    icon: CalendarClock,
    color: 'text-purple-600',
  },
  {
    id: 'manual_mode',
    label: 'Manual Mode',
    description: 'Agent paused',
    icon: AlertCircle,
    color: 'text-red-600',
  },
];

export const LeadSidebar = memo(function LeadSidebar({
  selectedCategory,
  onCategoryChange,
  onDateChange,
  initialDateFrom,
  initialDateTo,
  windowStatus = 'all',
  onWindowStatusChange,
  assignedSdrId,
  onSdrChange,
  className,
}: LeadSidebarProps) {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(initialDateFrom || '');
  const [dateTo, setDateTo] = useState<string>(initialDateTo || '');
  const [sdrOptions, setSdrOptions] = useState<SdrOption[]>([]);
  const [loadingSdrs, setLoadingSdrs] = useState(true);

  // Fetch SDR options on mount
  useEffect(() => {
    async function fetchSdrOptions() {
      try {
        const response = await fetch('/api/sdr/options');
        if (response.ok) {
          const data = await response.json();
          setSdrOptions(data.options || []);
        }
      } catch (error) {
        console.error('Error fetching SDR options:', error);
      } finally {
        setLoadingSdrs(false);
      }
    }
    fetchSdrOptions();
  }, []);

  const handleApplyDateFilter = () => {
    onDateChange?.(dateFrom || null, dateTo || null);
  };

  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    onDateChange?.(null, null);
    setShowDateFilter(false);
  };

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden bg-white border-r border-gray-200',
        className
      )}
    >
      {/* Date Filter Section */}
      <div className="border-b border-gray-200 p-3">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors',
            'hover:bg-gray-50',
            hasDateFilter && 'bg-blue-50 text-blue-700'
          )}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{hasDateFilter ? 'Date Filter Active' : 'Filter by Date'}</span>
          {hasDateFilter && (
            <X
              className="w-4 h-4 ml-auto hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                handleClearDateFilter();
              }}
            />
          )}
        </button>

        {showDateFilter && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
                onClick={handleClearDateFilter}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={handleApplyDateFilter}
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Window Filter */}
      {onWindowStatusChange && (
        <div className="border-b border-gray-200 p-3">
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chat Window</span>
          </div>
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => onWindowStatusChange('all')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                windowStatus === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              All
            </button>
            <button
              onClick={() => onWindowStatusChange('open')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                windowStatus === 'open'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <MessageCircle className="w-3 h-3" />
              Open
            </button>
            <button
              onClick={() => onWindowStatusChange('expired')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors',
                windowStatus === 'expired'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Clock className="w-3 h-3" />
              Expired
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const Icon = category.icon;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                'hover:bg-gray-50',
                isSelected && 'bg-gray-100',
                category.color
              )}
            >
              <Icon className={cn(
                'w-4 h-4 flex-shrink-0',
                isSelected ? 'text-gray-900' : 'text-gray-400',
                category.color
              )} />
              <div className="min-w-0">
                <div className={cn(
                  'text-sm truncate',
                  isSelected ? 'font-medium text-gray-900' : 'text-gray-700'
                )}>
                  {category.label}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Owner Filter - Fixed at Bottom */}
      {onSdrChange && (
        <div className="border-t border-gray-200 p-3 mt-auto">
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <User className="w-3 h-3" />
              Owner
            </span>
          </div>
          <Select
            value={assignedSdrId?.toString() || 'all'}
            onValueChange={(value) => onSdrChange(value === 'all' ? null : parseInt(value, 10))}
            disabled={loadingSdrs}
          >
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder={loadingSdrs ? 'Loading...' : 'All Owners'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {sdrOptions.map((sdr) => (
                <SelectItem key={sdr.id} value={sdr.id.toString()}>
                  {sdr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
});
