import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side route guard for /dashboard/* routes.
 * Redirects to /login if the access_token cookie is absent.
 * This prevents the dashboard HTML from being served to unauthenticated requests.
 *
 * Note: this is a presence check only (cookie exists → allow).
 * Full token signature validation requires the JWT_SECRET which must not be
 * exposed to the Next.js edge runtime. The backend validates the token on every
 * authenticated API call.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
