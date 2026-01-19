'use client';

import React from 'react';
import { CheckCircle, Phone, MessageSquare, Mail, Globe } from 'lucide-react';

interface CompletionStepProps {
  kbData: any;
  saraConfig: any;
  onComplete: () => void;
  loading: boolean;
}

export default function CompletionStep({ kbData, saraConfig, onComplete, loading }: CompletionStepProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Configuration terminée ! 🎉
      </h2>

      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Sara est prête à répondre à vos clients. Vous pouvez maintenant accéder à votre tableau de bord.
      </p>

      <div className="bg-gray-50 rounded-lg p-6 mb-8 max-w-md mx-auto text-left">
        <h3 className="font-semibold mb-4">Récapitulatif :</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-500" />
            <span>Téléphone : +33 9 39 03 57 60</span>
          </li>
          {saraConfig?.sms && (
            <li className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <span>SMS activés</span>
            </li>
          )}
          {saraConfig?.email && (
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <span>Emails configurés</span>
            </li>
          )}
          {kbData?.websiteUrl && (
            <li className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-500" />
              <span>Site analysé : {kbData.websiteUrl}</span>
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={onComplete}
        disabled={loading}
        className="bg-black text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? 'Chargement...' : 'Accéder au tableau de bord'}
      </button>
    </div>
  );
}
