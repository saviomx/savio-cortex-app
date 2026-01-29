'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { isValid, differenceInHours } from 'date-fns';
import { formatChatBubbleTime, formatDateDivider, shouldShowDateDivider } from '@/lib/utils/date';
import { RefreshCw, Paperclip, Send, X, AlertCircle, MessageSquare, XCircle, ListTree, ArrowLeft, MapPin, User, Phone, Mail, Building, FileText, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaMessage } from '@/components/media-message';
import { TemplateSelectorDialog } from '@/components/template-selector-dialog';
import { InteractiveMessageDialog } from '@/components/interactive-message-dialog';
import { useAutoPolling } from '@/hooks/use-auto-polling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { MediaData } from '@kapso/whatsapp-cloud-api';

type Message = {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  createdAt: string;
  status?: string;
  phoneNumber: string;
  hasMedia: boolean;
  mediaData?: {
    url: string;
    contentType?: string;
    filename?: string;
  } | (MediaData & { url: string });
  reactionEmoji?: string | null;
  reactedToMessageId?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  messageType?: string;
  caption?: string | null;
  metadata?: {
    mediaId?: string;
    caption?: string;
    header_media_url?: string;
    header_type?: string;
    template?: boolean;
    template_name?: string;
    // Location data
    latitude?: number;
    longitude?: number;
    location_name?: string;
    location_address?: string;
    // Contact data
    contacts?: Array<{
      name?: {
        formatted_name?: string;
        first_name?: string;
        last_name?: string;
      };
      phones?: Array<{
        phone?: string;
        type?: string;
      }>;
      emails?: Array<{
        email?: string;
        type?: string;
      }>;
      org?: {
        company?: string;
        title?: string;
      };
    }>;
  };
};


function isWithin24HourWindow(messages: Message[]): boolean {
  // Find the last inbound message
  const inboundMessages = messages.filter(msg => msg.direction === 'inbound');

  if (inboundMessages.length === 0) {
    // No inbound messages yet - only templates allowed
    return false;
  }

  const lastInboundMessage = inboundMessages[inboundMessages.length - 1];

  try {
    const lastMessageDate = new Date(lastInboundMessage.createdAt);
    if (!isValid(lastMessageDate)) return false;

    const hoursSinceLastMessage = differenceInHours(new Date(), lastMessageDate);
    return hoursSinceLastMessage < 24;
  } catch {
    return false; // In case of error, only allow templates
  }
}

function getDisabledInputMessage(messages: Message[]): string {
  const inboundMessages = messages.filter(msg => msg.direction === 'inbound');

  if (inboundMessages.length === 0) {
    return "User hasn't messaged yet. Send a template message or wait for them to reply.";
  }

  return "Last message was over 24 hours ago. Send a template message or wait for the user to message you.";
}

type Props = {
  conversationId?: string;
  phoneNumber?: string;
  contactName?: string;
  onTemplateSent?: (phoneNumber: string) => Promise<void>;
  onBack?: () => void;
  isVisible?: boolean;
};

export function MessageView({ conversationId, phoneNumber, contactName, onTemplateSent, onBack, isVisible = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [canSendRegularMessage, setCanSendRegularMessage] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showInteractiveDialog, setShowInteractiveDialog] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ url: string; filename: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      // Separate reactions from regular messages
      const reactions = (data.data || []).filter((msg: Message) => msg.messageType === 'reaction');
      const regularMessages = (data.data || []).filter((msg: Message) => msg.messageType !== 'reaction');

      // Create a map of message ID to reaction emoji
      const reactionMap = new Map<string, string>();
      reactions.forEach((reaction: Message) => {
        if (reaction.reactedToMessageId && reaction.reactionEmoji) {
          reactionMap.set(reaction.reactedToMessageId, reaction.reactionEmoji);
        }
      });

      // Attach reactions to their corresponding messages
      const messagesWithReactions = regularMessages.map((msg: Message) => {
        const reaction = reactionMap.get(msg.id);
        return reaction ? { ...msg, reactionEmoji: reaction } : msg;
      });

      const sortedMessages = messagesWithReactions.sort((a: Message, b: Message) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      setMessages(sortedMessages);
      previousMessageCountRef.current = sortedMessages.length;
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      setLoading(true);
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  useEffect(() => {
    setCanSendRegularMessage(isWithin24HourWindow(messages));
  }, [messages]);

  // Track if user is near bottom of scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsNearBottom(distanceFromBottom < 100);
    };

    const viewport = container.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  // Auto-polling for messages (every 5 seconds)
  useAutoPolling({
    interval: 5000,
    enabled: !!conversationId,
    onPoll: fetchMessages
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!messageInput.trim() && !selectedFile) || !phoneNumber || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', phoneNumber);
      if (messageInput.trim()) {
        formData.append('body', messageInput);
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await fetch('/api/messages/send', {
        method: 'POST',
        body: formData
      });

      setMessageInput('');
      handleRemoveFile();
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSent = async () => {
    await fetchMessages();

    // Notify parent to refresh conversation list and select this conversation
    if (phoneNumber && onTemplateSent) {
      await onTemplateSent(phoneNumber);
    }
  };

  if (!conversationId) {
    return (
      <div className={cn(
        "flex-1 flex items-center justify-center bg-muted/50",
        !isVisible && "hidden md:flex"
      )}>
        <p className="text-muted-foreground">Select a conversation to view messages</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn(
        "flex-1 flex flex-col bg-[#efeae2]",
        !isVisible && "hidden md:flex"
      )}>
        <div className="p-3 border-b border-[#d1d7db] bg-[#f0f2f5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-[#667781] hover:bg-[#f0f2f5]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1">
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-[900px] mx-auto space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={cn('flex mb-2', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
                  i % 2 === 0 ? 'rounded-br-none' : 'rounded-bl-none'
                )}>
                  <Skeleton className="h-4 mb-2" style={{ width: `${Math.random() * 150 + 150}px` }} />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col bg-[#efeae2]",
      !isVisible && "hidden md:flex"
    )}>
      <div className="p-3 border-b border-[#d1d7db] bg-[#f0f2f5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onBack && (
              <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="md:hidden text-[#667781] hover:bg-[#f0f2f5] flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-[#111b21] truncate">{contactName || phoneNumber || 'Conversation'}</h2>
              {contactName && phoneNumber && (
                <p className="text-xs text-[#667781] truncate">{phoneNumber}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="ghost"
            size="icon"
            className="text-[#667781] hover:bg-[#f0f2f5]"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ScrollArea ref={messagesContainerRef} className="flex-1 h-0 p-4">
        <div className="max-w-[900px] mx-auto">
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground">No messages yet</p>
        ) : (
          messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showDateDivider = shouldShowDateDivider(message.createdAt, prevMessage?.createdAt);

            return (
              <div key={message.id}>
                {showDateDivider && (
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary" className="shadow-sm">
                      {formatDateDivider(message.createdAt)}
                    </Badge>
                  </div>
                )}

                <div
                  className={cn(
                    'flex mb-2',
                    message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-3 py-2 relative shadow-sm',
                      message.direction === 'outbound'
                        ? 'bg-[#d9fdd3] text-[#111b21] rounded-br-none'
                        : 'bg-white text-[#111b21] rounded-bl-none'
                    )}
                  >
                    {/* Location message - check messageType and parse coordinates from content if needed */}
                    {message.messageType === 'location' ? (() => {
                      // Try to get coordinates from metadata or parse from content
                      let lat = message.metadata?.latitude;
                      let lng = message.metadata?.longitude;
                      let locationName = message.metadata?.location_name;
                      let locationAddress = message.metadata?.location_address;

                      // Parse from content if not in metadata
                      if (!lat || !lng) {
                        const latMatch = message.content?.match(/Lat:\s*([-\d.]+)/i);
                        const lngMatch = message.content?.match(/Long:\s*([-\d.]+)/i);
                        if (latMatch) lat = parseFloat(latMatch[1]);
                        if (lngMatch) lng = parseFloat(lngMatch[1]);

                        // Try to extract name and address from content
                        const lines = message.content?.split('\n') || [];
                        if (lines.length > 0 && !lines[0].includes('Lat:')) {
                          locationName = lines[0];
                        }
                        if (lines.length > 1 && !lines[1].includes('Lat:')) {
                          locationAddress = lines.slice(1).join(', ').replace(/Lat:.*$/, '').trim();
                        }
                      }

                      return lat && lng ? (
                      <div className="mb-2">
                        <a
                          href={`https://www.google.com/maps?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                        >
                          {/* Mapbox Static Map with fallback */}
                          <div className="w-full h-[150px] rounded-lg overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${lng},${lat})/${lng},${lat},15/300x150@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`}
                              alt="Location"
                              className="w-full h-full object-cover absolute inset-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-10 w-10 text-teal-500 drop-shadow-md" />
                            </div>
                          </div>
                        </a>
                        <div className="mt-2 flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-[#00a884] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {locationName && (
                              <p className="text-sm font-medium text-[#111b21]">
                                {locationName}
                              </p>
                            )}
                            {locationAddress && (
                              <p className="text-xs text-[#667781]">
                                {locationAddress}
                              </p>
                            )}
                            <p className="text-xs text-[#00a884] mt-1">
                              Abrir en Google Maps →
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null;
                    })() : /* Contact message */
                    message.messageType === 'contacts' ? (() => {
                      // Try to get contacts from metadata or parse from content
                      let contacts = message.metadata?.contacts;

                      // Parse from content if not in metadata
                      if (!contacts || contacts.length === 0) {
                        // Parse "Name: X, Phone: Y" format from content
                        const nameMatch = message.content?.match(/Name:\s*([^,\n]+)/i);
                        const phoneMatch = message.content?.match(/Phone:\s*([^\s,\n]+)/i);
                        const emailMatch = message.content?.match(/Email:\s*([^\s,\n]+)/i);

                        if (nameMatch || phoneMatch) {
                          contacts = [{
                            name: nameMatch ? { formatted_name: nameMatch[1].trim() } : undefined,
                            phones: phoneMatch ? [{ phone: phoneMatch[1].trim() }] : undefined,
                            emails: emailMatch ? [{ email: emailMatch[1].trim() }] : undefined,
                          }];
                        }
                      }

                      return contacts && contacts.length > 0 ? (
                      <div className="mb-2 space-y-2">
                        {contacts.map((contact, idx) => (
                          <div key={idx} className="bg-[#f0f2f5] rounded-lg p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#111b21] truncate">
                                  {contact.name?.formatted_name ||
                                   `${contact.name?.first_name || ''} ${contact.name?.last_name || ''}`.trim() ||
                                   'Contact'}
                                </p>
                                {contact.org?.company && (
                                  <p className="text-xs text-[#667781] flex items-center gap-1 truncate">
                                    <Building className="h-3 w-3" />
                                    {contact.org.company}
                                    {contact.org.title && ` · ${contact.org.title}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            {(contact.phones?.length || contact.emails?.length) ? (
                              <div className="mt-2 pt-2 border-t border-[#d1d7db] space-y-1">
                                {contact.phones?.map((phone, pIdx) => (
                                  <a
                                    key={pIdx}
                                    href={`tel:${phone.phone}`}
                                    className="flex items-center gap-2 text-xs text-[#00a884] hover:underline"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {phone.phone}
                                    {phone.type && <span className="text-[#667781]">({phone.type})</span>}
                                  </a>
                                ))}
                                {contact.emails?.map((email, eIdx) => (
                                  <a
                                    key={eIdx}
                                    href={`mailto:${email.email}`}
                                    className="flex items-center gap-2 text-xs text-[#00a884] hover:underline"
                                  >
                                    <Mail className="h-3 w-3" />
                                    {email.email}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null;
                    })() : /* Template media (video/image from header) */
                    message.metadata?.header_media_url ? (
                      <div className="mb-2">
                        {message.metadata.header_type === 'VIDEO' ? (
                          <video
                            src={message.metadata.header_media_url}
                            controls
                            className="rounded max-w-full h-auto max-h-96"
                          />
                        ) : message.metadata.header_type === 'IMAGE' ? (
                          <div
                            className="relative group cursor-pointer"
                            onClick={() => setPreviewImage(message.metadata?.header_media_url || null)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.metadata.header_media_url}
                              alt="Template media"
                              className="rounded max-w-full h-auto max-h-96"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ) : message.metadata.header_type === 'DOCUMENT' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📎 Document</span>
                            <button
                              onClick={() => setPreviewPdf({ url: message.metadata?.header_media_url || '', filename: 'Document' })}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4 text-[#667781]" />
                            </button>
                            <a
                              href={message.metadata.header_media_url}
                              download
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4 text-[#667781]" />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : message.hasMedia && message.mediaData?.url ? (
                      <div className="mb-2">
                        {message.messageType === 'sticker' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.mediaData.url}
                            alt="Sticker"
                            className="max-w-[150px] max-h-[150px] h-auto"
                          />
                        ) : message.mediaData.contentType?.startsWith('image/') || message.messageType === 'image' ? (
                          <div
                            className="relative group cursor-pointer"
                            onClick={() => setPreviewImage(message.mediaData?.url || null)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.mediaData.url}
                              alt="Media"
                              className="rounded max-w-full h-auto max-h-96"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ) : message.mediaData.contentType?.startsWith('video/') || message.messageType === 'video' ? (
                          <video
                            src={message.mediaData.url}
                            controls
                            className="rounded max-w-full h-auto max-h-96"
                          />
                        ) : message.mediaData.contentType?.startsWith('audio/') || message.messageType === 'audio' ? (
                          <audio src={message.mediaData.url} controls className="w-full" />
                        ) : message.mediaData.contentType === 'application/pdf' || message.filename?.endsWith('.pdf') || message.mimeType === 'application/pdf' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📎 {message.mediaData.filename || message.filename || 'Document.pdf'}</span>
                            <button
                              onClick={() => setPreviewPdf({
                                url: message.mediaData?.url || '',
                                filename: message.mediaData?.filename || message.filename || 'Document.pdf'
                              })}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4 text-[#667781]" />
                            </button>
                            <a
                              href={message.mediaData.url}
                              download={message.mediaData.filename || message.filename || 'document.pdf'}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4 text-[#667781]" />
                            </a>
                          </div>
                        ) : (
                          <a
                            href={message.mediaData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-[#00a884] hover:underline"
                          >
                            📎 {message.mediaData.filename || message.filename || 'Download file'}
                          </a>
                        )}
                      </div>
                    ) : message.metadata?.mediaId && message.messageType ? (
                      <div className="mb-2">
                        <MediaMessage
                          mediaId={message.metadata.mediaId}
                          messageType={message.messageType}
                          caption={message.caption}
                          filename={message.filename}
                          isOutbound={message.direction === 'outbound'}
                          onImageClick={setPreviewImage}
                          onPdfPreview={(url, fname) => setPreviewPdf({ url, filename: fname })}
                        />
                      </div>
                    ) : null}

                    {message.caption && (
                      <p className="text-sm break-words whitespace-pre-wrap mb-1">
                        {message.caption}
                      </p>
                    )}

                    {message.content && message.content !== '[Image attached]' && (
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {/* Strip media markers if we're showing actual media */}
                        {message.metadata?.header_media_url
                          ? message.content.replace(/^\[(Video|Image|Document)\]\n*/i, '')
                          : message.content}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] text-[#667781]">
                        {formatChatBubbleTime(message.createdAt)}
                      </span>

                      {message.messageType && (
                        <span className="text-[11px] text-[#667781] opacity-60">
                          · {message.messageType}
                        </span>
                      )}

                      {message.direction === 'outbound' && message.status && (
                        <>
                          {message.status === 'failed' ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <span className="text-xs text-[#53bdeb]">
                              {message.status === 'read' ? '✓✓' :
                               message.status === 'delivered' ? '✓✓' :
                               message.status === 'sent' ? '✓' : ''}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {message.direction === 'outbound' && message.status === 'failed' && (
                      <div className="mt-1">
                        <span className="text-[11px] text-red-500 flex items-center gap-1">
                          Not delivered
                        </span>
                      </div>
                    )}

                    {message.reactionEmoji && (
                      <div className="absolute -bottom-2 -right-2 bg-background rounded-full px-1.5 py-0.5 text-sm shadow-sm border">
                        {message.reactionEmoji}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-[#d1d7db] bg-[#f0f2f5]">
        {canSendRegularMessage ? (
          <>
            {selectedFile && (
              <div className="p-3 border-b border-[#d1d7db] bg-white">
                <div className="flex items-start gap-3">
                  {filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-[#f0f2f5] rounded flex items-center justify-center">
                      <Paperclip className="h-6 w-6 text-[#667781]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111b21] truncate">{selectedFile.name}</p>
                    <p className="text-xs text-[#667781]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    onClick={handleRemoveFile}
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[#667781]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-3 max-w-[900px] mx-auto w-full flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                variant="ghost"
                size="icon"
                className="text-[#667781] hover:bg-[#d1d7db]/30"
                title="Upload file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                onClick={() => setShowInteractiveDialog(true)}
                disabled={sending}
                size="icon"
                variant="ghost"
                className="text-[#667781] hover:text-[#00a884] hover:bg-[#f0f2f5]"
                title="Send interactive message"
              >
                <ListTree className="h-5 w-5" />
              </Button>
              <Input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message"
                disabled={sending}
                className="flex-1 bg-white border-[#d1d7db] focus-visible:ring-[#00a884] rounded-lg"
              />
              <Button
                type="submit"
                disabled={sending || (!messageInput.trim() && !selectedFile)}
                size="icon"
                className="bg-[#00a884] hover:bg-[#008f6f] rounded-full"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </>
        ) : (
          <div className="p-3 max-w-[900px] mx-auto w-full">
            <div className="bg-[#fff4cc] border border-[#e9c46a] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[#8b7000] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#111b21] mb-3">
                    {getDisabledInputMessage(messages)}
                  </p>
                  <Button
                    onClick={() => setShowTemplateDialog(true)}
                    className="bg-[#00a884] hover:bg-[#008f6f]"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send template
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <TemplateSelectorDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        phoneNumber={phoneNumber || ''}
        onTemplateSent={handleTemplateSent}
      />

      <InteractiveMessageDialog
        open={showInteractiveDialog}
        onOpenChange={setShowInteractiveDialog}
        conversationId={conversationId}
        phoneNumber={phoneNumber}
        onMessageSent={fetchMessages}
      />

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-none" showCloseButton={false}>
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            {previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewPdf} onOpenChange={() => setPreviewPdf(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0" style={{ width: '900px', height: '80vh' }} showCloseButton={false}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <span className="font-medium text-sm truncate">{previewPdf?.filename}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdf?.url}
                  download={previewPdf?.filename}
                  className="p-2 rounded hover:bg-gray-200 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setPreviewPdf(null)}
                  className="p-2 rounded hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              {previewPdf && (
                <iframe
                  src={previewPdf.url}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
