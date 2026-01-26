'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  MessageSquare,
  ClipboardCheck,
  FileText,
  Send,
  User,
  AlertTriangle,
  Music,
  Download,
  Calendar,
  ExternalLink,
  Phone,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  Building2,
  Video,
  Clock,
  Mail,
  Building,
  Briefcase,
  Bug,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  History,
  ListTodo,
  PhoneCall,
  MailOpen,
  StickyNote,
  CalendarCheck,
  Plus,
  Trash2,
  Edit3,
  LayoutTemplate,
  Target,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  AlertCircle,
  Brain,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatNumber } from '@/lib/utils';
import { getQualificationInfo, getQualificationClasses } from '@/lib/qualification';
import { formatDateDivider, shouldShowDateDivider, formatChatBubbleTime } from '@/lib/utils/date';
import { useAutoPolling } from '@/hooks/use-auto-polling';
import { TemplateSelectorDialog } from './template-selector-dialog';
import type {
  ConversationObject,
  Message,
  AgentStatusResponse,
  Meeting,
  HubSpotDeal,
  ConversationSummaryResponse,
  FormSubmissionsResponse,
  FormSubmission,
  FullContactResponse,
  ContactActivityResponse,
  TasksResponse,
  HubSpotTask,
  CompanyIntelligenceCheckResponse,
  CompanyIntelligenceStatus,
} from '@/types/cortex';
import { useDealStages } from '@/contexts/deal-stages-context';
import { useCRMCacheStore } from '@/lib/stores/crm-cache-store';
import { useAuth } from '@/contexts/auth-context';

type TabType = 'chat' | 'qualification' | 'form' | 'meetings' | 'summary' | 'crm' | 'timeline' | 'tasks' | 'company';

interface CRMData {
  deal: HubSpotDeal | null;
  has_deal: boolean;
  owner: { id: string; firstName?: string; lastName?: string; email?: string } | null;
  contact: {
    id: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    position?: string;
    lifecyclestage?: string;
    createdate?: string;
    lastmodifieddate?: string;
  } | null;
  has_contact: boolean;
  links: {
    contact_link?: string | null;
    deal_link?: string | null;
    company_link?: string | null;
  };
}

interface ChatPanelProps {
  leadId: string | null;
  leadName?: string;
  leadCompany?: string;
  leadPhone?: string;
  className?: string;
  onLeadUpdate?: () => void;
  onMobileBack?: () => void;
}

export const ChatPanel = memo(function ChatPanel({
  leadId,
  leadName,
  leadCompany,
  leadPhone,
  className,
  onLeadUpdate,
  onMobileBack,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [conversation, setConversation] = useState<ConversationObject | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [crmData, setCrmData] = useState<CRMData | null>(null);
  const [summary, setSummary] = useState<ConversationSummaryResponse | null>(null);
  const [formSubmissionsData, setFormSubmissionsData] = useState<FormSubmissionsResponse | null>(null);
  const [loadingFormSubmissions, setLoadingFormSubmissions] = useState(false);
  const [fullContact, setFullContact] = useState<FullContactResponse | null>(null);
  const [loadingFullContact, setLoadingFullContact] = useState(false);
  const [activityData, setActivityData] = useState<ContactActivityResponse | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [companyIntelligence, setCompanyIntelligence] = useState<CompanyIntelligenceCheckResponse | null>(null);
  const [loadingCompanyIntel, setLoadingCompanyIntel] = useState(false);
  const [generatingCompanyIntel, setGeneratingCompanyIntel] = useState(false);
  const companyIntelPollingRef = useRef<NodeJS.Timeout | null>(null);
  const { getStageLabel } = useDealStages();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // CRM Cache Store for TTL-based caching
  const crmCache = useCRMCacheStore();
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [updatingAttendance, setUpdatingAttendance] = useState<number | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // AbortController for cancelling in-flight requests on leadId change
  const abortControllerRef = useRef<AbortController | null>(null);
  // Store leadId in ref for stable callback references
  const leadIdRef = useRef(leadId);
  leadIdRef.current = leadId;

  // Fetch conversation - uses ref for stable reference in polling
  const fetchConversation = useCallback(async (isInitial = false, signal?: AbortSignal) => {
    const currentLeadId = leadIdRef.current;
    if (!currentLeadId) return;

    try {
      if (isInitial) setLoading(true);
      const response = await fetch(`/api/leads/${currentLeadId}`, { signal });

      if (response.ok) {
        const data = await response.json();
        // Only update state if this is still the active lead
        if (leadIdRef.current === currentLeadId) {
          setConversation(data);
          setAgentStatus(data.agent_status);
          if (data.meetings) {
            setMeetings(data.meetings);
          }
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching conversation:', error);
    } finally {
      if (isInitial && leadIdRef.current === currentLeadId) {
        setLoading(false);
      }
    }
  }, []); // No dependencies - uses refs for stable reference

  // Fetch CRM data
  const fetchCRMData = useCallback(async (signal?: AbortSignal) => {
    const currentLeadId = leadIdRef.current;
    if (!currentLeadId) return;
    try {
      const response = await fetch(`/api/leads/${currentLeadId}/crm`, { signal });
      if (response.ok) {
        const data = await response.json();
        // Only update state if this is still the active lead
        if (leadIdRef.current === currentLeadId) {
          setCrmData(data);
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching CRM data:', error);
    }
  }, []); // No dependencies - uses refs for stable reference

  const fetchSummary = async () => {
    if (!leadId || loadingSummary) return;
    try {
      setLoadingSummary(true);
      const response = await fetch(`/api/leads/${leadId}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch form submissions when Form tab is activated (with TTL caching)
  const fetchFormSubmissions = useCallback(async (forceRefresh = false) => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!phone || loadingFormSubmissions) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = crmCache.getFormSubmissions(phone);
      if (cached) {
        setFormSubmissionsData(cached);
        return;
      }
    }

    try {
      setLoadingFormSubmissions(true);
      const response = await fetch(`/api/crm/contact/form-submissions?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setFormSubmissionsData(data);
        crmCache.setFormSubmissions(phone, data);
      }
    } catch (error) {
      console.error('Error fetching form submissions:', error);
    } finally {
      setLoadingFormSubmissions(false);
    }
  }, [leadPhone, conversation?.client_data?.phone, loadingFormSubmissions, crmCache]);

  // Fetch full contact data when CRM tab is activated (with TTL caching)
  const fetchFullContact = useCallback(async (forceRefresh = false) => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!phone || loadingFullContact) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = crmCache.getFullContact(phone);
      if (cached) {
        setFullContact(cached);
        return;
      }
    }

    try {
      setLoadingFullContact(true);
      const response = await fetch(`/api/crm/contact/full?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setFullContact(data);
        crmCache.setFullContact(phone, data);
      }
    } catch (error) {
      console.error('Error fetching full contact:', error);
    } finally {
      setLoadingFullContact(false);
    }
  }, [leadPhone, conversation?.client_data?.phone, loadingFullContact, crmCache]);

  // Fetch activity timeline when Timeline tab is activated (with TTL caching)
  const fetchActivity = useCallback(async (forceRefresh = false) => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!phone || loadingActivity) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = crmCache.getActivityTimeline(phone);
      if (cached) {
        setActivityData(cached);
        return;
      }
    }

    try {
      setLoadingActivity(true);
      const response = await fetch(`/api/crm/contact/activity?phone=${encodeURIComponent(phone)}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
        crmCache.setActivityTimeline(phone, data);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, [leadPhone, conversation?.client_data?.phone, loadingActivity, crmCache]);

  // Fetch tasks when Tasks tab is activated (with TTL caching)
  const fetchTasks = useCallback(async (forceRefresh = false) => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!phone || loadingTasks) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = crmCache.getTasks(phone);
      if (cached) {
        setTasksData(cached);
        return;
      }
    }

    try {
      setLoadingTasks(true);
      const response = await fetch(`/api/crm/tasks?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setTasksData(data);
        crmCache.setTasks(phone, data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, [leadPhone, conversation?.client_data?.phone, loadingTasks, crmCache]);

  // Polling function for processing status (defined first since other callbacks reference it)
  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (companyIntelPollingRef.current) {
      clearInterval(companyIntelPollingRef.current);
    }

    const phone = leadPhone || conversation?.client_data?.phone;

    companyIntelPollingRef.current = setInterval(async () => {
      try {
        const params = new URLSearchParams();
        if (phone) params.set('phone', phone);

        const response = await fetch(`/api/leads/${leadId}/company-intelligence?${params}`);
        const data = await response.json();
        setCompanyIntelligence(data);

        // Stop polling if no longer processing
        if (data.status !== 'processing') {
          if (companyIntelPollingRef.current) {
            clearInterval(companyIntelPollingRef.current);
            companyIntelPollingRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling company intelligence:', error);
      }
    }, 5000); // Poll every 5 seconds
  }, [leadId, leadPhone, conversation?.client_data?.phone]);

  // Check if company intelligence exists (GET)
  const checkCompanyIntelligence = useCallback(async () => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!leadId || loadingCompanyIntel) return;

    try {
      setLoadingCompanyIntel(true);
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);

      const response = await fetch(`/api/leads/${leadId}/company-intelligence?${params}`);
      const data = await response.json();
      setCompanyIntelligence(data);

      // Start polling if status is processing
      if (data.status === 'processing') {
        startPolling();
      }
    } catch (error) {
      console.error('Error checking company intelligence:', error);
      setCompanyIntelligence({ exists: false, status: 'failed', error: 'Failed to check company intelligence' });
    } finally {
      setLoadingCompanyIntel(false);
    }
  }, [leadId, leadPhone, conversation?.client_data?.phone, loadingCompanyIntel, startPolling]);

  // Generate company intelligence (POST) - triggers background generation
  const generateCompanyIntelligence = useCallback(async (refresh = false) => {
    const phone = leadPhone || conversation?.client_data?.phone;
    if (!leadId || generatingCompanyIntel) return;

    try {
      setGeneratingCompanyIntel(true);
      const response = await fetch(`/api/leads/${leadId}/company-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh, phone }),
      });
      const data = await response.json();

      // Update state with response
      setCompanyIntelligence(data);

      // If status is "processing", start polling for completion
      if (data.status === 'processing') {
        startPolling();
      }
    } catch (error) {
      console.error('Error generating company intelligence:', error);
      setCompanyIntelligence({ exists: false, status: 'failed', error: 'Failed to generate company intelligence' });
    } finally {
      setGeneratingCompanyIntel(false);
    }
  }, [leadId, leadPhone, conversation?.client_data?.phone, generatingCompanyIntel, startPolling]);

  // Cleanup polling on unmount or lead change
  useEffect(() => {
    return () => {
      if (companyIntelPollingRef.current) {
        clearInterval(companyIntelPollingRef.current);
        companyIntelPollingRef.current = null;
      }
    };
  }, [leadId]);

  const updateMeetingAttendance = async (meetingId: number, showed: number) => {
    if (!leadId || updatingAttendance !== null) return;
    try {
      setUpdatingAttendance(meetingId);
      const response = await fetch(`/api/leads/${leadId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showed, phone: conversation?.client_data?.phone }),
      });
      if (response.ok) {
        // Refresh meetings
        const meetingsResponse = await fetch(`/api/leads/${leadId}/meetings`);
        if (meetingsResponse.ok) {
          const data = await meetingsResponse.json();
          setMeetings(data.meetings || []);
        }
      }
    } catch (error) {
      console.error('Error updating meeting attendance:', error);
    } finally {
      setUpdatingAttendance(null);
    }
  };

  // Use auto-polling hook for real-time updates (polling only, no immediate call)
  useAutoPolling({
    interval: 5000,
    enabled: !!leadId,
    onPoll: fetchConversation,
  });

  // Initial fetch when leadId changes - handles cancellation of in-flight requests
  useEffect(() => {
    // Cancel any in-flight requests from previous leadId
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (leadId) {
      // Create new AbortController for this leadId's requests
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Reset states immediately (but preserve activeTab for better UX)
      setConversation(null);
      setSummary(null);
      setCrmData(null);
      setMeetings([]);
      setFormSubmissionsData(null);
      setFullContact(null);
      setActivityData(null);
      setTasksData(null);
      setCompanyIntelligence(null);
      setMessageInput('');

      // Fetch data with abort signal
      fetchConversation(true, abortController.signal);
      fetchCRMData(abortController.signal);
    } else {
      // Clear states when no lead selected
      setConversation(null);
      setSummary(null);
      setCrmData(null);
      setMeetings([]);
      setAgentStatus(null);
    }

    // Cleanup: abort on unmount or leadId change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]); // Only depend on leadId - callbacks use refs

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversation?.conversation?.length]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !leadId || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/leads/${leadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageInput.trim() }),
      });

      if (response.ok) {
        setMessageInput('');
        fetchConversation();
        onLeadUpdate?.();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleToggleAgent = async () => {
    if (!leadId || toggling) return;

    // Use conversation.state as primary source: 0 = active, 1 = inactive
    const currentState = conversation?.state ?? 0;
    const newState = currentState === 0 ? 1 : 0;

    try {
      setToggling(true);
      const response = await fetch(`/api/leads/${leadId}/toggle-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: newState,
          phone: conversation?.client_data?.phone,
        }),
      });

      if (response.ok) {
        fetchConversation();
        onLeadUpdate?.();
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
    } finally {
      setToggling(false);
    }
  };

  // Check conversation state: 0 = ACTIVE (agent responds), 1 = INACTIVE (agent paused)
  // Also check agent_status as fallback
  const isAgentActive =
    conversation?.state === 0 ||
    agentStatus?.agent_state === '0' ||
    agentStatus?.agent_state === 'ACTIVE' ||
    agentStatus?.behavior?.includes('responds');

  // Check if within 24-hour messaging window (from API)
  // window_status: 'open' = within 24h, 'expired' = outside 24h
  const isWindowOpen = conversation?.window_status !== 'expired';

  // Get phone number for WhatsApp link
  const phoneNumber = leadPhone || conversation?.client_data?.phone;
  const cleanPhone = phoneNumber?.replace(/\D/g, '');

  // Count messages from the user (not assistant/agent messages)
  const userMessagesCount = conversation?.conversation?.filter(
    (msg: Message) => msg.role === 'user'
  ).length || 0;

  // Only show Summary tab when there are at least 5 user messages
  const showSummaryTab = userMessagesCount >= 5;

  // Summary can be generated when we have enough user messages
  const canGenerateSummary = showSummaryTab;

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'meetings' as const, label: 'Meetings', icon: Calendar, badge: meetings.length > 0 ? formatNumber(meetings.length) : undefined },
    { id: 'crm' as const, label: 'HubSpot', icon: Building2 },
    { id: 'qualification' as const, label: 'Qualification', icon: ClipboardCheck },
    { id: 'timeline' as const, label: 'Timeline', icon: History },
    { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, badge: tasksData?.total_count ? formatNumber(tasksData.total_count) : undefined },
    { id: 'form' as const, label: 'Form', icon: FileText },
    { id: 'company' as const, label: 'Company', icon: Target },
    ...(showSummaryTab ? [{ id: 'summary' as const, label: 'Summary', icon: Sparkles }] : []),
  ];

  if (!leadId) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-gray-50', className)}>
        <div className="text-center text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a lead to view conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Mobile back button */}
            {onMobileBack && (
              <button
                onClick={onMobileBack}
                className="md:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Back to leads"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {leadName || conversation?.client_data?.name || `Lead #${leadId}`}
              </h2>
              {(leadCompany || conversation?.client_data?.company) && (
                <p className="text-sm text-gray-500">
                  {leadCompany || conversation?.client_data?.company}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Deal Stage Badge - hidden on mobile */}
            {(crmData?.deal?.dealstage_label || (crmData?.deal?.dealstage && getStageLabel(crmData.deal.dealstage))) && (
              <Badge className="hidden md:inline-flex bg-purple-100 text-purple-700 hover:bg-purple-100 px-3 py-1.5">
                {crmData?.deal?.dealstage_label || getStageLabel(crmData?.deal?.dealstage)}
              </Badge>
            )}

            {/* WhatsApp Button - icon only on mobile */}
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span className="hidden md:inline">Open WhatsApp</span>
              </a>
            )}

            {/* Agent Toggle - simplified on mobile */}
            <div className="flex items-center gap-1 md:gap-2 bg-gray-100 rounded-lg px-2 md:px-3 py-1.5">
              <span className="hidden md:inline text-sm font-medium text-gray-700 mr-1">Agent</span>
              <span className={cn(
                'hidden md:inline text-xs font-medium w-7',
                !isAgentActive ? 'text-gray-900' : 'text-gray-400'
              )}>
                OFF
              </span>
              <Switch
                checked={isAgentActive}
                onCheckedChange={handleToggleAgent}
                disabled={toggling}
                className="data-[state=checked]:bg-green-500"
              />
              <span className={cn(
                'hidden md:inline text-xs font-medium w-7',
                isAgentActive ? 'text-green-600' : 'text-gray-400'
              )}>
                ON
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {conversation?.has_meeting !== undefined && conversation.has_meeting && (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              Demo Scheduled
            </Badge>
          )}
          {crmData?.owner && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-gray-100 text-gray-700">
              <User className="w-3 h-3" />
              {crmData.owner.firstName} {crmData.owner.lastName}
            </Badge>
          )}
          {conversation?.client_data?.assigned_sdr_id && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              SDR Assigned
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === 'chat' && (
          <>
            {/* Debug Toggle - Admin only */}
            {isAdmin && (
              <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-gray-100">
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
                    debugMode
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Bug className="w-3.5 h-3.5" />
                  Debug
                </button>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 p-4">
              {loading && !conversation ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                      <Skeleton className="h-16 w-3/4 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : conversation?.conversation?.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation?.conversation?.map((msg: Message, index: number) => {
                    const prevMsg = index > 0 ? conversation.conversation[index - 1] : null;
                    const showDivider = shouldShowDateDivider(msg.created_at, prevMsg?.created_at);
                    const dividerText = showDivider ? formatDateDivider(msg.created_at) : null;

                    return (
                      <div key={index}>
                        {/* Date Divider */}
                        {showDivider && dividerText && (
                          <div className="flex justify-center my-4">
                            <span className="bg-white text-gray-500 text-xs px-3 py-1 rounded-lg shadow-sm border border-gray-200">
                              {dividerText}
                            </span>
                          </div>
                        )}
                        <MessageBubble message={msg} showDebug={debugMode} />
                      </div>
                    );
                  })}
                  {/* Scroll anchor */}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input or Window Expired Banner */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              {!isWindowOpen ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      Chat window expired
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      The customer hasn&apos;t replied in 24+ hours. Send a template message to re-engage.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowTemplateSelector(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    <LayoutTemplate className="w-4 h-4 mr-1" />
                    Send Template
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Textarea
                    placeholder={isAgentActive ? "Turn off agent to send messages..." : "Type a message..."}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isAgentActive) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isAgentActive}
                    className={cn(
                      "min-h-[44px] max-h-32 resize-none",
                      isAgentActive && "bg-gray-50 text-gray-400 cursor-not-allowed"
                    )}
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isAgentActive || !messageInput.trim() || sending}
                    size="icon"
                    className="h-[44px] w-[44px]"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'qualification' && (
          <QualificationTab conversation={conversation} />
        )}

        {activeTab === 'form' && (
          <FormTab
            formSubmissionsData={formSubmissionsData}
            loading={loadingFormSubmissions}
            onFetch={fetchFormSubmissions}
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab
            meetings={meetings}
            onUpdateAttendance={updateMeetingAttendance}
            updatingAttendance={updatingAttendance}
          />
        )}

        {activeTab === 'summary' && showSummaryTab && (
          <SummaryTab
            summary={summary}
            canGenerate={canGenerateSummary}
            loading={loadingSummary}
            onGenerate={fetchSummary}
            userMessagesCount={userMessagesCount}
          />
        )}

        {activeTab === 'crm' && (
          <CRMTab
            crmData={crmData}
            fullContact={fullContact}
            loadingFullContact={loadingFullContact}
            onFetchFullContact={fetchFullContact}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab
            activityData={activityData}
            loading={loadingActivity}
            onFetch={fetchActivity}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasksData={tasksData}
            loading={loadingTasks}
            onFetch={fetchTasks}
            leadPhone={leadPhone || conversation?.client_data?.phone || null}
          />
        )}

        {activeTab === 'company' && (
          <CompanyIntelligenceTab
            data={companyIntelligence}
            loading={loadingCompanyIntel}
            generating={generatingCompanyIntel}
            onCheck={checkCompanyIntelligence}
            onGenerate={generateCompanyIntelligence}
          />
        )}
      </div>

      {/* Template Selector Dialog */}
      <TemplateSelectorDialog
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        phoneNumber={leadPhone || conversation?.client_data?.phone || ''}
        contactData={{
          name: leadName || crmData?.contact?.firstname || conversation?.client_data?.name || '',
          firstName: crmData?.contact?.firstname || '',
          lastName: crmData?.contact?.lastname || '',
          email: crmData?.contact?.email || '',
          phone: leadPhone || crmData?.contact?.phone || conversation?.client_data?.phone || '',
          company: leadCompany || crmData?.contact?.company || '',
          position: crmData?.contact?.position || '',
        }}
        onTemplateSent={() => {
          fetchConversation();
          onLeadUpdate?.();
        }}
      />
    </div>
  );
});


// Helper function to render text with clickable links
function renderTextWithLinks(text: string, className?: string): React.ReactNode {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (urlPattern.test(part)) {
      // Reset lastIndex since we're reusing the regex
      urlPattern.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('underline hover:opacity-80', className)}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

// Message Bubble Component
// Inverted: We are the chatbot (assistant), so our messages go on the right
function MessageBubble({ message, showDebug }: { message: Message; showDebug?: boolean }) {
  const [debugExpanded, setDebugExpanded] = useState(false);
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const formattedTime = formatChatBubbleTime(message.created_at);

  // Parse media from Cortex metadata structure
  const metadata = message.metadata;
  const mediaUrl = metadata?.media_url as string | undefined;
  const payloadType = metadata?.payload_type as string | undefined;
  const isVoice = metadata?.is_voice as boolean | undefined;
  const mediaMetadata = metadata?.media_metadata as {
    mime_type?: string;
    filename?: string;
    caption?: string;
  } | undefined;

  // Template media (header_media_url from templates with VIDEO/IMAGE/DOCUMENT headers)
  const templateMediaUrl = metadata?.header_media_url as string | undefined;
  const templateMediaType = (metadata?.header_type as string | undefined)?.toLowerCase(); // VIDEO -> video

  // Use template media if regular media not present
  const effectiveMediaUrl = mediaUrl || templateMediaUrl;
  const effectivePayloadType = payloadType || templateMediaType;

  const hasMedia = effectiveMediaUrl && effectivePayloadType;

  // Check if message failed and get failure reason
  const messageFailed = metadata?.kapso_status === 'failed' || metadata?.status === 'failed';
  const failureReason = metadata?.failure_reason as { code?: number; title?: string } | undefined;
  const failureText = failureReason?.title || failureReason?.code?.toString() || 'Message failed to deliver';

  // Don't show placeholder content like "[IMAGE]", "[Video]", or "[DOCUMENT: ...]" when we have media
  const isPlaceholderContent = message.content?.startsWith('[') && message.content?.endsWith(']');
  // Also strip "[Video]\n" prefix from template messages when showing actual video
  const strippedContent = templateMediaUrl
    ? message.content?.replace(/^\[(Video|Image|Document)\]\n*/i, '')
    : message.content;
  const displayContent = hasMedia && isPlaceholderContent ? mediaMetadata?.caption : strippedContent;

  // Only show system messages when debug mode is active
  if (isSystem) {
    if (!showDebug) return null;
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-[95%] bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">System Context</span>
          </div>
          <p className="text-xs text-amber-900 whitespace-pre-wrap break-words">
            {renderTextWithLinks(message.content || '')}
          </p>
          {formattedTime && (
            <p className="text-[10px] text-amber-500 mt-2">{formattedTime}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isAssistant ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex items-end gap-2 max-w-[80%]', isAssistant && 'flex-row-reverse')}>
        {/* Avatar for user (lead) messages */}
        {!isAssistant && (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl overflow-hidden',
            isAssistant
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md',
            hasMedia ? 'p-1 w-fit' : 'px-4 py-2.5'
          )}
        >
          {/* Media content */}
          {hasMedia && (
            <div className={cn('flex flex-col items-center', displayContent ? 'mb-1' : '')}>
              {effectivePayloadType === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveMediaUrl}
                  alt={mediaMetadata?.caption || 'Image'}
                  className="rounded-xl max-w-[280px] max-h-[350px] object-contain"
                />
              )}
              {effectivePayloadType === 'video' && (
                <video
                  src={effectiveMediaUrl}
                  controls
                  className="rounded-xl max-w-[280px] max-h-[400px] w-auto"
                />
              )}
              {(effectivePayloadType === 'audio' || (effectivePayloadType === 'voice' || isVoice)) && (
                <div className="p-3">
                  <div className={cn('flex items-center gap-2 mb-2', isVoice && 'text-xs')}>
                    <Music className="w-4 h-4" />
                    <span>{isVoice ? 'Voice message' : 'Audio'}</span>
                  </div>
                  <audio src={effectiveMediaUrl} controls className="w-full min-w-[200px]" />
                </div>
              )}
              {effectivePayloadType === 'document' && (
                <a
                  href={effectiveMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl',
                    isAssistant ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-200 hover:bg-gray-300'
                  )}
                >
                  <FileText className="w-8 h-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {mediaMetadata?.filename || 'Document'}
                    </p>
                    <p className={cn('text-xs', isAssistant ? 'text-blue-200' : 'text-gray-500')}>
                      {mediaMetadata?.mime_type || 'File'}
                    </p>
                  </div>
                  <Download className="w-4 h-4" />
                </a>
              )}
              {effectivePayloadType === 'sticker' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={effectiveMediaUrl}
                  alt="Sticker"
                  className="w-32 h-32 object-contain"
                />
              )}
            </div>
          )}

          {/* Text content (caption or transcribed voice message) */}
          {displayContent && (
            <p className={cn(
              'text-sm whitespace-pre-wrap break-words',
              hasMedia && 'px-3 pb-2 max-w-[280px]'
            )}>
              {renderTextWithLinks(displayContent, isAssistant ? 'text-blue-100' : 'text-blue-600')}
            </p>
          )}

          {/* Timestamp and status */}
          <div className={cn(
            'text-[10px] mt-1 text-right flex items-center justify-end gap-1',
            hasMedia ? 'px-3 pb-1 max-w-[280px]' : '',
            isAssistant ? 'text-blue-200' : 'text-gray-400'
          )}>
            {formattedTime}
            {messageFailed && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 text-red-500 font-medium cursor-help ml-2 bg-red-100 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Failed</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] bg-red-50 border-red-200 text-red-800">
                    <p className="text-xs font-medium">Delivery Failed</p>
                    <p className="text-xs text-red-600 mt-1">{failureText}</p>
                    {failureReason?.code && (
                      <p className="text-[10px] text-red-400 mt-1">Error code: {failureReason.code}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Debug metadata section */}
          {showDebug && metadata && Object.keys(metadata).length > 0 && (
            <div className={cn(
              'border-t mt-2 pt-2',
              isAssistant ? 'border-blue-400/30' : 'border-gray-300'
            )}>
              <button
                onClick={() => setDebugExpanded(!debugExpanded)}
                className={cn(
                  'flex items-center gap-1 text-xs w-full px-3 py-1',
                  isAssistant ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Bug className="w-3 h-3" />
                <span>Metadata</span>
                {debugExpanded ? (
                  <ChevronUp className="w-3 h-3 ml-auto" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-auto" />
                )}
              </button>
              {debugExpanded && (
                <div className="px-3 pb-2">
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
                      }}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded transition-colors',
                        isAssistant
                          ? 'text-blue-200 hover:bg-blue-500/30'
                          : 'text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      Copy
                    </button>
                  </div>
                  <div className={cn(
                    'max-h-40 overflow-y-auto overflow-x-auto rounded text-xs font-mono p-2',
                    isAssistant ? 'bg-blue-700/50 text-blue-100' : 'bg-gray-200 text-gray-600'
                  )}>
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Qualification Tab Component
function QualificationTab({ conversation }: { conversation: ConversationObject | null }) {
  const qualInfo = getQualificationInfo(conversation?.qualification);
  const clientData = conversation?.client_data;

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-6 pb-8">
        {/* Lead Qualification Section */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Lead Qualification</h3>
          <div className="grid gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className="font-medium">
                {conversation?.qualified ? (
                  <Badge className="bg-green-100 text-green-700">Qualified</Badge>
                ) : (
                  <Badge variant="secondary">Not Qualified</Badge>
                )}
              </div>
            </div>
            {qualInfo && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Qualification Type</div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      'text-sm px-2 py-1 border',
                      getQualificationClasses(qualInfo.color)
                    )}
                  >
                    {qualInfo.label}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-2">{qualInfo.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Gathered Information Section */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">AI Gathered Information</h3>
          <div className="grid gap-3">
            {clientData?.name && (
              <FormField label="Name" value={clientData.name} />
            )}
            {clientData?.email && (
              <FormField label="Email" value={clientData.email} />
            )}
            {clientData?.phone && (
              <FormField label="Phone" value={clientData.phone} />
            )}
            {clientData?.company && (
              <FormField label="Company" value={clientData.company} />
            )}
            {clientData?.position && (
              <FormField label="Position" value={clientData.position} />
            )}
            {clientData?.industry && (
              <FormField label="Industry" value={clientData.industry} />
            )}
            {clientData?.state && (
              <FormField label="State" value={clientData.state} />
            )}
            {clientData?.avg_invoices && (
              <FormField label="Avg. Invoices" value={String(clientData.avg_invoices)} />
            )}
            {!clientData?.name && !clientData?.email && !clientData?.phone && !clientData?.company && (
              <p className="text-sm text-gray-500">No contact information available</p>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Form Tab Component - Shows form submissions and marketing attribution
function FormTab({
  formSubmissionsData,
  loading,
  onFetch,
}: {
  formSubmissionsData: FormSubmissionsResponse | null;
  loading: boolean;
  onFetch: () => void;
}) {
  // Fetch data on first render if not already loaded
  useEffect(() => {
    if (!formSubmissionsData && !loading) {
      onFetch();
    }
  }, [formSubmissionsData, loading, onFetch]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading form submissions...</p>
        </div>
      </div>
    );
  }

  if (!formSubmissionsData || !formSubmissionsData.submissions || formSubmissionsData.submissions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No form submissions found</p>
          <p className="text-sm mt-1">This contact has not submitted any forms</p>
          <Button
            size="sm"
            variant="outline"
            onClick={onFetch}
            className="mt-4"
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            Form Submissions ({formatNumber(formSubmissionsData.total_count)})
          </h3>
          <Button size="sm" variant="outline" onClick={onFetch} className="h-8">
            Refresh
          </Button>
        </div>

        {/* Form Submissions List */}
        <div className="space-y-4">
          {formSubmissionsData.submissions.map((submission, index) => (
            <FormSubmissionCard key={submission.submission_id || index} submission={submission} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

// Individual Form Submission Card
function FormSubmissionCard({ submission }: { submission: FormSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const submittedDate = submission.submitted_at ? new Date(submission.submitted_at) : null;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">
              {submission.form_name || 'Unnamed Form'}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {submittedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {submittedDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {submission.campaign_name && (
              <Badge variant="secondary" className="text-xs">
                {submission.campaign_name}
              </Badge>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200 bg-white">
          {/* Form Fields */}
          {submission.values && submission.values.length > 0 && (
            <div className="pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Form Fields
              </div>
              <div className="grid gap-2">
                {submission.values.map((field, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded">
                    <div className="text-xs text-gray-500">{field.label || field.name}</div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {field.value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page URL */}
          {submission.page_url && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                Submitted From
              </div>
              <a
                href={submission.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all flex items-center gap-1"
              >
                {submission.page_title || submission.page_url}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500">Form ID</div>
              <div className="text-xs font-mono text-gray-700 truncate">{submission.form_id}</div>
            </div>
            {submission.submission_id && (
              <div>
                <div className="text-xs text-gray-500">Submission ID</div>
                <div className="text-xs font-mono text-gray-700 truncate">{submission.submission_id}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

// Meetings Tab Component
function MeetingsTab({
  meetings,
  onUpdateAttendance,
  updatingAttendance,
}: {
  meetings: Meeting[];
  onUpdateAttendance: (meetingId: number, showed: number) => void;
  updatingAttendance: number | null;
}) {
  if (meetings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No meetings scheduled</p>
        </div>
      </div>
    );
  }

  // Helper to calculate duration
  const getDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Helper to check if meeting is happening now or soon
  const getMeetingStatus = (startTime: Date | null, endTime: Date | null) => {
    if (!startTime || !endTime) return 'unknown';
    const now = new Date();
    if (now >= startTime && now <= endTime) return 'live';
    const diffMs = startTime.getTime() - now.getTime();
    if (diffMs > 0 && diffMs <= 15 * 60 * 1000) return 'starting_soon'; // Within 15 mins
    if (now > endTime) return 'past';
    return 'upcoming';
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4 pb-8">
        <h3 className="font-medium text-gray-900 mb-3">Meetings ({formatNumber(meetings.length)})</h3>

        <div className="grid gap-4">
          {meetings.map((meeting) => {
            const startTime = meeting.start_time ? new Date(meeting.start_time) : null;
            const endTime = meeting.end_time ? new Date(meeting.end_time) : null;
            const isUpdating = updatingAttendance === meeting.id;
            const meetingStatus = getMeetingStatus(startTime, endTime);
            const isLive = meetingStatus === 'live';
            const isStartingSoon = meetingStatus === 'starting_soon';
            const isPast = meetingStatus === 'past';

            return (
              <div
                key={meeting.id}
                className={cn(
                  'bg-gray-50 rounded-lg p-4 border',
                  isLive ? 'border-green-500 bg-green-50' :
                  isStartingSoon ? 'border-yellow-500 bg-yellow-50' :
                  'border-gray-200'
                )}
              >
                {/* Meeting Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      isLive ? 'bg-green-100' :
                      isStartingSoon ? 'bg-yellow-100' :
                      isPast ? 'bg-gray-200' : 'bg-blue-100'
                    )}>
                      <Video className={cn(
                        'w-5 h-5',
                        isLive ? 'text-green-600' :
                        isStartingSoon ? 'text-yellow-600' :
                        isPast ? 'text-gray-500' : 'text-blue-600'
                      )} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {startTime ? startTime.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }) : 'Date TBD'}
                      </div>
                      {startTime && endTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-gray-400">({getDuration(startTime, endTime)})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-1">
                    {isLive && (
                      <Badge className="bg-green-500 text-white animate-pulse">
                        Live Now
                      </Badge>
                    )}
                    {isStartingSoon && (
                      <Badge className="bg-yellow-500 text-white">
                        Starting Soon
                      </Badge>
                    )}
                    {meeting.showed === 1 && (
                      <Badge className="bg-green-100 text-green-700">Attended</Badge>
                    )}
                    {meeting.showed === 0 && (
                      <Badge className="bg-red-100 text-red-700">No Show</Badge>
                    )}
                    {meeting.showed === null && !isLive && !isStartingSoon && (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>

                {/* Meeting Details */}
                <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-200 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Meeting ID</div>
                    <div className="font-medium text-gray-700">{meeting.id}</div>
                  </div>
                  {meeting.google_event_id && (
                    <div>
                      <div className="text-xs text-gray-500">Google Event ID</div>
                      <div className="font-medium text-gray-700 truncate">{meeting.google_event_id}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="font-medium text-gray-700">
                      {new Date(meeting.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Last Updated</div>
                    <div className="font-medium text-gray-700">
                      {new Date(meeting.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  {/* Join Meeting Button */}
                  {meeting.calendar_link && !isPast && (
                    <Button
                      size="sm"
                      className={cn(
                        'h-9',
                        isLive ? 'bg-green-600 hover:bg-green-700' :
                        isStartingSoon ? 'bg-yellow-600 hover:bg-yellow-700' : ''
                      )}
                      asChild
                    >
                      <a
                        href={meeting.calendar_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Video className="w-4 h-4 mr-1.5" />
                        {isLive ? 'Join Now' : 'Join Meeting'}
                      </a>
                    </Button>
                  )}

                  {/* View in Calendar */}
                  {meeting.calendar_link && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9"
                      asChild
                    >
                      <a
                        href={meeting.calendar_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Calendar className="w-4 h-4 mr-1.5" />
                        View in Calendar
                      </a>
                    </Button>
                  )}
                </div>

                {/* Attendance Actions */}
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500 mr-2">Mark attendance:</span>
                  <Button
                    size="sm"
                    variant={meeting.showed === 1 ? 'default' : 'outline'}
                    onClick={() => onUpdateAttendance(meeting.id, 1)}
                    disabled={isUpdating}
                    className="h-8"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Showed
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={meeting.showed === 0 ? 'destructive' : 'outline'}
                    onClick={() => onUpdateAttendance(meeting.id, 0)}
                    disabled={isUpdating}
                    className="h-8"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-1" />
                        No Show
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

// Summary Tab Component
function SummaryTab({
  summary,
  canGenerate,
  loading,
  onGenerate,
  userMessagesCount,
}: {
  summary: ConversationSummaryResponse | null;
  canGenerate: boolean;
  loading: boolean;
  onGenerate: () => void;
  userMessagesCount: number;
}) {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">AI Summary</h3>
            <p className="text-xs text-gray-500">{formatNumber(userMessagesCount)} user messages</p>
          </div>
          {canGenerate && (
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="h-8"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {summary ? 'Regenerate' : 'Generate Summary'}
                </>
              )}
            </Button>
          )}
        </div>

        {canGenerate && !summary && !loading && (
          <div className="text-center text-gray-500 py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Click the button above to generate an AI summary</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
            <p className="text-gray-500">Generating summary...</p>
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-4">
            {/* Summary Text */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap">{summary.summary}</p>
            </div>

            {/* Summary Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {summary.client_name && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-0.5">Client Name</div>
                  <div className="font-medium">{summary.client_name}</div>
                </div>
              )}
              {summary.client_company && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-0.5">Company</div>
                  <div className="font-medium">{summary.client_company}</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">Total Messages</div>
                <div className="font-medium">{summary.total_messages}</div>
              </div>
              {summary.qualification && (() => {
                const qualInfo = getQualificationInfo(summary.qualification);
                return qualInfo ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-0.5">Qualification</div>
                    <Badge
                      className={cn(
                        'text-xs px-1.5 border',
                        getQualificationClasses(qualInfo.color)
                      )}
                    >
                      {qualInfo.label}
                    </Badge>
                  </div>
                ) : null;
              })()}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-0.5">Has Meeting</div>
                <div className="font-medium">{summary.has_meeting ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// CRM/HubSpot Tab Component
function CRMTab({
  crmData,
  fullContact,
  loadingFullContact,
  onFetchFullContact,
}: {
  crmData: CRMData | null;
  fullContact: FullContactResponse | null;
  loadingFullContact: boolean;
  onFetchFullContact: () => void;
}) {
  const HUBSPOT_PORTAL_ID = '50418538';
  const { getStageLabel } = useDealStages();
  const [showAllProperties, setShowAllProperties] = useState(false);

  // Fetch full contact data on first render if not already loaded
  useEffect(() => {
    if (!fullContact && !loadingFullContact) {
      onFetchFullContact();
    }
  }, [fullContact, loadingFullContact, onFetchFullContact]);

  if (!crmData) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Loading HubSpot data...</p>
        </div>
      </div>
    );
  }

  const hasAnyData = crmData.has_deal || crmData.has_contact || crmData.owner || fullContact;

  if (!hasAnyData) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No HubSpot data available</p>
          <p className="text-sm mt-1">This contact may not be synced with HubSpot</p>
        </div>
      </div>
    );
  }

  const props = fullContact?.properties || {};

  // Helper to format property values for display
  const formatPropertyValue = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const strValue = String(value);
    // Format snake_case values to readable text
    if (strValue.includes('_') && !strValue.includes(' ') && !strValue.includes('/') && !strValue.includes('@')) {
      return strValue.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return strValue;
  };

  // Fields to show prominently in the contact card
  const prominentFields = [
    'firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company', 'jobtitle',
    'annualrevenue', 'cuantos_cobros_haces_al_mes', 'start_date', 'call_status',
    'lifecyclestage', 'createdate', 'lastmodifieddate',
    'que_funcion_desempenas_dentro_de_tu_empresa', 'cuanto_vende_tu_empresa_al_ano',
    'cual_funcionalidad_es_la_que_mas_te_interesa',
  ];

  // Fields to completely hide from "All Properties" (internal IDs, already shown, or analytics)
  const hiddenFromAllProps = new Set([
    // Internal IDs
    'id', 'hs_object_id', 'hs_all_contact_vids',
    // Already shown in contact card
    ...prominentFields,
    // Marketing/Analytics fields (shown in Marketing Attribution)
    'hs_analytics_source', 'hs_analytics_source_data_1', 'hs_analytics_source_data_2',
    'hs_analytics_first_url', 'hs_analytics_first_referrer', 'hs_analytics_first_timestamp',
    'hs_analytics_first_touch_converting_campaign', 'hs_analytics_last_touch_converting_campaign',
    'hs_latest_source', 'hs_latest_source_data_1', 'hs_latest_source_data_2',
    'first_conversion_date', 'first_conversion_event_name',
    'recent_conversion_date', 'recent_conversion_event_name',
    'num_conversion_events',
    'hubspot_owner_id', // Shown in Owner section
  ]);

  // Get remaining properties for "All Properties" section
  const remainingProperties = (fullContact?.properties
    ? Object.entries(fullContact.properties)
        .filter(([key, value]) =>
          !hiddenFromAllProps.has(key) &&
          value !== null &&
          value !== undefined &&
          value !== ''
        )
        .sort(([a], [b]) => a.localeCompare(b))
    : []) || [];

  // Build key metrics array for cleaner rendering
  const keyMetrics = [
    { key: 'annualrevenue', label: 'Annual Revenue', value: props.annualrevenue, color: 'emerald' },
    { key: 'cuanto_vende_tu_empresa_al_ano', label: 'Company Sales/Year', value: props.cuanto_vende_tu_empresa_al_ano, color: 'emerald' },
    { key: 'cuantos_cobros_haces_al_mes', label: 'Monthly Collections', value: props.cuantos_cobros_haces_al_mes, color: 'violet' },
    { key: 'que_funcion_desempenas_dentro_de_tu_empresa', label: 'Role', value: props.que_funcion_desempenas_dentro_de_tu_empresa, color: 'slate' },
    { key: 'cual_funcionalidad_es_la_que_mas_te_interesa', label: 'Interest', value: props.cual_funcionalidad_es_la_que_mas_te_interesa, color: 'rose' },
    { key: 'start_date', label: 'Start Date', value: props.start_date, color: 'amber' },
    { key: 'call_status', label: 'Call Status', value: props.call_status, color: 'sky' },
  ].filter(m => m.value);

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-3 space-y-3 pb-6">
        {/* Refresh Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={onFetchFullContact}
            disabled={loadingFullContact}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <Loader2 className={cn("w-3.5 h-3.5", loadingFullContact && "animate-spin")} />
            {loadingFullContact ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* 1. Owner */}
        {crmData.owner && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
              {crmData.owner.firstName?.charAt(0)}{crmData.owner.lastName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">
                {crmData.owner.firstName} {crmData.owner.lastName}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">HubSpot Owner</div>
            </div>
          </div>
        )}

        {/* 2. Contact Card */}
        {((crmData.has_contact && crmData.contact) || fullContact) && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {String(props.firstname || crmData.contact?.firstname || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">
                      {props.firstname || crmData.contact?.firstname} {props.lastname || crmData.contact?.lastname}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {(props.lifecyclestage || crmData.contact?.lifecyclestage) && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {formatPropertyValue(props.lifecyclestage || crmData.contact?.lifecyclestage)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={fullContact?.hubspot_link || crmData.links.contact_link || `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-1/${crmData.contact?.id || fullContact?.contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in HubSpot
                </a>
              </div>
            </div>
            <div className="px-3 py-2 space-y-1.5 bg-gray-50/50">
              {(props.email || crmData.contact?.email) && (
                <a href={`mailto:${props.email || crmData.contact?.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{props.email || crmData.contact?.email}</span>
                </a>
              )}
              {(props.phone || crmData.contact?.phone) && (
                <a href={`tel:${props.phone || crmData.contact?.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{props.phone || crmData.contact?.phone}</span>
                </a>
              )}
            </div>
            {(props.createdate || crmData.contact?.createdate) && (
              <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400">
                Created {new Date(String(props.createdate || crmData.contact?.createdate)).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        {/* 3. Additional Properties (Key Metrics) */}
        {keyMetrics.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-700">Additional Properties</div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {keyMetrics.map((metric) => {
                const colors = colorClasses[metric.color] || colorClasses.slate;
                return (
                  <div key={metric.key} className={cn("px-2.5 py-2 rounded-md border", colors.bg, colors.border)}>
                    <div className={cn("text-[10px] font-medium uppercase tracking-wide", colors.text)}>{metric.label}</div>
                    <div className={cn("text-sm font-semibold mt-0.5", colors.text)}>{formatPropertyValue(metric.value)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other Properties (collapsible) */}
        {remainingProperties && remainingProperties.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setShowAllProperties(!showAllProperties)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span>Other Properties ({formatNumber(remainingProperties.length)})</span>
              {showAllProperties ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAllProperties && (
              <div className="px-3 pb-3 max-h-[200px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-1.5">
                  {remainingProperties.map(([key, value]) => (
                    <div key={key} className="px-2 py-1.5 bg-gray-50 rounded text-xs">
                      <div className="text-gray-400 truncate text-[10px]" title={key}>
                        {key.replace(/^hs_/i, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="font-medium text-gray-700 truncate">{formatPropertyValue(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Company Card */}
        {crmData.links.company_link && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {props.company || crmData.contact?.company || 'Company'}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">Associated Company</div>
                  </div>
                </div>
                <a
                  href={crmData.links.company_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in HubSpot
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 5. Deal Card */}
        {crmData.has_deal && crmData.deal && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{crmData.deal.dealname}</div>
                    <div className="flex items-center gap-2">
                      {(crmData.deal.dealstage_label || crmData.deal.dealstage) && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 hover:bg-purple-100">
                          {crmData.deal.dealstage_label || getStageLabel(crmData.deal.dealstage) || crmData.deal.dealstage}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={crmData.links.deal_link || `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-3/${crmData.deal.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in HubSpot
                </a>
              </div>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3 text-xs">
              {crmData.deal.amount !== null && crmData.deal.amount !== undefined && (
                <div>
                  <div className="text-gray-500">Amount</div>
                  <div className="font-semibold text-gray-900">${crmData.deal.amount.toLocaleString()}</div>
                </div>
              )}
              {crmData.deal.pipeline_label && (
                <div>
                  <div className="text-gray-500">Pipeline</div>
                  <div className="font-semibold text-gray-900">{crmData.deal.pipeline_label}</div>
                </div>
              )}
              {crmData.deal.closedate && (
                <div>
                  <div className="text-gray-500">Close Date</div>
                  <div className="font-semibold text-gray-900">{new Date(crmData.deal.closedate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Origin Card (Marketing Attribution) */}
        {fullContact?.marketing_attribution && Object.keys(fullContact.marketing_attribution).length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-700">Origin</div>
            </div>
            <div className="p-3 space-y-2">
              {fullContact.marketing_attribution.original_source && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Original Source</span>
                  <span className="text-xs font-medium text-gray-800">{formatPropertyValue(fullContact.marketing_attribution.original_source)}</span>
                </div>
              )}
              {fullContact.marketing_attribution.original_source_drill_down_1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Source Detail</span>
                  <span className="text-xs font-medium text-gray-800">{formatPropertyValue(fullContact.marketing_attribution.original_source_drill_down_1)}</span>
                </div>
              )}
              {fullContact.marketing_attribution.latest_source && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Latest Source</span>
                  <span className="text-xs font-medium text-gray-800">{formatPropertyValue(fullContact.marketing_attribution.latest_source)}</span>
                </div>
              )}
              {(fullContact.marketing_attribution.utm_source || fullContact.marketing_attribution.utm_medium || fullContact.marketing_attribution.utm_campaign) && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">UTM Parameters</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {fullContact.marketing_attribution.utm_source && (
                      <Badge variant="secondary" className="text-[10px]">
                        source: {fullContact.marketing_attribution.utm_source}
                      </Badge>
                    )}
                    {fullContact.marketing_attribution.utm_medium && (
                      <Badge variant="secondary" className="text-[10px]">
                        medium: {fullContact.marketing_attribution.utm_medium}
                      </Badge>
                    )}
                    {fullContact.marketing_attribution.utm_campaign && (
                      <Badge variant="secondary" className="text-[10px]">
                        campaign: {fullContact.marketing_attribution.utm_campaign}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {fullContact.marketing_attribution.first_conversion_event && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">First Conversion</span>
                    <span className="text-xs font-medium text-gray-800">{formatPropertyValue(fullContact.marketing_attribution.first_conversion_event)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// Timeline Tab Component - Shows HubSpot activity timeline
function TimelineTab({
  activityData,
  loading,
  onFetch,
}: {
  activityData: ContactActivityResponse | null;
  loading: boolean;
  onFetch: () => void;
}) {
  // Fetch data on first render if not already loaded
  useEffect(() => {
    if (!activityData && !loading) {
      onFetch();
    }
  }, [activityData, loading, onFetch]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading activity timeline...</p>
        </div>
      </div>
    );
  }

  if (!activityData || !activityData.activities || activityData.activities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No activity found</p>
          <p className="text-sm mt-1">This contact has no recorded activities in HubSpot</p>
          <Button
            size="sm"
            variant="outline"
            onClick={onFetch}
            className="mt-4"
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'notes':
        return <StickyNote className="w-4 h-4" />;
      case 'calls':
        return <PhoneCall className="w-4 h-4" />;
      case 'emails':
        return <MailOpen className="w-4 h-4" />;
      case 'meetings':
        return <CalendarCheck className="w-4 h-4" />;
      case 'tasks':
        return <ListTodo className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  // Get color classes for activity type
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'notes':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'calls':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'emails':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'meetings':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      case 'tasks':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  // Format duration in seconds to human readable
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Activity Timeline</h3>
            <p className="text-xs text-gray-500">{formatNumber(activityData.total_count)} activities</p>
          </div>
          <Button size="sm" variant="outline" onClick={onFetch} className="h-8">
            Refresh
          </Button>
        </div>

        {/* Activity Counts Summary */}
        {activityData.activity_counts && Object.keys(activityData.activity_counts).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(activityData.activity_counts).map(([type, count]) => {
              const colors = getActivityColor(type);
              return (
                <Badge key={type} variant="secondary" className={cn("text-xs", colors.bg, colors.text)}>
                  {type}: {count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-4">
            {activityData.activities.map((activity, index) => {
              const colors = getActivityColor(activity.type);
              const timestamp = activity.timestamp ? new Date(activity.timestamp) : null;

              return (
                <div key={activity.id || index} className="relative pl-12">
                  {/* Icon */}
                  <div className={cn(
                    "absolute left-2 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                    colors.bg, colors.text
                  )}>
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className={cn("bg-white rounded-lg border p-3", colors.border)}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn("text-xs capitalize", colors.bg, colors.text)}>
                          {activity.type.replace('_', ' ')}
                        </Badge>
                        {activity.direction && (
                          <Badge variant="outline" className="text-xs">
                            {activity.direction}
                          </Badge>
                        )}
                        {activity.status && (
                          <Badge variant="outline" className="text-xs">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                      {timestamp && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {timestamp.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: timestamp.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                          })}
                          {' '}
                          {timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {activity.title && (
                      <h4 className="font-medium text-gray-900 text-sm">{activity.title}</h4>
                    )}

                    {/* Body */}
                    {activity.body && (
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{activity.body}</p>
                    )}

                    {/* Call-specific details */}
                    {activity.type === 'calls' && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {activity.duration_seconds != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(activity.duration_seconds)}
                          </span>
                        )}
                        {activity.from_number && (
                          <span>From: {activity.from_number}</span>
                        )}
                        {activity.to_number && (
                          <span>To: {activity.to_number}</span>
                        )}
                        {activity.recording_url && (
                          <a
                            href={activity.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Music className="w-3 h-3" />
                            Recording
                          </a>
                        )}
                      </div>
                    )}

                    {/* Email-specific details */}
                    {activity.type === 'emails' && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {activity.from_email && <div>From: {activity.from_email}</div>}
                        {activity.to_email && <div>To: {activity.to_email}</div>}
                      </div>
                    )}

                    {/* Meeting-specific details */}
                    {activity.type === 'meetings' && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {activity.start_time && activity.end_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(activity.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(activity.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {activity.location && <span>Location: {activity.location}</span>}
                        {activity.outcome && <Badge variant="outline" className="text-xs">{activity.outcome}</Badge>}
                        {activity.meeting_link && (
                          <a
                            href={activity.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Video className="w-3 h-3" />
                            Join
                          </a>
                        )}
                      </div>
                    )}

                    {/* Task-specific details */}
                    {activity.type === 'tasks' && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {activity.priority && (
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            activity.priority === 'HIGH' && "border-red-300 text-red-600",
                            activity.priority === 'MEDIUM' && "border-yellow-300 text-yellow-600",
                            activity.priority === 'LOW' && "border-gray-300 text-gray-600"
                          )}>
                            {activity.priority} Priority
                          </Badge>
                        )}
                        {activity.task_type && <Badge variant="outline" className="text-xs">{activity.task_type}</Badge>}
                        {activity.completion_date && (
                          <span>Completed: {new Date(activity.completion_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Tasks Tab Component - CRUD for HubSpot tasks
function TasksTab({
  tasksData,
  loading,
  onFetch,
  leadPhone,
}: {
  tasksData: TasksResponse | null;
  loading: boolean;
  onFetch: (forceRefresh?: boolean) => void;
  leadPhone: string | null;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<HubSpotTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formTaskType, setFormTaskType] = useState<'TODO' | 'CALL' | 'EMAIL'>('TODO');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'>('NOT_STARTED');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Fetch data on first render if not already loaded
  useEffect(() => {
    if (!tasksData && !loading) {
      onFetch();
    }
  }, [tasksData, loading, onFetch]);

  const resetForm = () => {
    setFormTitle('');
    setFormDueDate('');
    setFormTaskType('TODO');
    setFormNotes('');
    setFormStatus('NOT_STARTED');
    setFormPriority('MEDIUM');
    setShowCreateForm(false);
    setEditingTask(null);
  };

  const handleCreate = async () => {
    if (!leadPhone || !formTitle.trim() || !formDueDate) return;

    try {
      setCreating(true);
      const response = await fetch(`/api/crm/tasks?phone=${encodeURIComponent(leadPhone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          due_date: formDueDate,
          task_type: formTaskType,
          notes: formNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        resetForm();
        onFetch(true); // Force refresh to bypass cache
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (taskId: string) => {
    try {
      setUpdating(taskId);
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim() || undefined,
          due_date: formDueDate || undefined,
          task_type: formTaskType,
          status: formStatus,
          priority: formPriority,
          notes: formNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        resetForm();
        onFetch(true); // Force refresh to bypass cache
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      setDeleting(taskId);
      const response = await fetch(`/api/crm/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onFetch(true); // Force refresh to bypass cache
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleMarkComplete = async (task: HubSpotTask) => {
    try {
      setUpdating(task.id);
      const response = await fetch(`/api/crm/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED',
        }),
      });

      if (response.ok) {
        onFetch(true); // Force refresh to bypass cache
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const startEditing = (task: HubSpotTask) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setFormTaskType((task.task_type as 'TODO' | 'CALL' | 'EMAIL') || 'TODO');
    setFormStatus((task.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') || 'NOT_STARTED');
    setFormPriority((task.priority as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM');
    setFormNotes(task.notes || '');
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          <p className="text-gray-500">Loading tasks...</p>
        </div>
      </div>
    );
  }

  const getTaskTypeIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'CALL':
        return <PhoneCall className="w-4 h-4" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4" />;
      default:
        return <ListTodo className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'WAITING':
      case 'DEFERRED':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'HIGH':
        return 'border-red-300 text-red-600';
      case 'MEDIUM':
        return 'border-yellow-300 text-yellow-600';
      default:
        return 'border-gray-300 text-gray-600';
    }
  };

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Tasks</h3>
            <p className="text-xs text-gray-500">{formatNumber(tasksData?.total_count || 0)} tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => onFetch(true)} className="h-8">
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowCreateForm(true);
                setEditingTask(null);
                resetForm();
              }}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingTask) && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
            <h4 className="font-medium text-gray-900">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h4>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="datetime-local"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formTaskType}
                  onChange={(e) => setFormTaskType(e.target.value as 'TODO' | 'CALL' | 'EMAIL')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODO">To-Do</option>
                  <option value="CALL">Call</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>

            {editingTask && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
              {editingTask ? (
                <Button
                  size="sm"
                  onClick={() => handleUpdate(editingTask.id)}
                  disabled={updating === editingTask.id || !formTitle.trim()}
                >
                  {updating === editingTask.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Save Changes
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating || !formTitle.trim() || !formDueDate}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  Create Task
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Tasks List */}
        {!tasksData || tasksData.tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No tasks found</p>
            <p className="text-sm mt-1">Create a new task to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasksData.tasks.map((task) => {
              const dueDate = task.due_date ? new Date(task.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date() && task.status !== 'COMPLETED';
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div
                  key={task.id}
                  className={cn(
                    "bg-white rounded-lg border p-3 transition-colors",
                    isOverdue && "border-red-200 bg-red-50",
                    isCompleted && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleMarkComplete(task)}
                      disabled={updating === task.id}
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {updating === task.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : null}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {task.task_type && (
                            <span className="text-gray-400 flex-shrink-0">
                              {getTaskTypeIcon(task.task_type)}
                            </span>
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            isCompleted && "line-through text-gray-500"
                          )}>
                            {task.title || 'Untitled Task'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditing(task)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit task"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={deleting === task.id}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete task"
                          >
                            {deleting === task.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Body/Description - rendered as HTML */}
                      {task.body && (
                        <div
                          className={cn(
                            "text-sm text-gray-700 mt-2 prose prose-sm max-w-none",
                            "[&_p]:my-1 [&_br]:leading-relaxed",
                            isCompleted && "text-gray-500"
                          )}
                          dangerouslySetInnerHTML={{ __html: task.body }}
                        />
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {task.status && (
                          <Badge className={cn("text-xs", getStatusColor(task.status))}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        )}
                        {task.priority && (
                          <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                        )}
                        {dueDate && (
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            isOverdue ? "text-red-600" : "text-gray-500"
                          )}>
                            <Clock className="w-3 h-3" />
                            {dueDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isOverdue && <span className="font-medium">(Overdue)</span>}
                          </span>
                        )}
                      </div>

                      {/* Created/Updated timestamps */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {task.created_at && (
                          <span>
                            Created: {new Date(task.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {task.updated_at && (
                          <span>
                            Updated: {new Date(task.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {task.notes && (
                        <div
                          className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded border border-gray-100"
                          dangerouslySetInnerHTML={{ __html: task.notes }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// Company Intelligence Tab Component
function CompanyIntelligenceTab({
  data,
  loading,
  generating,
  onCheck,
  onGenerate,
}: {
  data: CompanyIntelligenceCheckResponse | null;
  loading: boolean;
  generating: boolean;
  onCheck: () => void;
  onGenerate: (refresh?: boolean) => void;
}) {
  // Auto-fetch on mount if no data
  useEffect(() => {
    if (!data && !loading) {
      onCheck();
    }
  }, [data, loading, onCheck]);

  // Loading state - initial check
  if (loading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-500" />
          <p className="text-gray-500">Checking for company intelligence...</p>
        </div>
      </div>
    );
  }

  // Status: not_found - Show generate button
  if (data?.status === 'not_found') {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">Company Intelligence</h4>
          <p className="text-sm text-gray-500 mb-4 max-w-sm">
            Generate AI-powered insights about this company including fit score, talking points, and objection handlers.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 max-w-sm">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> Requires a business email address. Personal emails (Gmail, Yahoo, etc.) are not supported.
            </p>
          </div>
          <Button onClick={() => onGenerate(false)} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Generate Intelligence'}
          </Button>
        </div>
      </div>
    );
  }

  // Status: processing - Show spinner with message
  if (data?.status === 'processing') {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
          <h4 className="font-medium text-gray-900 mb-2">Generating Intelligence</h4>
          <p className="text-sm text-gray-500 max-w-sm">
            {data.message || 'Analyzing company website and generating insights. This may take a minute...'}
          </p>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
      </div>
    );
  }

  // Status: failed - Show error with retry
  if (data?.status === 'failed') {
    // Determine error message based on error code
    const errorMessages: Record<string, string> = {
      'NO_EMAIL': 'No email address found for this contact.',
      'PERSONAL_EMAIL': 'Contact has a personal email (Gmail, Yahoo, etc). A business email is required.',
      'INVALID_EMAIL': 'Could not extract domain from the email address.',
      'CLIENT_NOT_FOUND': 'Contact not found in the system.',
      'SCRAPE_FAILED': 'Failed to analyze the company website.',
      'ANALYSIS_FAILED': 'Failed to generate company analysis.',
      'PITCH_FAILED': 'Failed to generate sales pitch.',
      'GENERATION_FAILED': data.message || 'Previous generation attempt failed.',
    };
    const errorMessage = data.error_code && errorMessages[data.error_code]
      ? errorMessages[data.error_code]
      : (typeof data.error === 'string' ? data.error : data.message || 'An unexpected error occurred.');

    // Errors that cannot be retried (email issues)
    const nonRetryableErrors = ['NO_EMAIL', 'PERSONAL_EMAIL', 'INVALID_EMAIL', 'CLIENT_NOT_FOUND'];
    const canRetry = !data.error_code || !nonRetryableErrors.includes(data.error_code);

    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800">Unable to generate intelligence</h4>
              <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
              {canRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onGenerate(true)}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Status: completed - Show company data
  if (data?.status === 'completed' && data.company) {
    const company = data.company;

    return (
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Company Intelligence</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerate(true)}
            disabled={generating}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", generating && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {/* Company Header */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">
                {company.name || company.overview?.company_name || 'Company'}
              </h4>
            </div>
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-3"
              >
                <ExternalLink className="w-3 h-3" />
                {company.domain || company.website}
              </a>
            )}

            {/* Company Info Grid */}
            {company.overview && (
              <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                {company.overview.industry_vertical && (
                  <div>
                    <span className="text-gray-500">Industry:</span>
                    <p className="font-medium text-gray-800">{company.overview.industry_vertical}</p>
                  </div>
                )}
                {company.overview.sub_vertical && (
                  <div>
                    <span className="text-gray-500">Sub-vertical:</span>
                    <p className="font-medium text-gray-800">{company.overview.sub_vertical}</p>
                  </div>
                )}
                {company.overview.location && (
                  <div>
                    <span className="text-gray-500">Location:</span>
                    <p className="font-medium text-gray-800">
                      {[company.overview.location.city, company.overview.location.state, company.overview.location.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
                {company.overview.company_size_estimate && (
                  <div>
                    <span className="text-gray-500">Company Size:</span>
                    <p className="font-medium text-gray-800">{company.overview.company_size_estimate.category}</p>
                  </div>
                )}
                {company.overview.target_customer?.type && (
                  <div>
                    <span className="text-gray-500">Business Type:</span>
                    <p className="font-medium text-gray-800">{company.overview.target_customer.type}</p>
                  </div>
                )}
                {company.overview.business_model_indicators?.invoice_volume_estimate?.score && (
                  <div>
                    <span className="text-gray-500">Invoice Volume:</span>
                    <p className="font-medium text-gray-800">{company.overview.business_model_indicators.invoice_volume_estimate.score}</p>
                  </div>
                )}
              </div>
            )}

            {/* Products/Services - handles both string[] and object[] formats */}
            {company.overview?.products_services && company.overview.products_services.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Products & Services</p>
                <div className="space-y-2">
                  {company.overview.products_services.map((item: string | { name: string; description?: string; pricing_model?: string }, index: number) => {
                    if (typeof item === 'string') {
                      return (
                        <span key={index} className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full mr-1.5 mb-1">
                          {item}
                        </span>
                      );
                    }
                    return (
                      <div key={index} className="bg-gray-50 p-2 rounded-lg text-sm">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        {item.description && <p className="text-gray-600 text-xs mt-0.5">{item.description}</p>}
                        {item.pricing_model && <p className="text-gray-500 text-xs mt-0.5">Pricing: {item.pricing_model}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Differentiators */}
            {company.overview?.key_differentiators && company.overview.key_differentiators.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Key Differentiators</p>
                <ul className="space-y-1.5">
                  {company.overview.key_differentiators.map((item: string | Record<string, unknown>, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {typeof item === 'string' ? item : JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pain Points */}
            {company.overview?.pain_points_inferred && company.overview.pain_points_inferred.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Identified Pain Points</p>
                <div className="space-y-2">
                  {company.overview.pain_points_inferred.map((item: string | { pain_point: string; confidence?: string; evidence?: string }, index: number) => {
                    if (typeof item === 'string') {
                      return (
                        <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-amber-500 mt-0.5">•</span>
                          {item}
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="bg-amber-50 p-2 rounded-lg text-sm">
                        <div className="flex items-start justify-between">
                          <p className="text-gray-700 font-medium">{item.pain_point}</p>
                          {item.confidence && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              item.confidence.toLowerCase() === 'alta' ? "bg-red-100 text-red-700" :
                              item.confidence.toLowerCase() === 'media' ? "bg-amber-100 text-amber-700" :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {item.confidence}
                            </span>
                          )}
                        </div>
                        {item.evidence && <p className="text-xs text-gray-500 mt-1">{item.evidence}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Decision Maker Profile */}
            {company.overview?.decision_maker_profile && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Decision Maker Profile</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                  {company.overview.decision_maker_profile.likely_title && (
                    <p className="text-gray-700">
                      <span className="font-medium">Likely Title:</span> {company.overview.decision_maker_profile.likely_title}
                    </p>
                  )}
                  {(company.overview.decision_maker_profile.likely_concerns || company.overview.decision_maker_profile.primary_concerns) && (
                    <div>
                      <span className="font-medium text-gray-700">Likely Concerns:</span>
                      <ul className="mt-1 ml-4">
                        {(company.overview.decision_maker_profile.likely_concerns || company.overview.decision_maker_profile.primary_concerns || []).map((concern: string, index: number) => (
                          <li key={index} className="text-gray-600 list-disc">{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {company.overview.decision_maker_profile.likely_objections && company.overview.decision_maker_profile.likely_objections.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Likely Objections:</span>
                      <ul className="mt-1 ml-4">
                        {company.overview.decision_maker_profile.likely_objections.map((objection: string, index: number) => (
                          <li key={index} className="text-gray-600 list-disc">{objection}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sales Pitch */}
          {company.sales_pitch && (
            <>
              {/* Fit Score */}
              {(() => {
                const fitAnalysis = company.sales_pitch.fit_analysis;
                const fitAnalysisObj = typeof fitAnalysis === 'object' && fitAnalysis !== null ? fitAnalysis : null;
                const fitScore = company.sales_pitch.fit_score ?? fitAnalysisObj?.score;
                const fitReasoning = company.sales_pitch.fit_reasoning ?? fitAnalysisObj?.score_reasoning;
                const fitScoreNum = typeof fitScore === 'number' ? (fitScore > 10 ? fitScore : fitScore * 10) : 0;

                return fitScore !== undefined && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">Fit Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              fitScoreNum >= 80 ? "bg-green-500" :
                              fitScoreNum >= 60 ? "bg-blue-500" :
                              fitScoreNum >= 40 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${fitScoreNum}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-bold text-lg",
                          fitScoreNum >= 80 ? "text-green-600" :
                          fitScoreNum >= 60 ? "text-blue-600" :
                          fitScoreNum >= 40 ? "text-amber-600" : "text-red-600"
                        )}>
                          {fitScore}/10
                        </span>
                      </div>
                    </div>
                    {fitReasoning && (
                      <p className="text-sm text-gray-600 mt-2">{fitReasoning}</p>
                    )}
                  </div>
                );
              })()}

              {/* Value Proposition */}
              {company.sales_pitch.value_proposition && (
                (() => {
                  const vp = company.sales_pitch.value_proposition;
                  const vpObj = typeof vp === 'object' && vp !== null ? vp : null;
                  if (!vpObj) return null;
                  return (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-semibold text-gray-900">Value Proposition</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {vpObj.elevator_pitch && (
                          <p className="text-gray-700 bg-indigo-50 p-3 rounded-lg italic">
                            &ldquo;{vpObj.elevator_pitch}&rdquo;
                          </p>
                        )}
                        {vpObj.primary_message && (
                          <p className="text-gray-600">
                            <span className="font-medium">Key message:</span> {vpObj.primary_message}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* ROI Talking Points */}
              {company.sales_pitch.roi_talking_points && company.sales_pitch.roi_talking_points.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900">ROI Impact</h4>
                  </div>
                  <div className="space-y-2">
                    {company.sales_pitch.roi_talking_points.map((roi, index) => (
                      <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded-lg text-sm">
                        <span className="font-medium text-gray-700">{roi.metric}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 line-through">{roi.current_estimate}</span>
                          <ArrowRight className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-green-700">{roi.with_savio}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Savio Features to Highlight */}
              {company.sales_pitch.savio_features_to_highlight && company.sales_pitch.savio_features_to_highlight.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Features to Demo</h4>
                  </div>
                  <div className="space-y-3">
                    {company.sales_pitch.savio_features_to_highlight.map((feature, index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium text-blue-800 text-sm">{feature.feature}</p>
                        <p className="text-xs text-gray-600 mt-1">{feature.relevance_to_prospect}</p>
                        {feature.demo_talking_point && (
                          <p className="text-xs text-blue-600 mt-1 italic">Demo tip: {feature.demo_talking_point}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Starters */}
              {company.sales_pitch.conversation_starters && company.sales_pitch.conversation_starters.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="w-5 h-5 text-teal-600" />
                    <h4 className="font-semibold text-gray-900">Conversation Starters</h4>
                  </div>
                  <div className="space-y-3">
                    {company.sales_pitch.conversation_starters.map((starter, index) => (
                      <div key={index} className="bg-teal-50 p-3 rounded-lg">
                        {starter.context && (
                          <span className="text-xs bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full mb-2 inline-block">
                            {starter.context}
                          </span>
                        )}
                        <p className="text-sm font-medium text-teal-800">
                          &ldquo;{starter.opener || starter.hook}&rdquo;
                        </p>
                        {(starter.transition_to_discovery || starter.follow_up) && (
                          <p className="text-xs text-gray-600 mt-1">
                            → {starter.transition_to_discovery || starter.follow_up}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Psychological Approach */}
              {company.sales_pitch.psychological_approach && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-violet-600" />
                    <h4 className="font-semibold text-gray-900">Psychological Approach</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    {company.sales_pitch.psychological_approach.buyer_archetype && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-700 w-28 flex-shrink-0">Buyer Type:</span>
                        <span className="text-gray-600">{company.sales_pitch.psychological_approach.buyer_archetype}</span>
                      </div>
                    )}
                    {company.sales_pitch.psychological_approach.trust_building_strategy && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-700 w-28 flex-shrink-0">Build Trust:</span>
                        <span className="text-gray-600">{company.sales_pitch.psychological_approach.trust_building_strategy}</span>
                      </div>
                    )}
                    {company.sales_pitch.psychological_approach.communication_style && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-700 w-28 flex-shrink-0">Comm Style:</span>
                        <span className="text-gray-600">{company.sales_pitch.psychological_approach.communication_style}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Competitive Positioning */}
              {company.sales_pitch.competitive_positioning && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-gray-900">Competitive Positioning</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    {/* Handle both likely_current_solution and likely_alternatives */}
                    {company.sales_pitch.competitive_positioning.likely_current_solution && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-700">Current Solution</p>
                        <p className="text-gray-600 mt-1">{company.sales_pitch.competitive_positioning.likely_current_solution}</p>
                      </div>
                    )}
                    {company.sales_pitch.competitive_positioning.likely_alternatives && company.sales_pitch.competitive_positioning.likely_alternatives.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-700 mb-2">Likely Alternatives</p>
                        <div className="flex flex-wrap gap-1.5">
                          {company.sales_pitch.competitive_positioning.likely_alternatives.map((alt: string, index: number) => (
                            <span key={index} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* How to differentiate */}
                    {company.sales_pitch.competitive_positioning.how_to_differentiate && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium text-green-700">How to Differentiate</p>
                        <p className="text-gray-600 mt-1">{company.sales_pitch.competitive_positioning.how_to_differentiate}</p>
                      </div>
                    )}
                    {/* Legacy: savio_advantages */}
                    {company.sales_pitch.competitive_positioning.savio_advantages && company.sales_pitch.competitive_positioning.savio_advantages.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium text-green-700 mb-2">Savio Advantages</p>
                        <ul className="space-y-1">
                          {company.sales_pitch.competitive_positioning.savio_advantages.map((adv: string | Record<string, unknown>, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-gray-600">
                              <span className="text-green-500">✓</span>
                              {typeof adv === 'string' ? adv : JSON.stringify(adv)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Legacy: potential_weaknesses */}
                    {company.sales_pitch.competitive_positioning.potential_weaknesses && company.sales_pitch.competitive_positioning.potential_weaknesses.length > 0 && (
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-medium text-amber-700 mb-2">Watch Out For</p>
                        <ul className="space-y-1">
                          {company.sales_pitch.competitive_positioning.potential_weaknesses.map((weak: string | Record<string, unknown>, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-gray-600">
                              <span className="text-amber-500">!</span>
                              {typeof weak === 'string' ? weak : JSON.stringify(weak)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Talking Points */}
              {(() => {
                const talkingPoints = company.sales_pitch.talking_points || company.sales_pitch.key_talking_points;
                return talkingPoints && talkingPoints.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-gray-900">Talking Points</h4>
                    </div>
                    <ul className="space-y-2">
                      {talkingPoints.map((point: string | Record<string, unknown>, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{typeof point === 'string' ? point : JSON.stringify(point)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Objection Handlers - handles both objection_handlers and objection_handling */}
              {(() => {
                const objections = company.sales_pitch.objection_handlers || company.sales_pitch.objection_handling;
                return objections && objections.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h4 className="font-semibold text-gray-900">Objection Handlers</h4>
                    </div>
                    <div className="space-y-3">
                      {objections.map((handler, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              &ldquo;{handler.objection}&rdquo;
                            </p>
                            {handler.likelihood && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                handler.likelihood.toLowerCase() === 'high' ? "bg-red-100 text-red-700" :
                                handler.likelihood.toLowerCase() === 'medium' ? "bg-amber-100 text-amber-700" :
                                "bg-green-100 text-green-700"
                              )}>
                                {handler.likelihood}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-green-700">Response: </span>
                            {handler.response || handler.response_using_savio_info}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Discovery Questions */}
              {company.sales_pitch.discovery_questions && company.sales_pitch.discovery_questions.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Discovery Questions</h4>
                  </div>
                  <ul className="space-y-3">
                    {company.sales_pitch.discovery_questions.map((q, index) => {
                      // Handle both string and object formats
                      const questionText = typeof q === 'string' ? q : q.question;
                      const idealAnswer = typeof q === 'object' ? q.ideal_answer_leads_to : null;
                      const savioFeature = typeof q === 'object' ? q.connects_to_savio_feature : null;

                      return (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-700 font-medium">{questionText}</p>
                            {idealAnswer && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">Ideal answer:</span> {idealAnswer}
                              </p>
                            )}
                            {savioFeature && (
                              <p className="text-xs text-purple-600 mt-0.5">
                                → {savioFeature}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Next Steps - handles both array and object formats */}
              {company.sales_pitch.next_steps && (
                <div className="bg-white border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Suggested Next Steps</h4>
                  </div>
                  {Array.isArray(company.sales_pitch.next_steps) ? (
                    <ul className="space-y-2">
                      {company.sales_pitch.next_steps.map((step: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-3">
                      {company.sales_pitch.next_steps.recommended_action && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">Recommended Action</p>
                          <p className="text-sm text-gray-700 mt-1">{company.sales_pitch.next_steps.recommended_action}</p>
                        </div>
                      )}
                      {company.sales_pitch.next_steps.how_to_propose && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-800">How to Propose</p>
                          <p className="text-sm text-gray-600 mt-1">{company.sales_pitch.next_steps.how_to_propose}</p>
                        </div>
                      )}
                      {company.sales_pitch.next_steps.urgency_angle && (
                        <div className="bg-amber-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-amber-800">Urgency Angle</p>
                          <p className="text-sm text-gray-700 mt-1">{company.sales_pitch.next_steps.urgency_angle}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Fallback - shouldn't happen
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center text-gray-500">
        <p>Unable to load company intelligence.</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onCheck}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

