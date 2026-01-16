import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/leads/[id]
 * Get a single lead/conversation with all messages
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getCortexClient();

    // Determine if ID is internal (numeric) or external (string)
    const isNumeric = /^\d+$/.test(id);

    const conversation = await client.getConversation(
      isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id }
    );

    // Get agent status for this lead
    let agentStatus = null;
    if (conversation.client_data?.phone) {
      try {
        agentStatus = await client.getAgentStatus(conversation.client_data.phone);
      } catch {
        // Agent status may not be available
      }
    }

    // Get meetings if any
    let meetings = null;
    try {
      const meetingsResponse = await client.getMeetings(
        isNumeric ? { conversation_id: parseInt(id, 10) } : { external_id: id }
      );
      meetings = meetingsResponse.meetings;
    } catch {
      // Meetings may not be available
    }

    return NextResponse.json({
      ...conversation,
      agent_status: agentStatus,
      meetings,
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]
 * Delete a lead/conversation
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getCortexClient();

    await client.deleteConversation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
