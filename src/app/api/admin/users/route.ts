import { NextResponse } from 'next/server';
import { validateApiAuth, getAuthToken } from '@/lib/auth-api';

const CORTEX_API_URL = process.env.CORTEX_API_URL;

const ADMIN_ONLY_ROLES = ['admin'];

async function getAuthHeaders() {
  const authToken = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };
}

/**
 * GET /api/admin/users
 * List all users
 * Allowed roles: admin only
 */
export async function GET() {
  const auth = await validateApiAuth(ADMIN_ONLY_ROLES);
  if (auth.error) return auth.error;

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${CORTEX_API_URL}/auth/users`, { headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch users' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to fetch users' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
