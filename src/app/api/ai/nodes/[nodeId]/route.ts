import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

interface RouteParams {
  params: Promise<{ nodeId: string }>;
}

/**
 * GET /api/ai/nodes/[nodeId]
 * Get detailed information about a specific node
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { nodeId } = await params;
    const client = getCortexClient();
    const data = await client.getAINode(nodeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI node' },
      { status: 500 }
    );
  }
}
