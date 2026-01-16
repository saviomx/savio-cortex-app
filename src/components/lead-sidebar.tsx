'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, MessageSquare, CheckCircle, Calendar, AlertCircle, CalendarDays, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Lead status values matching the API
export type LeadStatus = 'all' | 'new_leads' | 'conversing' | 'qualified' | 'demo' | 'need_human';

interface LeadSidebarProps {
  selectedCategory: LeadStatus;
  onCategoryChange: (category: LeadStatus) => void;
  onDateChange?: (dateFrom: string | null, dateTo: string | null) => void;
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
    icon: Users,
  },
  {
    id: 'new_leads',
    label: 'New Leads',
    description: '≤2 messages, not qualified',
    icon: Users,
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
    id: 'need_human',
    label: 'Needs Human',
    description: 'Agent paused',
    icon: AlertCircle,
    color: 'text-red-600',
  },
];

export function LeadSidebar({
  selectedCategory,
  onCategoryChange,
  onDateChange,
  className,
}: LeadSidebarProps) {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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
      {/* Date Filter Section - At Top */}
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
    </div>
  );
}
