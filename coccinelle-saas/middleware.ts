import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fonction pour décoder et vérifier le JWT (sans vérifier la signature côté client)
function isTokenValid(token: string): boolean {
  try {
    // Décoder le JWT (format: header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Décoder le payload (base64)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    // Vérifier l'expiration
    if (!payload.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;

  // Routes publiques
  const publicPaths = ['/', '/login', '/signup'];
  const isPublicPath = publicPaths.includes(path);

  // Routes protégées (dashboard)
  const isProtectedPath = path.startsWith('/dashboard');

  // Vérifier la validité du token
  const hasValidToken = token ? isTokenValid(token) : false;

  // Si route protégée et pas de token valide → redirect login
  if (isProtectedPath && !hasValidToken) {
    // Si token existe mais invalide, on le supprime
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token) {
      response.cookies.delete('auth_token');
    }
    return response;
  }

  // Si route publique (login/signup) et token valide → redirect dashboard
  if ((path === '/login' || path === '/signup') && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/signup', '/dashboard/:path*']
};
