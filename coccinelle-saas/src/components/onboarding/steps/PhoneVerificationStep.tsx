'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface PhoneVerificationStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function PhoneVerificationStep({ onNext, onBack, onSkip }: PhoneVerificationStepProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    // Normaliser le numéro
    let normalizedPhone = phone.trim().replace(/\s+/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+33' + normalizedPhone.substring(1);
    }
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/send-verification'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setSuccess('Code envoyé ! Vérifiez vos SMS.');
        setPhone(normalizedPhone);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du code');
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError('Entrez le code à 6 chiffres reçu par SMS');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/verify-phone'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Numéro vérifié !');
        setTimeout(() => onNext(), 800);
      } else {
        setError(data.error || 'Code incorrect');
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-900 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Vérification du téléphone</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Entrez votre numéro personnel pour recevoir un code de sécurité
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Numéro de téléphone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro de téléphone personnel
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              disabled={codeSent}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending || !phone.trim()}
              className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
            >
              {sending ? 'Envoi...' : codeSent ? 'Renvoyer' : 'Envoyer le code'}
            </button>
          </div>
        </div>

        {/* Code de vérification */}
        {codeSent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code de vérification (6 chiffres)
            </label>
            <input
              type="text"
              value={code}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(val);
              }}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-lg transition-colors"
          >
            Passer
          </button>
          {codeSent && (
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={verifying || code.length !== 6}
              className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? 'Vérification...' : 'Vérifier'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
