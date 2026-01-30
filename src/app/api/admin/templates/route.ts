import { NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth-api';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

// Roles allowed to access templates
const TEMPLATES_ALLOWED_ROLES = ['admin', 'manager'];

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${CORTEX_API_KEY}`,
  };
}

/**
 * GET /api/admin/templates
 * List all WhatsApp templates with optional status filter
 * Allowed roles: admin, manager
 */
export async function GET(request: Request) {
  // Validate authentication and role
  const auth = await validateApiAuth(TEMPLATES_ALLOWED_ROLES);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const language = searchParams.get('language');

    const headers = getAuthHeaders();

    // Build query string for backend
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (language) params.set('language', language);

    const queryString = params.toString();
    const url = `${CORTEX_API_URL}/templates${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { headers });

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
 * Allowed roles: admin, manager
 */
export async function POST(request: Request) {
  // Validate authentication and role
  const auth = await validateApiAuth(TEMPLATES_ALLOWED_ROLES);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const headers = getAuthHeaders();

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
