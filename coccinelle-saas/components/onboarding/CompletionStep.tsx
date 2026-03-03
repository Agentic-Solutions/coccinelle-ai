'use client';

import React, { useState } from 'react';
import { CheckCircle, Phone, MessageSquare, Mail, Globe, ThumbsUp, ThumbsDown } from 'lucide-react';

interface CompletionStepProps {
  kbData: any;
  saraConfig: any;
  onComplete: () => void;
  loading: boolean;
}

export default function CompletionStep({ kbData, saraConfig, onComplete, loading }: CompletionStepProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>

      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Configuration terminée !
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

      {/* Section test d'appel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Phone className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 text-lg">Testez Sara maintenant !</h3>
        </div>
        <p className="text-sm text-blue-800 mb-4">
          Appelez ce numéro depuis votre téléphone pour tester Sara, votre assistante vocale.
        </p>
        <a
          href="tel:+33939035761"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
        >
          <Phone className="w-5 h-5" />
          +33 9 39 03 57 61
        </a>
        <p className="text-xs text-blue-600 mt-3">
          Numéro de test Coccinelle.ai
        </p>

        {/* Feedback */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-blue-800 mb-2">Comment s'est passé le test ?</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setFeedback('up')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                feedback === 'up'
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Satisfait
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                feedback === 'down'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              A améliorer
            </button>
          </div>
          {feedback === 'down' && (
            <p className="text-xs text-blue-700 mt-2">
              Vous pourrez personnaliser Sara davantage dans Canaux &gt; Téléphone
            </p>
          )}
        </div>
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
