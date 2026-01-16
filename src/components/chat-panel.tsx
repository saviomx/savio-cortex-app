'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  ClipboardCheck,
  FileText,
  Clock,
  Pause,
  Send,
  User,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Music,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAutoPolling } from '@/hooks/use-auto-polling';
import type { ConversationObject, Message, AgentStatusResponse } from '@/types/cortex';

type TabType = 'chat' | 'qualification' | 'form' | 'timeline';

interface ChatPanelProps {
  leadId: string | null;
  leadName?: string;
  leadCompany?: string;
  className?: string;
  onLeadUpdate?: () => void;
}

export function ChatPanel({
  leadId,
  leadName,
  leadCompany,
  className,
  onLeadUpdate,
}: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [conversation, setConversation] = useState<ConversationObject | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
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
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [leadId]);

  // Use auto-polling hook for real-time updates
  useAutoPolling({
    interval: 5000,
    enabled: !!leadId,
    onPoll: fetchConversation,
  });

  // Initial fetch when leadId changes
  useEffect(() => {
    if (leadId) {
      fetchConversation(true);
    }
  }, [leadId, fetchConversation]);

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

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'qualification' as const, label: 'Qualification', icon: ClipboardCheck },
    { id: 'form' as const, label: 'Form', icon: FileText },
    { id: 'timeline' as const, label: 'Timeline', icon: Clock },
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

        {/* Tags */}
        <div className="flex items-center gap-2">
          {conversation?.has_meeting !== undefined && conversation.has_meeting && (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              Demo Today 🔥
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
      <div className="flex-shrink-0 flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && (
          <>
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
                    <MessageBubble key={index} message={msg} />
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

        {activeTab === 'timeline' && (
          <TimelineTab conversation={conversation} />
        )}
      </div>
    </div>
  );
}

// Message Bubble Component
// Inverted: We are the chatbot (assistant), so our messages go on the right
function MessageBubble({ message }: { message: Message }) {
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

// Timeline Tab Component
function TimelineTab({ conversation }: { conversation: ConversationObject | null }) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900 mb-3">Activity Timeline</h3>

        <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
          <TimelineItem
            title="Conversation Started"
            time={conversation?.created_at || ''}
            icon={<MessageSquare className="w-3.5 h-3.5" />}
          />
          {conversation?.qualified && (
            <TimelineItem
              title="Lead Qualified"
              time={conversation?.updated_at || ''}
              icon={<ClipboardCheck className="w-3.5 h-3.5" />}
            />
          )}
          {conversation?.state === 1 && (
            <TimelineItem
              title="Agent Paused"
              time={conversation?.updated_at || ''}
              icon={<Pause className="w-3.5 h-3.5" />}
              variant="warning"
            />
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function TimelineItem({
  title,
  time,
  icon,
  variant = 'default',
}: {
  title: string;
  time: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'success';
}) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-600',
    warning: 'bg-orange-100 text-orange-600',
    success: 'bg-green-100 text-green-600',
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'absolute -left-[25px] w-6 h-6 rounded-full flex items-center justify-center',
          variantStyles[variant]
        )}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {time && (
          <div className="text-xs text-gray-500">
            {new Date(time).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
