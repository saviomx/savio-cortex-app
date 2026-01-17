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
 * PATCH /api/admin/users/[user_id]
 * Update user (activate, deactivate, change role)
 * Body: { action: 'activate' | 'deactivate' | 'role', role?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const body = await request.json();
    const { action, role } = body;

    const headers = await getAuthHeaders();
    let endpoint: string;
    let requestBody: object | undefined;

    switch (action) {
      case 'activate':
        endpoint = `${CORTEX_API_URL}/auth/users/${user_id}/activate`;
        break;
      case 'deactivate':
        endpoint = `${CORTEX_API_URL}/auth/users/${user_id}/deactivate`;
        break;
      case 'role':
        if (!role) {
          return NextResponse.json(
            { error: 'Role is required for role change action' },
            { status: 400 }
          );
        }
        endpoint = `${CORTEX_API_URL}/auth/users/${user_id}/role`;
        requestBody = { role };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: activate, deactivate, or role' },
          { status: 400 }
        );
    }

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      ...(requestBody && { body: JSON.stringify(requestBody) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `Failed to ${action} user` }));
      return NextResponse.json(
        { error: error.detail || `Failed to ${action} user` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}
