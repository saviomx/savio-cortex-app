/**
 * Cortex API Client
 * Server-side client for Savio Cortex API
 */

import type {
  ConversationObject,
  ConversationSummary,
  ConversationSearchResponse,
  ConversationResponse,
  ToggleAgentRequest,
  ToggleAgentResponse,
  AgentStatusResponse,
  StartConversationRequest,
  ContinueConversationRequest,
  SDRAgent,
  Meeting,
  MeetingListResponse,
  HubSpotOwnersResponse,
  HubSpotDeal,
  DealStagesResponse,
  HubSpotLinksResponse,
  FullContactResponse,
  FormSubmissionsResponse,
  ConversationSummaryResponse,
  ConversionSummaryResponse,
  ErrorResponse,
  SendTextRequest,
  MessageSentResponse,
  FunnelMetricsResponse,
  ConversionRatesResponse,
  ConversationsCountResponse,
  MessagesByRoleResponse,
  TotalMessagesResponse,
  ResponseTimeResponse,
  ConversionDailyResponse,
  ContactActivityResponse,
  TasksResponse,
  CreateTaskRequest,
  CreateTaskResponse,
  UpdateTaskRequest,
  UpdateTaskResponse,
  DeleteTaskResponse,
  GetTaskResponse,
  CRMFunnelVolumeResponse,
  CRMConversionRatesResponse,
  DiagramResponse,
  PromptListResponse,
  PromptDetail,
  NodeListResponse,
  NodeDetail,
  AgentArchitectureResponse,
} from '@/types/cortex';

class CortexAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'CortexAPIError';
  }
}

class CortexClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errorData: ErrorResponse = await response.json();
        errorMessage = errorData.detail || errorMessage;
        errorCode = errorData.error_code || undefined;
      } catch {
        // Use default error message
      }

      throw new CortexAPIError(errorMessage, response.status, errorCode);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  async health(): Promise<{ status: string; environment: string }> {
    return this.request('/health');
  }

  // ==========================================================================
  // Conversations
  // ==========================================================================

  async listConversations(
    skip = 0,
    limit = 100
  ): Promise<ConversationSummary[]> {
    return this.request(`/conversations/list?skip=${skip}&limit=${limit}`);
  }

  async searchConversations(params: {
    q?: string;
    qualified?: boolean;
    has_meeting?: boolean;
    state?: number;
    deal_stage?: string;
    lead_status?: string;
    date_from?: string;
    date_to?: string;
    window_status?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ConversationSearchResponse> {
    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set('q', params.q);
    if (params.qualified !== undefined) searchParams.set('qualified', String(params.qualified));
    if (params.has_meeting !== undefined) searchParams.set('has_meeting', String(params.has_meeting));
    if (params.state !== undefined) searchParams.set('state', String(params.state));
    if (params.deal_stage) searchParams.set('deal_stage', params.deal_stage);
    if (params.lead_status) searchParams.set('lead_status', params.lead_status);
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.window_status) searchParams.set('window_status', params.window_status);
    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    return this.request(`/conversations/search${queryString ? `?${queryString}` : ''}`);
  }

  async getConversation(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<ConversationObject> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/conversations?${searchParams.toString()}`);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    return this.request(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getConversationSummary(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<ConversationSummaryResponse> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/conversations/summary?${searchParams.toString()}`);
  }

  // ==========================================================================
  // Chat / Agent Control
  // ==========================================================================

  async startConversation(
    data: StartConversationRequest
  ): Promise<ConversationResponse> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async continueConversation(
    conversationId: string,
    data: ContinueConversationRequest
  ): Promise<ConversationResponse> {
    return this.request(`/chat/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleAgent(data: ToggleAgentRequest): Promise<ToggleAgentResponse> {
    return this.request('/chat/toggle-agent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentStatus(phone: string): Promise<AgentStatusResponse> {
    return this.request(`/chat/agent-status?phone=${encodeURIComponent(phone)}`);
  }

  async unlinkUser(phone: string): Promise<{ status: string; message: string }> {
    return this.request('/chat/unlink-user', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  async sendTextMessage(data: SendTextRequest): Promise<MessageSentResponse> {
    return this.request('/messages/send/text', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // SDR Agents
  // ==========================================================================

  async listSDRAgents(activeOnly = true): Promise<SDRAgent[]> {
    return this.request(`/sdr?active_only=${activeOnly}`);
  }

  async getSDRAgent(sdrId: number): Promise<SDRAgent> {
    return this.request(`/sdr/${sdrId}`);
  }

  // ==========================================================================
  // Meetings
  // ==========================================================================

  async getMeetings(params: {
    conversation_id?: number;
    external_id?: string;
    phone?: string;
  }): Promise<MeetingListResponse> {
    const searchParams = new URLSearchParams();

    if (params.conversation_id) searchParams.set('conversation_id', String(params.conversation_id));
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.phone) searchParams.set('phone', params.phone);

    return this.request(`/meetings?${searchParams.toString()}`);
  }

  async updateMeetingAttendance(params: {
    conversation_id?: number;
    external_id?: string;
    phone?: string;
    showed: number;
  }): Promise<Meeting> {
    return this.request('/meetings/attendance', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ==========================================================================
  // CRM (HubSpot)
  // ==========================================================================

  async getHubSpotOwners(): Promise<HubSpotOwnersResponse> {
    return this.request('/crm/owners');
  }

  async getHubSpotContact(phone: string): Promise<{
    contact: { id: string; email?: string; firstname?: string; lastname?: string; phone?: string; company?: string } | null;
    has_contact: boolean;
  }> {
    return this.request(`/crm/contact?phone=${encodeURIComponent(phone)}`);
  }

  async getAssignedOwner(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<{ owner: { id: string; firstName?: string; lastName?: string } | null }> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/assigned-owner?${searchParams.toString()}`);
  }

  async changeOwner(
    params: { phone?: string; external_id?: string; internal_id?: number },
    ownerId: string
  ): Promise<{ success: boolean }> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/change-owner?${searchParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId }),
    });
  }

  async getDeal(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<{ deal: HubSpotDeal | null; has_deal: boolean }> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/deal?${searchParams.toString()}`);
  }

  async getDealStages(pipelineId = 'default'): Promise<DealStagesResponse> {
    return this.request(`/crm/deal-stages?pipeline_id=${pipelineId}`);
  }

  async getHubSpotLinks(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<HubSpotLinksResponse> {
    const searchParams = new URLSearchParams();

    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/links?${searchParams.toString()}`);
  }

  /**
   * Get full contact data with all HubSpot properties, marketing attribution,
   * and associated company IDs.
   */
  async getFullContact(phone: string): Promise<FullContactResponse> {
    return this.request(`/crm/contact/full?phone=${encodeURIComponent(phone)}`);
  }

  /**
   * Get all form submissions for a contact.
   * Returns form metadata, field values, and campaign attribution.
   */
  async getFormSubmissions(phone: string): Promise<FormSubmissionsResponse> {
    return this.request(`/crm/contact/form-submissions?phone=${encodeURIComponent(phone)}`);
  }

  /**
   * Get contact activity timeline.
   * Returns notes, calls, emails, meetings, and tasks sorted by timestamp.
   */
  async getContactActivity(params: {
    phone: string;
    limit?: number;
    engagement_types?: string;
  }): Promise<ContactActivityResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('phone', params.phone);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.engagement_types) searchParams.set('engagement_types', params.engagement_types);

    return this.request(`/crm/contact/activity?${searchParams.toString()}`);
  }

  // ==========================================================================
  // Tasks
  // ==========================================================================

  /**
   * Get all tasks for a contact.
   */
  async getTasks(params: {
    phone?: string;
    external_id?: string;
    internal_id?: number;
  }): Promise<TasksResponse> {
    const searchParams = new URLSearchParams();
    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/tasks?${searchParams.toString()}`);
  }

  /**
   * Get a single task by ID.
   */
  async getTask(taskId: string): Promise<GetTaskResponse> {
    return this.request(`/crm/tasks/${taskId}`);
  }

  /**
   * Create a new task for a contact.
   */
  async createTask(
    params: { phone?: string; external_id?: string; internal_id?: number },
    data: CreateTaskRequest
  ): Promise<CreateTaskResponse> {
    const searchParams = new URLSearchParams();
    if (params.phone) searchParams.set('phone', params.phone);
    if (params.external_id) searchParams.set('external_id', params.external_id);
    if (params.internal_id) searchParams.set('internal_id', String(params.internal_id));

    return this.request(`/crm/tasks?${searchParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a task by ID.
   */
  async updateTask(taskId: string, data: UpdateTaskRequest): Promise<UpdateTaskResponse> {
    return this.request(`/crm/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a task by ID.
   */
  async deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    return this.request(`/crm/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  async getFunnelMetrics(startDate: string, endDate: string): Promise<FunnelMetricsResponse> {
    return this.request(`/metrics/funnel?start_date=${startDate}&end_date=${endDate}`);
  }

  async getConversionRates(startDate: string, endDate: string): Promise<ConversionRatesResponse> {
    return this.request(`/metrics/conversion-rates?start_date=${startDate}&end_date=${endDate}`);
  }

  async getConversionSummary(startDate: string, endDate: string): Promise<ConversionSummaryResponse> {
    return this.request(`/metrics/conversions-summary?start_date=${startDate}&end_date=${endDate}`);
  }

  async getConversationsCount(startDate: string, endDate: string): Promise<ConversationsCountResponse> {
    return this.request(`/metrics/conversations-count?start_date=${startDate}&end_date=${endDate}`);
  }

  async getMessagesByRole(startDate: string, endDate: string): Promise<MessagesByRoleResponse> {
    return this.request(`/metrics/messages-by-role?start_date=${startDate}&end_date=${endDate}`);
  }

  async getTotalMessages(startDate: string, endDate: string): Promise<TotalMessagesResponse> {
    return this.request(`/metrics/total-messages?start_date=${startDate}&end_date=${endDate}`);
  }

  async getResponseTime(startDate: string, endDate: string): Promise<ResponseTimeResponse> {
    return this.request(`/metrics/response-time?start_date=${startDate}&end_date=${endDate}`);
  }

  async getConversionsDaily(startDate: string, endDate: string): Promise<ConversionDailyResponse> {
    return this.request(`/metrics/conversions-daily?start_date=${startDate}&end_date=${endDate}`);
  }

  // ==========================================================================
  // CRM Funnel Metrics
  // ==========================================================================

  /**
   * Get CRM funnel volume (counts at each stage).
   */
  async getCRMFunnelVolume(
    startDate: string,
    endDate: string
  ): Promise<CRMFunnelVolumeResponse> {
    return this.request(
      `/metrics/crm/funnel-volume?start_date=${startDate}&end_date=${endDate}`
    );
  }

  /**
   * Get CRM conversion rates with step-by-step breakdown.
   * This is the main endpoint for funnel metrics showing conversion rates.
   */
  async getCRMConversionRates(
    startDate: string,
    endDate: string
  ): Promise<CRMConversionRatesResponse> {
    return this.request(
      `/metrics/crm/conversion-rates?start_date=${startDate}&end_date=${endDate}`
    );
  }

  // ==========================================================================
  // AI Architecture
  // ==========================================================================

  /**
   * Get the Mermaid diagram of the agent architecture.
   * Returns the diagram string and graph structure (nodes/edges).
   */
  async getAIDiagram(): Promise<DiagramResponse> {
    return this.request('/ai/diagram');
  }

  /**
   * Get list of all prompts with metadata.
   * Optionally filter by category or node.
   */
  async getAIPrompts(params?: {
    category?: string;
    node?: string;
  }): Promise<PromptListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.node) searchParams.set('node', params.node);
    const queryString = searchParams.toString();
    return this.request(`/ai/prompts${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get full prompt details including content.
   */
  async getAIPrompt(promptId: string): Promise<PromptDetail> {
    return this.request(`/ai/prompts/${encodeURIComponent(promptId)}`);
  }

  /**
   * Get list of all agent nodes.
   */
  async getAINodes(): Promise<NodeListResponse> {
    return this.request('/ai/nodes');
  }

  /**
   * Get detailed information about a specific node.
   */
  async getAINode(nodeId: string): Promise<NodeDetail> {
    return this.request(`/ai/nodes/${encodeURIComponent(nodeId)}`);
  }

  /**
   * Get complete architecture overview.
   * Includes diagram, all nodes, prompt summary, and state fields.
   */
  async getAIArchitecture(): Promise<AgentArchitectureResponse> {
    return this.request('/ai/architecture');
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _cortexClient: CortexClient | null = null;

export function getCortexClient(): CortexClient {
  if (!_cortexClient) {
    const baseUrl = process.env.CORTEX_API_URL;
    const apiKey = process.env.CORTEX_API_KEY;

    if (!baseUrl) {
      throw new Error('CORTEX_API_URL environment variable is not set');
    }
    if (!apiKey) {
      throw new Error('CORTEX_API_KEY environment variable is not set');
    }

    _cortexClient = new CortexClient(baseUrl, apiKey);
  }
  return _cortexClient;
}

// Lazy getter for convenient access
export const cortexClient = new Proxy({} as CortexClient, {
  get(_, prop) {
    return getCortexClient()[prop as keyof CortexClient];
  },
});

export { CortexClient, CortexAPIError };
