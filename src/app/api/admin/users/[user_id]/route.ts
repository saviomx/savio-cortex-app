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
 * PATCH /api/admin/users/[user_id]
 * Update user (activate, deactivate, change role)
 * Body: { action: 'activate' | 'deactivate' | 'role', role?: string }
 * Allowed roles: admin only
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const auth = await validateApiAuth(ADMIN_ONLY_ROLES);
  if (auth.error) return auth.error;

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
