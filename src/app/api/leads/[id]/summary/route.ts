import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/leads/[id]/summary
 * Get AI-generated summary of a conversation
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const client = getCortexClient();

    // Determine if ID is internal (numeric) or external (string)
    const isNumeric = /^\d+$/.test(id);

    const summary = await client.getConversationSummary(
      isNumeric ? { internal_id: parseInt(id, 10) } : { external_id: id }
    );

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching conversation summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}
