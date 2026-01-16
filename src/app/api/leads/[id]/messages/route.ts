import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/leads/[id]/messages
 * Get all messages for a conversation
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

    // Transform messages to frontend format
    const messages = conversation.conversation.map((msg, index) => ({
      id: `${conversation.id}-${index}`,
      role: msg.role,
      content: msg.content,
      direction: msg.role === 'user' ? 'inbound' : 'outbound',
      createdAt: conversation.created_at, // Messages don't have individual timestamps in Cortex
      metadata: msg.metadata,
    }));

    return NextResponse.json({
      messages,
      conversation_id: conversation.id,
      external_id: conversation.external_id,
      client_data: conversation.client_data,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/messages
 * Send a message as the assistant (manual takeover)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const client = getCortexClient();

    // Get conversation to retrieve phone number
    const isNumeric = /^\d+$/.test(id);
    const conversation = await client.getConversation(
      isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id }
    );

    const phone = conversation.client_data?.phone;
    if (!phone) {
      return NextResponse.json(
        { error: 'No phone number found for this conversation' },
        { status: 400 }
      );
    }

    // Send message via WhatsApp as the assistant
    const response = await client.sendTextMessage({
      phone,
      message,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
