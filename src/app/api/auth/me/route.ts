import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { UserResponse } from '@/types/cortex';

const CORTEX_API_URL = process.env.CORTEX_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response = await fetch(`${CORTEX_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token might be expired, clear cookies
      if (response.status === 401) {
        cookieStore.delete('auth_token');
        cookieStore.delete('user_info');
      }
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: response.status }
      );
    }

    const user: UserResponse = await response.json();

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
