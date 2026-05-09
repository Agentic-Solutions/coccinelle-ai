'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de verification invalide.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          buildApiUrl(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
        );
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Votre adresse email a ete verifiee avec succes.');
          setOnboardingCompleted(data.onboarding_completed === 1);
        } else {
          setStatus('error');
          setMessage(data.error || 'Lien invalide ou expire.');
        }
      } catch {
        setStatus('error');
        setMessage('Erreur reseau. Veuillez reessayer.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        setResendMessage('Connectez-vous pour renvoyer un email de verification.');
        setResending(false);
        return;
      }

      const response = await fetch(
        buildApiUrl('/api/v1/auth/resend-verification'),
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setResendMessage('Un nouvel email de verification a ete envoye.');
      } else {
        setResendMessage(data.error || 'Erreur lors de l\'envoi.');
      }
    } catch {
      setResendMessage('Erreur reseau. Veuillez reessayer.');
    }
    setResending(false);
  };

  const redirectUrl = onboardingCompleted ? '/dashboard' : '/onboarding';
  const redirectLabel = onboardingCompleted ? 'Aller au dashboard' : 'Continuer la configuration';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {status === 'loading' && (
          <div>
            <div className="animate-spin mx-auto h-10 w-10 border-4 border-gray-300 border-t-gray-900 rounded-full mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900">Verification en cours...</h2>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verifie</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push(redirectUrl)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              {redirectLabel}
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erreur de verification</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {resending ? 'Envoi en cours...' : 'Renvoyer un email de verification'}
              </button>
              {resendMessage && (
                <p className="text-sm text-gray-600">{resendMessage}</p>
              )}
              <div>
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Retour a la connexion
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-gray-300 border-t-gray-900 rounded-full"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
