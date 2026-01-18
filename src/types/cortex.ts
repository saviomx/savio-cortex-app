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
  created_at?: string | null;
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
  window_status?: 'open' | 'expired' | null;
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
  window_status?: 'open' | 'expired' | null;
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
// Marketing Attribution Types
// =============================================================================

/**
 * Marketing attribution data from HubSpot.
 * Contains first touch, last touch, and UTM tracking information.
 * Uses index signature for dynamic attribution fields that may vary by HubSpot configuration.
 */
export interface MarketingAttribution {
  // Original source tracking (first touch)
  original_source?: string | null;
  original_source_drill_down_1?: string | null;
  original_source_drill_down_2?: string | null;

  // Latest source tracking
  latest_source?: string | null;
  latest_source_drill_down_1?: string | null;
  latest_source_drill_down_2?: string | null;

  // First touch data
  first_conversion_event?: string | null;
  first_conversion_date?: string | null;
  first_url?: string | null;
  first_referrer?: string | null;
  first_touch_campaign?: string | null;
  last_touch_campaign?: string | null;

  // UTM parameters
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;

  // Conversion count
  num_conversions?: number | null;

  // Allow any additional dynamic attribution fields
  [key: string]: string | number | null | undefined;
}

// =============================================================================
// Full Contact Types (Dynamic Properties)
// =============================================================================

/**
 * HubSpot contact properties - ALL properties are dynamic.
 * Index signature allows for any HubSpot property including custom fields.
 * Values can be strings, numbers, booleans, or null.
 */
export type HubSpotContactProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Full contact response from /crm/contact/full endpoint.
 * Contains all HubSpot properties (including custom fields),
 * marketing attribution, and related entity references.
 */
export interface FullContactResponse {
  phone?: string | null;
  has_contact: boolean;
  contact_id: string;
  properties: HubSpotContactProperties;
  marketing_attribution?: MarketingAttribution | null;
  company_ids?: string[];
  hubspot_link?: string | null;
}

// =============================================================================
// Form Submission Types
// =============================================================================

/**
 * Individual field value from a form submission.
 * Fields are dynamic based on the form configuration in HubSpot.
 */
export interface FormFieldValue {
  name: string;
  value: string;
  label?: string | null;
}

/**
 * Form submission with metadata and field values.
 * Represents a single form submission from a contact.
 */
export interface FormSubmission {
  form_id: string;
  form_name?: string | null;
  submitted_at?: string | null;
  page_url?: string | null;
  page_title?: string | null;

  // Dynamic form field values
  values: FormFieldValue[];

  // Campaign attribution (if form was tied to a campaign)
  campaign_id?: string | null;
  campaign_name?: string | null;

  // Portal/submission metadata
  portal_id?: string | null;
  submission_id?: string | null;

  // HubSpot form link
  hubspot_form_link?: string | null;
}

/**
 * Response wrapper for /crm/contact/form-submissions endpoint.
 * Contains all form submissions for a contact.
 */
export interface FormSubmissionsResponse {
  contact_id: string;
  phone?: string | null;
  email?: string | null;
  submissions: FormSubmission[];
  total_count: number;
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
// CRM Funnel Metrics Types
// =============================================================================

/**
 * Individual step showing conversion between two funnel stages.
 * Used in CRMConversionRatesResponse.steps array.
 */
export interface StepConversionRate {
  from_stage: string;
  to_stage: string;
  from_count: number;
  to_count: number;
  conversion_rate: number;
}

/**
 * Response from /metrics/crm/conversion-rates endpoint.
 * Contains step-by-step conversion rates through the funnel.
 */
export interface CRMConversionRatesResponse {
  start_date: string;
  end_date: string;
  lead_to_conversation: number;
  conversation_to_reply: number;
  reply_to_qualified: number;
  qualified_to_demo_scheduled: number;
  demo_scheduled_to_product_explored: number;
  product_explored_to_closed: number | null;
  overall_conversion: number;
  steps: StepConversionRate[];
}

/**
 * A single stage in the CRM funnel.
 * Used in CRMFunnelVolumeResponse.stages array.
 */
export interface FunnelStage {
  name: string;
  count: number;
  percentage: number | null;
}

/**
 * Response from /metrics/crm/funnel-volume endpoint.
 * Contains aggregate counts at each funnel stage.
 */
export interface CRMFunnelVolumeResponse {
  start_date: string;
  end_date: string;
  leads_created: number;
  conversations_started: number;
  replies_received: number;
  qualified_leads: number;
  demo_scheduled: number;
  product_explored: number;
  closed_converted: number | null;
  stages: FunnelStage[];
}

/**
 * Combined CRM metrics response for the metrics page.
 * Includes both funnel volume and conversion rates.
 */
export interface CRMMetricsResponse {
  volume: CRMFunnelVolumeResponse;
  conversions: CRMConversionRatesResponse;
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
// Activity Timeline Types (HubSpot)
// =============================================================================

/**
 * Activity item in the contact timeline.
 * Represents a single engagement (note, call, email, meeting, or task).
 */
export interface ActivityItem {
  id: string;
  type: 'notes' | 'calls' | 'emails' | 'meetings' | 'tasks';
  timestamp?: string | null;
  owner_id?: string | null;
  title?: string | null;
  body?: string | null;
  icon?: string | null;
  // Call-specific fields
  direction?: 'INBOUND' | 'OUTBOUND' | string | null;
  status?: string | null;
  duration_seconds?: number | null;
  from_number?: string | null;
  to_number?: string | null;
  recording_url?: string | null;
  // Email-specific fields
  from_email?: string | null;
  to_email?: string | null;
  // Meeting-specific fields
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  outcome?: string | null;
  meeting_link?: string | null;
  // Task-specific fields
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | string | null;
  task_type?: 'TODO' | 'CALL' | 'EMAIL' | string | null;
  completion_date?: string | null;
}

/**
 * Response from /crm/contact/activity endpoint.
 */
export interface ContactActivityResponse {
  phone?: string | null;
  contact_id?: string | null;
  activities: ActivityItem[];
  total_count: number;
  activity_counts?: Record<string, number>;
  hubspot_link?: string | null;
}

// =============================================================================
// HubSpot Task Types
// =============================================================================

/**
 * HubSpot task information.
 */
export interface HubSpotTask {
  id: string;
  title?: string | null;
  body?: string | null;
  due_date?: string | null;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'DEFERRED' | string | null;
  task_type?: 'TODO' | 'CALL' | 'EMAIL' | string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | string | null;
  owner_id?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Response from /crm/tasks GET endpoint.
 */
export interface TasksResponse {
  conversation_id?: number | null;
  phone?: string | null;
  contact_id?: string | null;
  tasks: HubSpotTask[];
  total_count: number;
}

/**
 * Request to create a task.
 */
export interface CreateTaskRequest {
  title: string;
  due_date: string;
  task_type?: 'TODO' | 'CALL' | 'EMAIL';
  notes?: string | null;
}

/**
 * Response after creating a task.
 */
export interface CreateTaskResponse {
  success: boolean;
  task?: HubSpotTask | null;
  error?: string | null;
}

/**
 * Request to update a task.
 */
export interface UpdateTaskRequest {
  title?: string | null;
  due_date?: string | null;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'DEFERRED';
  task_type?: 'TODO' | 'CALL' | 'EMAIL';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  owner_id?: string | null;
  notes?: string | null;
}

/**
 * Response after updating a task.
 */
export interface UpdateTaskResponse {
  success: boolean;
  task_id: string;
  updated_properties?: string[];
  task?: HubSpotTask | null;
  error?: string | null;
}

/**
 * Response after deleting a task.
 */
export interface DeleteTaskResponse {
  success: boolean;
  task_id: string;
  error?: string | null;
}

/**
 * Response for getting a single task.
 */
export interface GetTaskResponse {
  task?: HubSpotTask | null;
  has_task: boolean;
  hubspot_link?: string | null;
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

// =============================================================================
// AI Architecture Types
// =============================================================================

/**
 * Prompt category enum - classifies prompts by their function in the agent system.
 */
export type PromptCategory =
  | 'system'
  | 'qualification'
  | 'data_gathering'
  | 'scheduling'
  | 'terminal'
  | 'routing'
  | 'detection';

/**
 * Agent node identifiers in the multi-agent system.
 */
export type AgentNode =
  | 'orchestrator'
  | 'qa_agent'
  | 'data_gathering_agent'
  | 'qualification_agent'
  | 'scheduling_agent'
  | 'global';

/**
 * Response from /ai/diagram endpoint.
 * Contains the Mermaid diagram and graph structure.
 * Nodes and edges are generic objects as per API spec.
 */
export interface DiagramResponse {
  diagram: string;
  format: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}

/**
 * Prompt metadata (summary info without full content).
 */
export interface PromptMetadata {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  nodes: AgentNode[];
  file_path: string;
  variables?: string[];
}

/**
 * Full prompt details including content.
 */
export interface PromptDetail extends PromptMetadata {
  content: string;
  line_count: number;
  char_count: number;
}

/**
 * Response from /ai/prompts endpoint.
 */
export interface PromptListResponse {
  total: number;
  prompts: PromptMetadata[];
}

/**
 * Detailed node information.
 */
export interface NodeDetail {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  inputs: string[];
  outputs: string[];
  prompts?: string[];
  required_fields?: string[] | null;
  labels?: string[] | null;
}

/**
 * Response from /ai/nodes endpoint.
 */
export interface NodeListResponse {
  total: number;
  nodes: NodeDetail[];
}

/**
 * Complete architecture response from /ai/architecture endpoint.
 * Uses generic objects for flexible schema as per API spec.
 */
export interface AgentArchitectureResponse {
  diagram: string;
  nodes: Record<string, unknown>[];
  prompts_summary: Record<string, unknown>[];
  state_fields: Record<string, string>[];
  node_id_mapping?: Record<string, string>;
}
