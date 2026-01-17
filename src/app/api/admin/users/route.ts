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
 * GET /api/admin/users
 * List all users
 */
export async function GET() {
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
