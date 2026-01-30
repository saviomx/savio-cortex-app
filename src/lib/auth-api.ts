import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface UserInfo {
  id?: number;
  email?: string;
  role?: string;
}

export interface AuthResult {
  isAuthenticated: boolean;
  user: UserInfo | null;
  error?: NextResponse;
}

/**
 * Validates authentication and role for API routes
 * This runs server-side in Next.js API routes
 */
export async function validateApiAuth(allowedRoles?: string[]): Promise<AuthResult> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token')?.value;
  const userInfoCookie = cookieStore.get('user_info')?.value;

  // Check authentication
  if (!authToken) {
    return {
      isAuthenticated: false,
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized - No auth token' },
        { status: 401 }
      ),
    };
  }

  // Parse user info
  let userInfo: UserInfo | null = null;
  if (userInfoCookie) {
    try {
      const decoded = decodeURIComponent(userInfoCookie);
      userInfo = JSON.parse(decoded);
    } catch {
      userInfo = null;
    }
  }

  if (!userInfo) {
    return {
      isAuthenticated: false,
      user: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Invalid user info' },
        { status: 401 }
      ),
    };
  }

  // Check role if allowedRoles specified (case-insensitive)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (userInfo.role || '').toLowerCase();
    if (!allowedRoles.includes(userRole)) {
      return {
        isAuthenticated: true,
        user: userInfo,
        error: NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        ),
      };
    }
  }

  return {
    isAuthenticated: true,
    user: userInfo,
  };
}

/**
 * Get auth token for forwarding to backend API
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}
