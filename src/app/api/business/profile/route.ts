import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${CORTEX_API_KEY}`,
  };
}

/**
 * GET /api/business/profile
 * Get business profile
 */
export async function GET() {
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${CORTEX_API_URL}/business/profile`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch business profile' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch business profile' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch business profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/profile
 * Update business profile
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/business/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to update business profile' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to update business profile' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating business profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update business profile' },
      { status: 500 }
    );
  }
}
