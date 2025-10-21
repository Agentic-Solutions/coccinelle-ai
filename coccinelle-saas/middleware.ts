import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;

  // Routes publiques
  const publicPaths = ['/', '/login', '/signup'];
  const isPublicPath = publicPaths.includes(path);

  // Routes protégées (dashboard)
  const isProtectedPath = path.startsWith('/dashboard');

  // Si route protégée et pas de token → redirect login
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si route publique (login/signup) et token présent → redirect dashboard
  if ((path === '/login' || path === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*']
};
