'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { buildApiUrl } from '@/lib/config';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    Cookies.remove('auth_token', { path: '/' });
    setUser(null);
    setTenant(null);
    router.push('/login?expired=1');
  }, [router]);

  const refreshToken = useCallback(async (currentToken: string): Promise<string | null> => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        Cookies.set('auth_token', data.token, {
          expires: 7,
          path: '/',
          sameSite: 'strict',
          secure: true
        });
        return data.token;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    let token = localStorage.getItem('auth_token');

    if (!token) {
      setLoading(false);
      return;
    }

    // Si le token est expiré, tenter un refresh
    if (isTokenExpired(token)) {
      const newToken = await refreshToken(token);
      if (!newToken) {
        logout();
        return;
      }
      token = newToken;
    }

    try {
      const response = await fetch(buildApiUrl('/api/v1/auth/me'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        // Dernière tentative de refresh
        const newToken = await refreshToken(token);
        if (newToken) {
          const retry = await fetch(buildApiUrl('/api/v1/auth/me'), {
            headers: { 'Authorization': `Bearer ${newToken}` }
          });
          if (retry.ok) {
            const data = await retry.json();
            if (data.success) {
              setUser(data.user);
              setTenant(data.tenant);
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem('tenant', JSON.stringify(data.tenant));
              setLoading(false);
              return;
            }
          }
        }
        logout();
        return;
      }

      if (!response.ok) {
        logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setTenant(data.tenant);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenant', JSON.stringify(data.tenant));
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout, refreshToken]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { user, tenant, loading, logout, checkAuth };
}
