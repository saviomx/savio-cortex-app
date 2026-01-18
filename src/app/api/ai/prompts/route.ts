import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/ai/prompts
 * Get list of all prompts with optional filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const node = searchParams.get('node') || undefined;

    const client = getCortexClient();
    const data = await client.getAIPrompts({ category, node });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI prompts' },
      { status: 500 }
    );
  }
}
