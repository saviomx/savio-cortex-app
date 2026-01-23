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
 * GET /api/admin/templates/[template_id]
 * Get a specific template
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ template_id: string }> }
) {
  try {
    const { template_id } = await params;
    const headers = getAuthHeaders();

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
 * Delete a template (locally and from Meta/Kapso)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ template_id: string }> }
) {
  try {
    const { template_id } = await params;
    const headers = getAuthHeaders();

    // Get query params for delete_from_meta option
    const url = new URL(request.url);
    const deleteFromMeta = url.searchParams.get('delete_from_meta') !== 'false';

    const response = await fetch(
      `${CORTEX_API_URL}/templates/${template_id}?delete_from_meta=${deleteFromMeta}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to delete template' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to delete template' },
        { status: response.status }
      );
    }

    // Return the detailed deletion result
    const result = await response.json();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
