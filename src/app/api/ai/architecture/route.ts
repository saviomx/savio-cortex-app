import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/ai/architecture
 * Get complete architecture overview
 */
export async function GET() {
  try {
    const client = getCortexClient();
    const data = await client.getAIArchitecture();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI architecture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI architecture' },
      { status: 500 }
    );
  }
}
