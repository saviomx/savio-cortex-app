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
 * GET /api/admin/templates/[template_id]
 * Get a specific template
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ template_id: string }> }
) {
  try {
    const { template_id } = await params;
    const headers = await getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/templates/${template_id}`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch template' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch template' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/templates/[template_id]
 * Delete a template
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ template_id: string }> }
) {
  try {
    const { template_id } = await params;
    const headers = await getAuthHeaders();

    const response = await fetch(`${CORTEX_API_URL}/templates/${template_id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to delete template' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to delete template' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
