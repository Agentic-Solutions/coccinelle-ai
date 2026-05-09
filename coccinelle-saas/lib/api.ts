/**
 * Centralized API fetch wrapper with automatic JWT refresh on 401.
 *
 * Usage:
 *   import { fetchWithAuth } from '@/lib/api';
 *   const res = await fetchWithAuth('/api/v1/calls/stats');
 *   const data = await res.json();
 *
 * - Automatically attaches Authorization header from localStorage.
 * - On 401, attempts to refresh the token via POST /api/v1/auth/refresh.
 * - If refresh succeeds, retries the original request once.
 * - If refresh fails, clears auth state and redirects to /login.
 */

import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// Prevent multiple concurrent refresh attempts
let refreshPromise: Promise<string | null> | null = null;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || null;
}

function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
  Cookies.set('auth_token', token, {
    expires: 30,
    path: '/',
    sameSite: 'strict',
    secure: true,
  });
}

function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('tenant');
  sessionStorage.removeItem('auth_token');
  Cookies.remove('auth_token', { path: '/' });
}

/**
 * Attempt to refresh the JWT token using the current (possibly expired) token.
 * Returns the new token if successful, null otherwise.
 * Deduplicates concurrent refresh calls.
 */
async function refreshToken(currentToken: string): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        return data.token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Build a full API URL from a path.
 * If the input is already an absolute URL, returns it as-is.
 */
function buildUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${API_URL}${pathOrUrl}`;
}

/**
 * Fetch wrapper with automatic auth and token refresh.
 *
 * @param input - API path (e.g. '/api/v1/calls/stats') or full URL
 * @param init  - Standard RequestInit options (method, body, headers, etc.)
 * @returns The fetch Response
 */
export async function fetchWithAuth(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const url = buildUrl(input);

  // Merge auth header with any provided headers
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });

  // If not 401, return as-is
  if (response.status !== 401) {
    return response;
  }

  // On 401, attempt token refresh
  if (!token) {
    // No token to refresh — redirect to login
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1';
    }
    return response;
  }

  const newToken = await refreshToken(token);

  if (!newToken) {
    // Refresh failed — clear auth and redirect
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1';
    }
    return response;
  }

  // Retry the original request with the new token
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${newToken}`);
  if (!retryHeaders.has('Content-Type') && init.body && typeof init.body === 'string') {
    retryHeaders.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...init, headers: retryHeaders });
}
