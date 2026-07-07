'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { buildApiUrl } from '@/lib/config';

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loginDemo = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo.maze@coccinelle.ai',
            password: 'DemoMaze2026!'
          })
        });

        if (cancelled) return;

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Echec de la connexion demo.');
          return;
        }

        // Store auth data in localStorage (same keys as login page)
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('tenant', JSON.stringify(data.tenant));

        // Store token in cookie (required by middleware)
        Cookies.set('auth_token', data.token, {
          expires: 30,
          path: '/',
          sameSite: 'strict',
          secure: true
        });

        router.push('/dashboard');
      } catch (err) {
        if (cancelled) return;
        console.error('Demo login error:', err);
        setError('Erreur reseau. Veuillez reessayer.');
      }
    };

    loginDemo();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <svg
          className="animate-spin h-8 w-8 text-gray-900 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-gray-600 text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
