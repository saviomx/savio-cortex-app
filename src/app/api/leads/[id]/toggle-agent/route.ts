import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/leads/[id]/toggle-agent
 * Toggle agent state (pause/resume)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { state, phone } = body;

    if (typeof state !== 'number' || (state !== 0 && state !== 1)) {
      return NextResponse.json(
        { error: 'State must be 0 (active) or 1 (inactive)' },
        { status: 400 }
      );
    }

    const client = getCortexClient();

    // If phone is not provided, we need to fetch the conversation first
    let phoneNumber = phone;
    if (!phoneNumber) {
      const isNumeric = /^\d+$/.test(id);
      const conversation = await client.getConversation(
        isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id }
      );
      phoneNumber = conversation.client_data?.phone;

      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'No phone number associated with this conversation' },
          { status: 400 }
        );
      }
    }

    const response = await client.toggleAgent({
      phone: phoneNumber,
      state: state as 0 | 1,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error toggling agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle agent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads/[id]/toggle-agent
 * Get current agent status
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let phone = searchParams.get('phone');

    const client = getCortexClient();

    // If phone is not provided, fetch the conversation first
    if (!phone) {
      const isNumeric = /^\d+$/.test(id);
      const conversation = await client.getConversation(
        isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id }
      );
      phone = conversation.client_data?.phone || null;

      if (!phone) {
        return NextResponse.json(
          { error: 'No phone number associated with this conversation' },
          { status: 400 }
        );
      }
    }

    const response = await client.getAgentStatus(phone);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting agent status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
