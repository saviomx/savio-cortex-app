import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CORTEX_API_URL = process.env.CORTEX_API_URL;

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;
  return {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };
}

/**
 * GET /api/admin/templates
 * List all WhatsApp templates
 */
export async function GET() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${CORTEX_API_URL}/templates`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch templates' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch templates' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/templates
 * Create a new WhatsApp template
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headers = await getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create template' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to create template' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}
