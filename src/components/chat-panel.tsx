'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAutoPolling } from '@/hooks/use-auto-polling';
import type { ConversationObject, Message, AgentStatusResponse, Meeting, HubSpotDeal, ConversationSummaryResponse } from '@/types/cortex';

type TabType = 'chat' | 'qualification' | 'form' | 'meetings' | 'summary' | 'crm';

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
}

export function ChatPanel({
  leadId,
  leadName,
  leadCompany,
  leadPhone,
  className,
  onLeadUpdate,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [conversation, setConversation] = useState<ConversationObject | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [crmData, setCrmData] = useState<CRMData | null>(null);
  const [summary, setSummary] = useState<ConversationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [updatingAttendance, setUpdatingAttendance] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversation = useCallback(async (isInitial = false) => {
    if (!leadId) return;

    try {
      if (isInitial) setLoading(true);
      const response = await fetch(`/api/leads/${leadId}`);

      if (response.ok) {
        const data = await response.json();
        setConversation(data);
        setAgentStatus(data.agent_status);
        if (data.meetings) {
          setMeetings(data.meetings);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [leadId]);

  const fetchCRMData = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await fetch(`/api/leads/${leadId}/crm`);
      if (response.ok) {
        const data = await response.json();
        setCrmData(data);
      }
    } catch (error) {
      console.error('Error fetching CRM data:', error);
    }
  }, [leadId]);

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

  // Use auto-polling hook for real-time updates
  useAutoPolling({
    interval: 5000,
    enabled: !!leadId,
    onPoll: fetchConversation,
  });

  // Initial fetch when leadId changes
  useEffect(() => {
    if (leadId) {
      // Reset states
      setSummary(null);
      setCrmData(null);
      setMeetings([]);
      setActiveTab('chat');
      // Fetch data
      fetchConversation(true);
      fetchCRMData();
    }
  }, [leadId, fetchConversation, fetchCRMData]);

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

  // Check if within 24-hour messaging window (WhatsApp Business API requirement)
  const isWithin24Hours = (() => {
    if (!conversation?.updated_at) return true; // Default to allowing messages
    const lastUpdate = new Date(conversation.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  })();

  // Get phone number for WhatsApp link
  const phoneNumber = leadPhone || conversation?.client_data?.phone;
  const cleanPhone = phoneNumber?.replace(/\D/g, '');

  // Check if summary can be generated (>5 messages)
  const canGenerateSummary = (conversation?.conversation?.length || 0) > 5;

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'crm' as const, label: 'HubSpot', icon: Building2 },
    { id: 'meetings' as const, label: 'Meetings', icon: Calendar, badge: meetings.length > 0 ? meetings.length : undefined },
    { id: 'summary' as const, label: 'Summary', icon: Sparkles },
    { id: 'qualification' as const, label: 'Qualification', icon: ClipboardCheck },
    { id: 'form' as const, label: 'Form', icon: FileText },
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* WhatsApp Button */}
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaWhatsapp className="w-4 h-4" />
                Open WhatsApp
              </a>
            )}

            {/* HubSpot Deal Button */}
            {crmData?.has_deal && crmData.deal && (
              <a
                href={crmData.links.deal_link || `https://app.hubspot.com/contacts/50418538/record/0-3/${crmData.deal.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                HubSpot Deal
              </a>
            )}

            {/* Agent Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
              <span className="text-sm font-medium text-gray-700 mr-1">Agent</span>
              <span className={cn(
                'text-xs font-medium w-7',
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
                'text-xs font-medium w-7',
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
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {crmData.owner.firstName} {crmData.owner.lastName}
            </Badge>
          )}
          {crmData?.deal?.dealstage_label && (
            <Badge variant="secondary">
              {crmData.deal.dealstage_label}
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
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && (
          <>
            {/* Debug Toggle */}
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
                  {conversation?.conversation?.map((msg: Message, index: number) => (
                    <MessageBubble key={index} message={msg} showDebug={debugMode} />
                  ))}
                  {/* Scroll anchor */}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input or 24-hour Window Banner */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200">
              {!isWithin24Hours ? (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      24-hour messaging window closed
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      The last message was over 24 hours ago. You can only send template messages to this contact.
                    </p>
                  </div>
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
          <FormTab conversation={conversation} />
        )}

        {activeTab === 'meetings' && (
          <MeetingsTab
            meetings={meetings}
            onUpdateAttendance={updateMeetingAttendance}
            updatingAttendance={updatingAttendance}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            summary={summary}
            canGenerate={canGenerateSummary}
            loading={loadingSummary}
            onGenerate={fetchSummary}
            messagesCount={conversation?.conversation?.length || 0}
          />
        )}

        {activeTab === 'crm' && (
          <CRMTab crmData={crmData} />
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
// Inverted: We are the chatbot (assistant), so our messages go on the right
function MessageBubble({ message, showDebug }: { message: Message; showDebug?: boolean }) {
  const [debugExpanded, setDebugExpanded] = useState(false);
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

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

  const hasMedia = mediaUrl && payloadType;

  // Don't show placeholder content like "[IMAGE]" or "[DOCUMENT: ...]" when we have media
  const isPlaceholderContent = message.content?.startsWith('[') && message.content?.endsWith(']');
  const displayContent = hasMedia && isPlaceholderContent ? mediaMetadata?.caption : message.content;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
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
            hasMedia ? 'p-1' : 'px-4 py-2.5'
          )}
        >
          {/* Media content */}
          {hasMedia && (
            <div className={displayContent ? 'mb-1' : ''}>
              {payloadType === 'image' && (
                <img
                  src={mediaUrl}
                  alt={mediaMetadata?.caption || 'Image'}
                  className="rounded-xl max-w-[300px] max-h-[300px] object-cover"
                />
              )}
              {payloadType === 'video' && (
                <video
                  src={mediaUrl}
                  controls
                  className="rounded-xl max-w-[300px] max-h-[300px]"
                />
              )}
              {(payloadType === 'audio' || (payloadType === 'voice' || isVoice)) && (
                <div className="p-3">
                  <div className={cn('flex items-center gap-2 mb-2', isVoice && 'text-xs')}>
                    <Music className="w-4 h-4" />
                    <span>{isVoice ? 'Voice message' : 'Audio'}</span>
                  </div>
                  <audio src={mediaUrl} controls className="w-full min-w-[200px]" />
                </div>
              )}
              {payloadType === 'document' && (
                <a
                  href={mediaUrl}
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
              {payloadType === 'sticker' && (
                <img
                  src={mediaUrl}
                  alt="Sticker"
                  className="w-32 h-32 object-contain"
                />
              )}
            </div>
          )}

          {/* Text content (caption or transcribed voice message) */}
          {displayContent && (
            <p className={cn('text-sm whitespace-pre-wrap', hasMedia && 'px-3 pb-2')}>
              {displayContent}
            </p>
          )}

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
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6">
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
            {conversation?.qualification && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Qualification Type</div>
                <div className="font-medium">{conversation.qualification}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// Form Tab Component
function FormTab({ conversation }: { conversation: ConversationObject | null }) {
  const clientData = conversation?.client_data;

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="grid gap-4">
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
          </div>
        </div>
      </div>
    </ScrollArea>
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
        <h3 className="font-medium text-gray-900 mb-3">Meetings ({meetings.length})</h3>

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
                  {meeting.calendar_link && (
                    <Button
                      size="sm"
                      className={cn(
                        'h-9',
                        isLive ? 'bg-green-600 hover:bg-green-700' :
                        isStartingSoon ? 'bg-yellow-600 hover:bg-yellow-700' :
                        isPast ? 'bg-gray-500 hover:bg-gray-600' : ''
                      )}
                      asChild
                    >
                      <a
                        href={meeting.calendar_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Video className="w-4 h-4 mr-1.5" />
                        {isLive ? 'Join Now' : isPast ? 'View Recording' : 'Join Meeting'}
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
  messagesCount,
}: {
  summary: ConversationSummaryResponse | null;
  canGenerate: boolean;
  loading: boolean;
  onGenerate: () => void;
  messagesCount: number;
}) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">AI Summary</h3>
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

        {!canGenerate && (
          <div className="text-center text-gray-500 py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Not enough messages</p>
            <p className="text-sm mt-1">
              Summary generation requires more than 5 messages.
              <br />
              Current: {messagesCount} message{messagesCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

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
              {summary.qualification && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-0.5">Qualification</div>
                  <div className="font-medium">{summary.qualification}</div>
                </div>
              )}
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
function CRMTab({ crmData }: { crmData: CRMData | null }) {
  const HUBSPOT_PORTAL_ID = '50418538';

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

  const hasAnyData = crmData.has_deal || crmData.has_contact || crmData.owner;

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

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-6 pb-8">
        <h3 className="font-medium text-gray-900">HubSpot CRM</h3>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {crmData.has_contact && crmData.contact && (
            <a
              href={crmData.links.contact_link || `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-1/${crmData.contact.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              Open Contact
            </a>
          )}
          {crmData.has_deal && crmData.deal && (
            <a
              href={crmData.links.deal_link || `https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-3/${crmData.deal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Deal
            </a>
          )}
          {crmData.links.company_link && (
            <a
              href={crmData.links.company_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <Building className="w-4 h-4" />
              Open Company
            </a>
          )}
        </div>

        {/* Contact Info */}
        {crmData.has_contact && crmData.contact && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Contact</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Contact Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {crmData.contact.firstname} {crmData.contact.lastname}
                  </div>
                  {crmData.contact.position && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" />
                      {crmData.contact.position}
                    </div>
                  )}
                  {crmData.contact.company && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3" />
                      {crmData.contact.company}
                    </div>
                  )}
                </div>
              </div>

              {/* Lifecycle Stage Badge */}
              {crmData.contact.lifecyclestage && (
                <div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {crmData.contact.lifecyclestage.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Badge>
                </div>
              )}

              {/* Contact Details */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                {crmData.contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${crmData.contact.email}`} className="text-sm text-blue-600 hover:underline truncate">
                      {crmData.contact.email}
                    </a>
                  </div>
                )}
                {crmData.contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${crmData.contact.phone}`} className="text-sm text-blue-600 hover:underline">
                      {crmData.contact.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                {crmData.contact.createdate && (
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm font-medium">
                      {new Date(crmData.contact.createdate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {crmData.contact.lastmodifieddate && (
                  <div>
                    <div className="text-xs text-gray-500">Last Modified</div>
                    <div className="text-sm font-medium">
                      {new Date(crmData.contact.lastmodifieddate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                HubSpot ID: {crmData.contact.id}
              </div>
            </div>
          </div>
        )}

        {/* Deal Info */}
        {crmData.has_deal && crmData.deal && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Deal</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <div className="text-sm font-medium">{crmData.deal.dealname}</div>
                <div className="text-xs text-gray-400">ID: {crmData.deal.id}</div>
              </div>

              {/* Deal Stage Badge */}
              {(crmData.deal.dealstage_label || crmData.deal.dealstage) && (
                <div>
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    {crmData.deal.dealstage_label || `Stage: ${crmData.deal.dealstage}`}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {crmData.deal.amount !== null && crmData.deal.amount !== undefined && (
                  <div>
                    <div className="text-xs text-gray-500">Amount</div>
                    <div className="text-sm font-medium">${crmData.deal.amount.toLocaleString()}</div>
                  </div>
                )}
                {crmData.deal.pipeline_label && (
                  <div>
                    <div className="text-xs text-gray-500">Pipeline</div>
                    <div className="text-sm font-medium">{crmData.deal.pipeline_label}</div>
                  </div>
                )}
                {crmData.deal.closedate && (
                  <div>
                    <div className="text-xs text-gray-500">Close Date</div>
                    <div className="text-sm font-medium">
                      {new Date(crmData.deal.closedate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {crmData.deal.createdate && (
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm font-medium">
                      {new Date(crmData.deal.createdate).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {crmData.deal.lastmodifieddate && (
                  <div>
                    <div className="text-xs text-gray-500">Last Modified</div>
                    <div className="text-sm font-medium">
                      {new Date(crmData.deal.lastmodifieddate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Owner Info */}
        {crmData.owner && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Owner</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {crmData.owner.firstName} {crmData.owner.lastName}
                  </div>
                  {crmData.owner.email && (
                    <div className="text-xs text-gray-500">{crmData.owner.email}</div>
                  )}
                  <div className="text-xs text-gray-400">ID: {crmData.owner.id}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
