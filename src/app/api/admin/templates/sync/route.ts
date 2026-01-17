import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CORTEX_API_URL = process.env.CORTEX_API_URL;

/**
 * POST /api/admin/templates/sync
 * Sync templates from Meta
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    const response = await fetch(`${CORTEX_API_URL}/templates/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to sync templates' }));
      return NextResponse.json(
        { error: error.detail || 'Failed to sync templates' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error syncing templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync templates' },
      { status: 500 }
    );
  }
}
