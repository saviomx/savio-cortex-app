import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

/**
 * GET /api/business/phone-numbers
 * List all phone numbers
 */
export async function GET() {
  try {
    const response = await fetch(`${CORTEX_API_URL}/business/phone-numbers`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORTEX_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch phone numbers' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch phone numbers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}
