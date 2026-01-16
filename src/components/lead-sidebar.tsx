'use client';

import { cn } from '@/lib/utils';
import { Users, MessageSquare, CheckCircle, Calendar, AlertCircle } from 'lucide-react';

// Lead status values matching the API
export type LeadStatus = 'all' | 'new_leads' | 'conversing' | 'qualified' | 'demo' | 'need_human';

interface LeadSidebarProps {
  selectedCategory: LeadStatus;
  onCategoryChange: (category: LeadStatus) => void;
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
  className,
}: LeadSidebarProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden bg-white border-r border-gray-200',
        className
      )}
    >
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
