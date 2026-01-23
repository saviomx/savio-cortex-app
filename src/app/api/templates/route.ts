import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

/**
 * GET /api/templates
 * List approved WhatsApp templates for sending
 */
export async function GET() {
  try {
    const response = await fetch(`${CORTEX_API_URL}/templates?status=APPROVED`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORTEX_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch templates' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch templates' },
        { status: response.status }
      );
    }

    const result = await response.json();
    // Backend returns { items: [...], total_count, has_more }
    return NextResponse.json({ data: result.items || [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
