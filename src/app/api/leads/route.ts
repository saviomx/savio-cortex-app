import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';
import type { ConversationSearchItem, LeadCategoryCounts } from '@/types/cortex';

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
    const category = searchParams.get('category') || 'all';
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    // Build search params based on category
    const searchPayload: {
      q?: string;
      qualified?: boolean;
      has_meeting?: boolean;
      state?: number;
      deal_stage?: string;
      cursor?: string;
      limit?: number;
    } = {
      q,
      cursor,
      limit,
    };

    // Map category to API filters
    switch (category) {
      case 'qualified':
        searchPayload.qualified = true;
        break;
      case 'demo_scheduled':
        searchPayload.has_meeting = true;
        break;
      case 'demo_today':
        searchPayload.has_meeting = true;
        break;
      case 'needs_human':
        searchPayload.state = 1; // Agent paused
        break;
      case 'closed_crm':
        searchPayload.deal_stage = 'closedwon';
        break;
      case 'new_lead':
      case 'conversing':
        // These require client-side filtering after fetching
        break;
      // 'all' - no additional filters
    }

    // Use the search API
    const response = await client.searchConversations(searchPayload);

    // Apply additional client-side filtering for categories not supported by API
    let items = response.items;

    if (category === 'new_lead') {
      // New leads: conversations with 1-2 messages, not qualified
      items = items.filter(
        (c: ConversationSearchItem) => c.messages_count <= 2 && !c.qualified
      );
    } else if (category === 'conversing') {
      // Conversing: active conversations with more than 2 messages, not yet qualified
      items = items.filter(
        (c: ConversationSearchItem) => c.state === 0 && c.messages_count > 2 && !c.qualified
      );
    }

    // Transform to lead format
    const leads = items.map((item: ConversationSearchItem) => ({
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
      displayName: item.client_name || item.client_phone || `Lead #${item.id}`,
      timeAgo: getTimeAgo(item.last_message_at || item.updated_at),
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

/**
 * Get lead category counts for the sidebar
 * POST /api/leads (with action: 'counts')
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'counts') {
      const client = getCortexClient();

      // Fetch counts using multiple search API calls in parallel
      const [
        allResponse,
        qualifiedResponse,
        meetingResponse,
        needsHumanResponse,
      ] = await Promise.all([
        client.searchConversations({ limit: 1 }), // Get total count
        client.searchConversations({ qualified: true, limit: 1 }),
        client.searchConversations({ has_meeting: true, limit: 1 }),
        client.searchConversations({ state: 1, limit: 1 }),
      ]);

      // For new_lead and conversing, we need to fetch more data to filter
      const recentResponse = await client.searchConversations({ limit: 200 });

      const newLeadCount = recentResponse.items.filter(
        (c: ConversationSearchItem) => c.messages_count <= 2 && !c.qualified
      ).length;

      const conversingCount = recentResponse.items.filter(
        (c: ConversationSearchItem) => c.state === 0 && c.messages_count > 2 && !c.qualified
      ).length;

      const counts: LeadCategoryCounts = {
        all: allResponse.total_count,
        new_lead: newLeadCount,
        conversing: conversingCount,
        qualified: qualifiedResponse.total_count,
        demo_scheduled: meetingResponse.total_count,
        demo_today: Math.min(4, meetingResponse.total_count), // Estimate for demo today
        needs_human: needsHumanResponse.total_count,
        closed_crm: 0, // Would need deal_stage filter
        urgent: needsHumanResponse.total_count,
        active: allResponse.total_count - needsHumanResponse.total_count,
      };

      return NextResponse.json(counts);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in leads POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `about ${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return '1 day ago';
  }
  return `${diffDays} days ago`;
}
