'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordErrors: string[] = [];
  if (password && password.length < 8) passwordErrors.push('Minimum 8 caracteres');
  if (password && !/[A-Z]/.test(password)) passwordErrors.push('1 majuscule requise');
  if (password && !/[a-z]/.test(password)) passwordErrors.push('1 minuscule requise');
  if (password && !/[0-9]/.test(password)) passwordErrors.push('1 chiffre requis');
  if (password && confirmPassword && password !== confirmPassword) passwordErrors.push('Les mots de passe ne correspondent pas');

  const isFormValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Lien expire ou invalide');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Lien invalide</h2>
          <p className="text-gray-600">Ce lien de reinitialisation est invalide ou a expire.</p>
          <Link href="/forgot-password" className="font-medium text-gray-900 hover:text-gray-700">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-green-800 mb-2">Mot de passe modifie</h2>
            <p className="text-sm text-green-700">
              Votre mot de passe a ete reinitialise avec succes. Vous allez etre redirige vers la page de connexion...
            </p>
          </div>
          <div className="text-center">
            <Link href="/login" className="font-medium text-gray-900 hover:text-gray-700">
              Aller a la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Nouveau mot de passe
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choisissez un nouveau mot de passe securise.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                placeholder="Minimum 8 caracteres"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
                placeholder="Retapez le mot de passe"
                disabled={loading}
              />
            </div>
          </div>

          {passwordErrors.length > 0 && (
            <div className="rounded-md bg-yellow-50 p-3 border border-yellow-200">
              <ul className="text-xs text-yellow-800 space-y-1">
                {passwordErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="font-medium text-sm text-gray-900 hover:text-gray-700">
              Retour a la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
