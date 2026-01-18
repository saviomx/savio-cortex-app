import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';
import type { ConversationSearchItem, LeadStatus } from '@/types/cortex';

/**
 * GET /api/leads
 * List and search leads with optional filters using the /conversations/search API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client = getCortexClient();

    // Search parameters
    const q = searchParams.get('q') || undefined;
    const leadStatus = (searchParams.get('lead_status') || 'all') as LeadStatus;
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;
    const windowStatus = searchParams.get('window_status') || undefined;

    // Build search params - use lead_status directly for API filtering
    const searchPayload: {
      q?: string;
      lead_status?: string;
      date_from?: string;
      date_to?: string;
      window_status?: string;
      cursor?: string;
      limit?: number;
    } = {
      q,
      cursor,
      limit,
      date_from: dateFrom,
      date_to: dateTo,
      window_status: windowStatus,
    };

    // Only add lead_status if not 'all'
    if (leadStatus !== 'all') {
      searchPayload.lead_status = leadStatus;
    }

    // Use the search API
    const response = await client.searchConversations(searchPayload);

    // Transform to lead format
    const leads = response.items.map((item: ConversationSearchItem) => ({
      id: item.id,
      external_id: item.external_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      messages_count: item.messages_count,
      state: item.state,
      qualified: item.qualified,
      qualification: item.qualification,
      has_meeting: item.has_meeting,
      deal_stage: item.deal_stage,
      client_id: item.client_id,
      client_name: item.client_name,
      client_email: item.client_email,
      client_phone: item.client_phone,
      client_company: item.client_company,
      last_message_content: item.last_message_content?.substring(0, 100),
      last_message_role: item.last_message_role,
      last_message_at: item.last_message_at || item.updated_at,
      window_status: item.window_status,
      displayName: item.client_name || item.client_phone || `Lead #${item.id}`,
      priority: item.state === 1 ? 'urgent' as const : 'normal' as const,
    }));

    return NextResponse.json({
      data: leads,
      total_count: response.total_count,
      has_more: response.has_more,
      next_cursor: response.next_cursor,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

