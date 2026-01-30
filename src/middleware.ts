import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/access-denied'];

// Allowed roles for accessing the main app
const ALLOWED_ROLES = ['admin', 'sdr', 'manager'];

// Routes restricted to admin only
const ADMIN_ONLY_ROUTES = ['/ai-brain'];

// Routes accessible by admin and manager
const ADMIN_MANAGER_ROUTES = ['/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  const userInfoCookie = request.cookies.get('user_info')?.value;

  // Parse user info if available (cookie value may be URL-encoded)
  let userInfo: { role?: string } | null = null;
  if (userInfoCookie) {
    try {
      const decoded = decodeURIComponent(userInfoCookie);
      userInfo = JSON.parse(decoded);
    } catch {
      userInfo = null;
    }
  }

  const userRole = (userInfo?.role || '').toLowerCase();
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthenticated = !!authToken;
  const hasAccess = userInfo && ALLOWED_ROLES.includes(userRole);

  // Redirect unauthenticated users to login (except for public routes)
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/register pages
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    if (hasAccess) {
      return NextResponse.redirect(new URL('/', request.url));
    } else {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  // Redirect users without access to the access-denied page (except if already there)
  if (isAuthenticated && !hasAccess && !isPublicRoute) {
    return NextResponse.redirect(new URL('/access-denied', request.url));
  }

  // Redirect users with access away from access-denied page
  if (isAuthenticated && hasAccess && pathname === '/access-denied') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based route restrictions for authenticated users
  if (isAuthenticated && hasAccess) {
    // Admin-only routes
    if (ADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    // Admin and Manager routes (like settings)
    if (ADMIN_MANAGER_ROUTES.some(route => pathname.startsWith(route))) {
      if (userRole !== 'admin' && userRole !== 'manager') {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
