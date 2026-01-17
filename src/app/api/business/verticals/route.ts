import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

/**
 * GET /api/business/verticals
 * List available business verticals
 */
export async function GET() {
  try {
    const response = await fetch(`${CORTEX_API_URL}/business/verticals`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORTEX_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch business verticals' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch business verticals' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching business verticals:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch business verticals' },
      { status: 500 }
    );
  }
}
