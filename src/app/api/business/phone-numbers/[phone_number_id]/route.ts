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
 * GET /api/business/phone-numbers/[phone_number_id]
 * Get phone number details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone_number_id: string }> }
) {
  try {
    const { phone_number_id } = await params;
    const headers = getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/business/phone-numbers/${phone_number_id}`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch phone number details' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch phone number details' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching phone number details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch phone number details' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/phone-numbers/[phone_number_id]
 * Update phone number settings
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone_number_id: string }> }
) {
  try {
    const { phone_number_id } = await params;
    const body = await request.json();
    const headers = getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/business/phone-numbers/${phone_number_id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to update phone number settings' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to update phone number settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating phone number settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update phone number settings' },
      { status: 500 }
    );
  }
}
