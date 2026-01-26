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
 * GET /api/leads/[id]/company-intelligence
 * Check if company intelligence exists for a lead
 * Query params: phone (optional) - use phone instead of client_id
 *
 * Response: { exists, status, company?, client_id?, message? }
 * status: "not_found" | "processing" | "completed" | "failed"
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    const headers = getAuthHeaders();

    // Use phone if provided, otherwise use client_id
    const identifier = phone || id;
    const identifier_type = phone ? 'phone' : 'client_id';

    const queryParams = new URLSearchParams({
      identifier,
      identifier_type,
    });

    const response = await fetch(
      `${CORTEX_API_URL}/sales/company-intelligence?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to check company intelligence' }));
      return NextResponse.json(
        {
          exists: false,
          status: 'failed',
          error: errorData.error || errorData.detail || errorData.message || 'Failed to check company intelligence',
          error_code: errorData.error_code
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking company intelligence:', error);
    return NextResponse.json(
      {
        exists: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to check company intelligence'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/[id]/company-intelligence
 * Generate or fetch company intelligence for a lead
 * Body: { refresh?: boolean }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { refresh = false, phone } = body;

    const headers = getAuthHeaders();

    // Use phone if provided, otherwise use client_id
    const identifier = phone || id;
    const identifier_type = phone ? 'phone' : 'client_id';

    const response = await fetch(`${CORTEX_API_URL}/sales/company-intelligence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        identifier,
        identifier_type,
        refresh,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to generate company intelligence' }));
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || errorData.detail || errorData.message || 'Failed to generate company intelligence',
          error_code: errorData.error_code
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating company intelligence:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate company intelligence'
      },
      { status: 500 }
    );
  }
}
