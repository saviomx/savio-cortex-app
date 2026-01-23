import { NextResponse } from 'next/server';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

/**
 * POST /api/admin/templates/upload-media
 * Upload media for template headers (images, videos, documents)
 *
 * Supports two methods:
 * 1. URL-based (recommended): Send JSON body with { url: "https://..." }
 * 2. Direct file upload: Send multipart/form-data with file
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // URL-based upload (recommended)
      const body = await request.json();
      const { url, filename, content_type } = body;

      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        );
      }

      // Forward JSON to the backend
      const response = await fetch(`${CORTEX_API_URL}/templates/upload-media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CORTEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, filename, content_type }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload media' }));
        return NextResponse.json(
          { error: error.detail || error.error || 'Failed to upload media' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Direct file upload (fallback)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Create a new FormData to forward to the backend
      const backendFormData = new FormData();
      backendFormData.append('file', file);

      // Forward to the backend
      const response = await fetch(`${CORTEX_API_URL}/templates/upload-media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CORTEX_API_KEY}`,
        },
        body: backendFormData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload media' }));
        return NextResponse.json(
          { error: error.detail || error.error || 'Failed to upload media' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload media' },
      { status: 500 }
    );
  }
}
