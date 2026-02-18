import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for auth token in cookies or headers (for simplicity, we assume client-side checks are primary but this adds a layer)
  // Since we store token in localStorage (client-side), middleware has limited access unless we use cookies.
  // Ideally, we should migrate to HttpOnly cookies for better security.
  // For now, we'll keep the client-side protection as primary but add a basic check if possible.

  // In this project structure, auth is handled via localStorage/Context. 
  // Middleware can't access localStorage.
  // So we'll rely on client-side checks for now, or if we switch to cookies later.
  
  // However, we can protect routes based on other criteria or just pass through.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
