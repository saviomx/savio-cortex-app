import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/sdr
 * List all SDR agents
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';

    const client = getCortexClient();
    const agents = await client.listSDRAgents(activeOnly);

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching SDR agents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch SDR agents' },
      { status: 500 }
    );
  }
}
