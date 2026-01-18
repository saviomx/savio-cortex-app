'use client';

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle, memo, useRef } from 'react';
import { Search, AlertTriangle, Bot, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatNumber } from '@/lib/utils';
import { getQualificationInfo, getQualificationClasses } from '@/lib/qualification';
import type { LeadStatus, WindowStatus } from '@/components/lead-sidebar';
import type { ConversationSearchItem } from '@/types/cortex';

interface Lead extends ConversationSearchItem {
  displayName: string;
  timeAgo: string;
  priority: 'urgent' | 'normal';
  last_message_content?: string | null;
  last_message_role?: string | null;
}

interface LeadListProps {
  selectedCategory: LeadStatus;
  dateFrom?: string | null;
  dateTo?: string | null;
  windowStatus?: WindowStatus;
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead | null) => void;
  className?: string;
}

export interface LeadListRef {
  refresh: () => void;
}

export const LeadList = memo(forwardRef<LeadListRef, LeadListProps>(function LeadList(
  { selectedCategory, dateFrom, dateTo, windowStatus, selectedLeadId, onSelectLead, className },
  ref
) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Store filter params in refs for stable callback
  const filtersRef = useRef({ selectedCategory, searchQuery, dateFrom, dateTo, windowStatus });
  filtersRef.current = { selectedCategory, searchQuery, dateFrom, dateTo, windowStatus };

  // Interval ref to avoid recreation
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stable fetch function that reads from refs
  const fetchLeads = useCallback(async (cursor?: string | null, append = false) => {
    const { selectedCategory, searchQuery, dateFrom, dateTo, windowStatus } = filtersRef.current;

    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        lead_status: selectedCategory,
        limit: '30',
      });

      if (searchQuery) {
        params.set('q', searchQuery);
      }
      if (dateFrom) {
        params.set('date_from', dateFrom);
      }
      if (dateTo) {
        params.set('date_to', dateTo);
      }
      if (windowStatus && windowStatus !== 'all') {
        params.set('window_status', windowStatus);
      }
      if (cursor) {
        params.set('cursor', cursor);
      }

      const response = await fetch(`/api/leads?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        if (append) {
          setLeads(prev => [...prev, ...(data.data || [])]);
        } else {
          setLeads(data.data || []);
        }
        setTotalCount(data.total_count || 0);
        setHasMore(data.has_more || false);
        setNextCursor(data.next_cursor || null);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // No dependencies - uses refs

  // Setup polling interval once on mount
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchLeads(), 10000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLeads]);

  // Fetch when filters change (separate from polling)
  useEffect(() => {
    fetchLeads();
  }, [selectedCategory, searchQuery, dateFrom, dateTo, windowStatus, fetchLeads]);

  useImperativeHandle(ref, () => ({
    refresh: () => fetchLeads(),
  }));

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchLeads(nextCursor, true);
    }
  };

  const getCategoryLabel = (category: LeadStatus): string => {
    const labels: Record<LeadStatus, string> = {
      all: 'All Leads',
      new_leads: 'New Leads',
      conversing: 'Conversing',
      qualified: 'Qualified',
      demo: 'Demo Scheduled',
      need_human: 'Needs Human',
    };
    return labels[category] || 'Leads';
  };

  const getQualificationBadge = (qual: string | null | undefined) => {
    const info = getQualificationInfo(qual);
    if (!info) return null;

    return (
      <Badge
        className={cn(
          'text-xs px-1.5 border',
          getQualificationClasses(info.color)
        )}
        title={info.description}
      >
        {info.shortLabel}
      </Badge>
    );
  };

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-white border-r border-gray-200', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">{getCategoryLabel(selectedCategory)}</h2>
          <span className="text-sm text-gray-500">{formatNumber(totalCount)} leads</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Lead List */}
      <ScrollArea className="flex-1 min-h-0">
        {loading && leads.length === 0 ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No leads found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const isSelected = selectedLeadId === lead.external_id || selectedLeadId === String(lead.id);
              const needsHuman = lead.state === 1;

              return (
                <button
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  onDoubleClick={() => {
                    if (isSelected) {
                      onSelectLead(null);
                    }
                  }}
                  className={cn(
                    'w-full p-4 text-left transition-colors hover:bg-gray-50',
                    isSelected && 'bg-blue-50 hover:bg-blue-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with Status Indicator */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          needsHuman ? 'bg-orange-100' : 'bg-gray-100'
                        )}
                      >
                        {needsHuman ? (
                          <User className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Bot className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      {/* Status Indicator - shows red for needs human, green for open, gray for closed */}
                      <div
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                          needsHuman
                            ? 'bg-red-500'
                            : lead.window_status === 'open'
                              ? 'bg-green-500'
                              : 'bg-gray-300'
                        )}
                        title={needsHuman ? 'Requires human attention' : lead.window_status === 'open' ? 'Chat window open' : 'Chat window closed'}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-900 truncate">
                          {lead.displayName || lead.client_name || `Lead #${lead.id}`}
                        </span>
                        {needsHuman && (
                          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                      </div>

                      {lead.client_company && (
                        <p className="text-sm text-gray-500 truncate">
                          {lead.client_company}
                        </p>
                      )}

                      {/* Last Message Preview */}
                      {lead.last_message_content && (
                        <p className="text-sm text-gray-400 truncate mt-0.5 mb-1">
                          {lead.last_message_content}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getQualificationBadge(lead.qualification)}

                        {needsHuman && (
                          <Badge variant="destructive" className="text-xs">
                            Needs Human
                          </Badge>
                        )}

                        {lead.has_meeting && (
                          <Badge
                            variant="default"
                            className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100"
                          >
                            Demo Scheduled
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {lead.timeAgo}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${formatNumber(leads.length)} of ${formatNumber(totalCount)})`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}));
