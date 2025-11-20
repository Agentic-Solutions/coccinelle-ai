'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, CheckCircle, ChevronRight, ArrowLeft, Info, Bell } from 'lucide-react';
import Logo from '@/components/Logo';

export default function SMSSetupPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState<'all' | 'important' | 'minimal'>('all');

  const handleContinue = () => {
    // Sauvegarder la configuration SMS
    const smsConfig = {
      phoneNumber,
      acceptedTerms,
      notificationPreference,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_sms_config', JSON.stringify(smsConfig));

    // Rediriger vers la page de confirmation ou le dashboard
    router.push('/client/onboarding/complete');
  };

  const handleBack = () => {
    router.push('/client/onboarding');
  };

  const canContinue = phoneNumber.length >= 10 && acceptedTerms;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration SMS</h1>
              <p className="text-sm text-gray-600">Restez informé par messages texte</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* SMS Benefits */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Avantages des SMS</h2>
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Aucune application nécessaire - fonctionne sur tous les téléphones</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Réception garantie même sans connexion internet</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Idéal pour les confirmations de rendez-vous</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Notifications instantanées pour les nouveaux biens</span>
              </li>
            </ul>
          </div>

          {/* Phone Number Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Votre numéro de mobile</h3>
            <p className="text-sm text-gray-600 mb-4">
              Indiquez le numéro sur lequel vous souhaitez recevoir les SMS.
            </p>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-lg"
            />
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">Fréquence des SMS</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choisissez le type de notifications que vous souhaitez recevoir.
            </p>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  notificationPreference === 'all'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="notification"
                  value="all"
                  checked={notificationPreference === 'all'}
                  onChange={(e) => setNotificationPreference(e.target.value as 'all')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Toutes les notifications</p>
                  <p className="text-sm text-gray-600">
                    Nouveaux biens, confirmations de rendez-vous, rappels, offres spéciales
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  notificationPreference === 'important'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="notification"
                  value="important"
                  checked={notificationPreference === 'important'}
                  onChange={(e) => setNotificationPreference(e.target.value as 'important')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Important uniquement</p>
                  <p className="text-sm text-gray-600">
                    Uniquement les confirmations de rendez-vous et les nouveaux biens correspondant à vos critères
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors border-2 ${
                  notificationPreference === 'minimal'
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="notification"
                  value="minimal"
                  checked={notificationPreference === 'minimal'}
                  onChange={(e) => setNotificationPreference(e.target.value as 'minimal')}
                  className="mt-1 w-4 h-4 text-gray-900"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Minimal</p>
                  <p className="text-sm text-gray-600">
                    Uniquement les confirmations de rendez-vous
                  </p>
                </div>
              </label>
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
                  J'accepte de recevoir des SMS de la part de Coccinelle.AI. Je comprends que les tarifs SMS standards
                  de mon opérateur peuvent s'appliquer. Je peux me désabonner à tout moment en répondant STOP.
                </p>
              </div>
            </div>
          </div>

          {/* Info RGPD */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Protection de vos données</p>
              <p>
                Votre numéro de téléphone est sécurisé et ne sera jamais partagé avec des tiers.
                Conforme RGPD.
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
