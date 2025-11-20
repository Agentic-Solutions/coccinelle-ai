'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, ChevronRight, ArrowLeft, Info, Bell, Shield, Clock } from 'lucide-react';
import Logo from '@/components/Logo';

export default function EmailSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [emailFrequency, setEmailFrequency] = useState<'realtime' | 'daily' | 'weekly'>('realtime');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  const handleContinue = () => {
    // Sauvegarder la configuration Email
    const emailConfig = {
      email,
      emailFrequency,
      acceptedTerms,
      marketingOptIn,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_email_config', JSON.stringify(emailConfig));

    // Rediriger vers la page de confirmation ou le dashboard
    router.push('/client/onboarding/complete');
  };

  const handleBack = () => {
    router.push('/client/onboarding');
  };

  const isEmailValid = email.length > 0 && email.includes('@') && email.includes('.');
  const emailsMatch = email === emailConfirm;
  const canContinue = isEmailValid && emailsMatch && acceptedTerms;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration Email</h1>
              <p className="text-sm text-gray-600">Communications détaillées par email</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* Email Benefits */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Avantages de l'email</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Descriptions détaillées des biens</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Pièces jointes et documents PDF</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Archivage facile de vos échanges</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Pas de limite de caractères</span>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Votre adresse email</h3>
            <p className="text-sm text-gray-600 mb-4">
              Indiquez l'adresse email où vous souhaitez recevoir nos communications.
            </p>
            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <input
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  placeholder="Confirmez votre email"
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                    emailConfirm.length > 0 && !emailsMatch
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-gray-900'
                  }`}
                />
                {emailConfirm.length > 0 && !emailsMatch && (
                  <p className="text-red-600 text-sm mt-1">Les adresses email ne correspondent pas</p>
                )}
              </div>
            </div>
          </div>

          {/* Email Frequency */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Fréquence des emails</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choisissez à quelle fréquence vous souhaitez recevoir les notifications.
            </p>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  emailFrequency === 'realtime'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value="realtime"
                  checked={emailFrequency === 'realtime'}
                  onChange={(e) => setEmailFrequency(e.target.value as 'realtime')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Temps réel</p>
                  <p className="text-sm text-gray-600">
                    Recevez un email immédiatement pour chaque nouveau bien ou événement important
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  emailFrequency === 'daily'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value="daily"
                  checked={emailFrequency === 'daily'}
                  onChange={(e) => setEmailFrequency(e.target.value as 'daily')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Résumé quotidien</p>
                  <p className="text-sm text-gray-600">
                    Recevez un email par jour avec tous les nouveaux biens et événements
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  emailFrequency === 'weekly'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value="weekly"
                  checked={emailFrequency === 'weekly'}
                  onChange={(e) => setEmailFrequency(e.target.value as 'weekly')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Résumé hebdomadaire</p>
                  <p className="text-sm text-gray-600">
                    Recevez un email par semaine avec une sélection de biens
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Marketing Opt-in */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 mt-1"
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Communications marketing (optionnel)
                </h3>
                <p className="text-sm text-gray-600">
                  Je souhaite recevoir les offres spéciales, newsletters et actualités du marché immobilier.
                  Vous pouvez vous désabonner à tout moment.
                </p>
              </div>
            </div>
          </div>

          {/* Terms Acceptance */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 mt-1"
              />
              <div>
                <p className="text-sm text-gray-700">
                  J'accepte de recevoir des emails de la part de Coccinelle.AI concernant ma recherche immobilière
                  et mes rendez-vous. Je peux me désinscrire à tout moment en cliquant sur le lien de désinscription
                  présent dans chaque email.
                </p>
              </div>
            </div>
          </div>

          {/* Email Verification Notice */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Vérification de votre email</p>
              <p>
                Après validation, vous recevrez un email de confirmation. Cliquez sur le lien pour activer
                votre compte et commencer à recevoir nos communications.
              </p>
            </div>
          </div>

          {/* Info RGPD */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Protection de vos données</p>
              <p>
                Votre adresse email est sécurisée et ne sera jamais vendue ou partagée avec des tiers.
                Conforme RGPD. Vous pouvez modifier vos préférences à tout moment.
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <button
              onClick={handleBack}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
