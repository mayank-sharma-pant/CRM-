import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // Define route categories
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname.startsWith('/forgot-password') || 
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/accept-invite');

  // 1. If user is authenticated and tries to access public auth routes, redirect to home
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. If user is NOT authenticated and tries to access protected routes, redirect to login
  // (Assuming everything except specific public paths and assets is protected)
  const isAsset = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/images');

  if (!token && !isPublicRoute && !isAsset) {
    const loginUrl = new URL('/login', request.url);
    // Optionally preserve the attempted URL
    // loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
