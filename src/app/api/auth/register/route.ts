import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { TokenResponse, UserRegister } from '@/types/cortex';

const CORTEX_API_URL = process.env.CORTEX_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body: UserRegister = await request.json();

    const response = await fetch(`${CORTEX_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Registration failed' },
        { status: response.status }
      );
    }

    const data: TokenResponse = await response.json();

    // Set the auth cookie
    const cookieStore = await cookies();
    const expiresAt = new Date(data.expires_at);

    cookieStore.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    // Also store user info in a separate cookie
    cookieStore.set('user_info', JSON.stringify({
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      is_active: data.user.is_active,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: data.user,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
