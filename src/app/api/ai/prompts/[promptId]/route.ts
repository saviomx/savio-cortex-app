import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{ promptId: string }>;
}

/**
 * GET /api/ai/prompts/[promptId]
 * Get full prompt details including content
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { promptId } = await params;
    const client = getCortexClient();
    const data = await client.getAIPrompt(promptId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI prompt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI prompt' },
      { status: 500 }
    );
  }
}
