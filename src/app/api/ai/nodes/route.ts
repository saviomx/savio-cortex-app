import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/ai/nodes
 * Get list of all agent nodes
 */
export async function GET() {
  try {
    const client = getCortexClient();
    const data = await client.getAINodes();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI nodes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI nodes' },
      { status: 500 }
    );
  }
}
