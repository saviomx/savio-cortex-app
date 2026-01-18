import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/ai/diagram
 * Get Mermaid diagram of agent architecture
 */
export async function GET() {
  try {
    const client = getCortexClient();
    const data = await client.getAIDiagram();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching AI diagram:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI diagram' },
      { status: 500 }
    );
  }
}
