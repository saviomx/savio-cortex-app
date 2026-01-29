import { NextResponse } from 'next/server';
import { getCortexClient } from '@/lib/cortex-client';

/**
 * GET /api/sdr/options
 * Get lightweight list of SDR agents (id + name only) for dropdowns
 */
export async function GET() {
  try {
    const client = getCortexClient();
    const options = await client.getSdrOptions();

    return NextResponse.json({ options });
  } catch (error) {
    console.error('Error fetching SDR options:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch SDR options' },
      { status: 500 }
    );
  }
}
