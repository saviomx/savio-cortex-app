import { NextResponse } from 'next/server';
import { validateApiAuth } from '@/lib/auth-api';

const CORTEX_API_URL = process.env.CORTEX_API_URL;
const CORTEX_API_KEY = process.env.CORTEX_API_KEY;

const TEMPLATES_ALLOWED_ROLES = ['admin', 'manager'];

/**
 * POST /api/admin/templates/sync
 * Sync templates from Meta
 * Allowed roles: admin, manager
 */
export async function POST() {
  const auth = await validateApiAuth(TEMPLATES_ALLOWED_ROLES);
  if (auth.error) return auth.error;

  try {
    const response = await fetch(`${CORTEX_API_URL}/templates/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CORTEX_API_KEY}`,
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
