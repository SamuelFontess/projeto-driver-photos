import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)));
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const nonce = generateNonce();
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `connect-src 'self'`,
    `font-src 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy-Report-Only', csp);
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
