/**
 * Cortex API Types
 * Based on Savio Cortex API v0.1.0
 */

// =============================================================================
// Core Types
// =============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMedia {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  url?: string;
  mime_type?: string;
  filename?: string;
  caption?: string;
}

export interface Message {
  role: MessageRole;
  content: string;
  metadata?: {
    media?: MessageMedia;
    message_type?: string;
    [key: string]: unknown;
  };
}

export interface ClientData {
  client_id?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  industry?: string | null;
  state?: string | null;
  avg_invoices?: number | null;
  assigned_sdr_id?: number | null;
}

// =============================================================================
// Conversation Types
// =============================================================================

export interface ConversationSummary {
  id: number;
  external_id: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  last_message: Message | null;
  state: number; // 0 = active, 1 = inactive
  qualified: boolean;
  client_data: ClientData;
  qualification?: string | null;
  has_meeting?: boolean;
  deal_stage?: string | null;
}

export interface ConversationObject extends ConversationSummary {
  conversation: Message[];
}

export interface ConversationSearchItem {
  id: number;
  external_id: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  state: number;
  qualified: boolean;
  qualification?: string | null;
  has_meeting: boolean;
  deal_stage?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_company?: string | null;
  last_message_content?: string | null;
  last_message_role?: string | null;
  last_message_at?: string | null;
}

export interface ConversationSearchResponse {
  items: ConversationSearchItem[];
  total_count: number;
  next_cursor?: string | null;
  has_more: boolean;
}

// =============================================================================
// Lead Categories (derived from conversation data)
// =============================================================================

// API-supported lead status values
export type LeadStatus = 'all' | 'new_leads' | 'conversing' | 'qualified' | 'demo' | 'need_human';

// Legacy lead categories (deprecated)
export type LeadCategory =
  | 'all'
  | 'new_lead'
  | 'conversing'
  | 'qualified'
  | 'demo_scheduled'
  | 'demo_today'
  | 'needs_human'
  | 'closed_crm';

export interface LeadCategoryCounts {
  all: number;
  new_lead: number;
  conversing: number;
  qualified: number;
  demo_scheduled: number;
  demo_today: number;
  needs_human: number;
  closed_crm: number;
  urgent: number;
  active: number;
}

// =============================================================================
// Chat / Agent Types
// =============================================================================

export interface ToggleAgentRequest {
  phone: string;
  state: 0 | 1; // 0 = ACTIVE, 1 = INACTIVE
}

export interface ToggleAgentResponse {
  status: string;
  message: string;
  phone: string;
  state: number;
  state_description: string;
  behavior: string;
  client_info: Record<string, unknown>;
}

export interface AgentStatusResponse {
  status: string;
  phone: string;
  agent_state: string | null;
  state_description: string;
  behavior: string;
  client_info: Record<string, unknown>;
}

export interface StartConversationRequest {
  query: string;
  client_data?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    industry?: string;
    state?: string;
    avg_invoices?: number;
  };
}

export interface ContinueConversationRequest {
  query: string;
}

export interface ConversationResponse {
  status: string;
  message: string;
  conversation_id?: string | null;
  external_id?: string | null;
  messages_count?: number | null;
  response_sent?: boolean | null;
}

// =============================================================================
// Message Sending Types
// =============================================================================

export interface SendTextRequest {
  phone: string;
  message: string;
  preview_url?: boolean;
}

export interface MessageSentResponse {
  success: boolean;
  message_id?: string | null;
  conversation_id?: number | null;
  external_id?: string | null;
  message: string;
  stored?: boolean;
}

// =============================================================================
// SDR Agent Types
// =============================================================================

export interface SDROAuthResponse {
  id: number;
  token: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SDRAgent {
  id: number;
  name: string;
  email: string;
  slack_id?: string | null;
  active: boolean;
  timezone: string;
  calendar_id: string;
  weight: number;
  created_at: string;
  updated_at: string;
  oauth_tokens: SDROAuthResponse[];
}

// =============================================================================
// Meeting Types
// =============================================================================

export interface Meeting {
  id: number;
  conversation_id: number | null;
  google_event_id: string | null;
  calendar_link: string | null;
  start_time: string | null;
  end_time: string | null;
  showed: number | null; // 0 = not shown, 1 = shown
  created_at: string;
  updated_at: string;
}

export interface MeetingListResponse {
  total: number;
  meetings: Meeting[];
}

// =============================================================================
// CRM Types (HubSpot)
// =============================================================================

export interface HubSpotOwner {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  active: boolean;
}

export interface HubSpotOwnersResponse {
  owners: HubSpotOwner[];
  total_count: number;
}

export interface HubSpotDeal {
  id: string;
  dealname?: string | null;
  amount?: number | null;
  dealstage?: string | null;
  dealstage_label?: string | null;
  pipeline?: string | null;
  pipeline_label?: string | null;
  hubspot_owner_id?: string | null;
  closedate?: string | null;
  createdate?: string | null;
  lastmodifieddate?: string | null;
}

export interface DealStage {
  id: string;
  label: string;
}

export interface DealStagesResponse {
  pipeline_id: string;
  stages: DealStage[];
  total_count: number;
}

export interface HubSpotLinksResponse {
  conversation_id?: number | null;
  phone?: string | null;
  contact_link?: string | null;
  deal_link?: string | null;
  company_link?: string | null;
}

// =============================================================================
// Metrics Types
// =============================================================================

export interface ConversionSummaryResponse {
  start_date: string;
  end_date: string;
  total_conversations: number;
  conversations_multi_msg: number;
  conversations_with_demo: number;
  conversion_rate_percentage: number;
}

export interface FunnelMetricsDay {
  day: string;
  total_conversations: number;
  conversations_multi_msg: number;
  in_qualification: number;
  qualified_leads: number;
  scheduling_intent: number;
  conversations_with_demo: number;
  daily_conversion_rate: number;
}

export interface FunnelMetricsResponse {
  start_date: string;
  end_date: string;
  data: FunnelMetricsDay[];
}

export interface ConversionRatesResponse {
  start_date: string;
  end_date: string;
  total_conversations: number;
  scheduling_conversion_rate: number;
  qualified_conversion_rate: number;
  inqualification_conversion_rate: number;
}

export interface DailyConversationCount {
  day: string;
  conversations_count: number;
}

export interface ConversationsCountResponse {
  start_date: string;
  end_date: string;
  total_conversations: number;
  data: DailyConversationCount[];
}

export interface DailyMessagesByRole {
  day: string;
  role: string;
  messages_count: number;
}

export interface MessagesByRoleResponse {
  start_date: string;
  end_date: string;
  total_messages: number;
  data: DailyMessagesByRole[];
}

export interface DailyTotalMessages {
  day: string;
  total_messages: number;
}

export interface TotalMessagesResponse {
  start_date: string;
  end_date: string;
  total_messages: number;
  data: DailyTotalMessages[];
}

export interface ResponseTimeResponse {
  start_date: string;
  end_date: string;
  avg_user_to_assistant_response_seconds: number | null;
}

export interface DailyConversionMetrics {
  day: string;
  total_conversations: number;
  conversations_multi_msg: number;
  conversations_with_demo: number;
  conversion_rate_percentage: number;
}

export interface ConversionDailyResponse {
  start_date: string;
  end_date: string;
  data: DailyConversionMetrics[];
}

// =============================================================================
// Auth Types
// =============================================================================

export type UserRole = 'admin' | 'sdr' | 'manager' | 'viewer' | string;

export const ALLOWED_ROLES: UserRole[] = ['admin', 'sdr', 'manager'];

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegister {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
    is_active: boolean;
  };
}

export interface UserResponse {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// =============================================================================
// Error Types
// =============================================================================

export interface ErrorResponse {
  detail: string;
  error_code?: string | null;
}

// =============================================================================
// API Response Wrapper
// =============================================================================

export interface APIResponse<T> {
  data?: T;
  error?: ErrorResponse;
  status: number;
}

// =============================================================================
// Lead Display Types (for UI)
// =============================================================================

export interface Lead extends ConversationSearchItem {
  // Computed properties for UI
  displayName: string;
  tags: LeadTag[];
  priority: 'urgent' | 'normal';
  timeAgo: string;
  sdrName?: string;
}

export interface LeadTag {
  label: string;
  variant: 'default' | 'destructive' | 'warning' | 'success' | 'secondary';
}

// =============================================================================
// Qualification Types
// =============================================================================

export type QualificationStatus =
  | 'A' // Hot lead
  | 'B' // Warm lead
  | 'C' // Cold lead
  | null;

export interface QualificationData {
  status: QualificationStatus;
  notes?: string;
  budget?: string;
  timeline?: string;
  decision_maker?: boolean;
  needs?: string[];
}

// =============================================================================
// Conversation Summary (AI-generated)
// =============================================================================

export interface ConversationSummaryResponse {
  conversation_id?: number | null;
  external_id?: string | null;
  phone?: string | null;
  summary: string;
  total_messages: number;
  client_name?: string | null;
  client_company?: string | null;
  qualification?: string | null;
  has_meeting: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}
