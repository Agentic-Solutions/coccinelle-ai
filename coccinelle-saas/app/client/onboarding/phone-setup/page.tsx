'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, CheckCircle, ChevronRight, ArrowLeft, Volume2, Clock, Calendar } from 'lucide-react';
import Logo from '@/components/Logo';

export default function PhoneSetupPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testCallRequested, setTestCallRequested] = useState(false);

  const saraPhoneNumber = '+33 1 23 45 67 89'; // Numéro de Sara (à remplacer par le vrai)

  const handleContinue = () => {
    // Sauvegarder le numéro de téléphone
    const phoneConfig = {
      phoneNumber,
      testCallRequested,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_phone_config', JSON.stringify(phoneConfig));

    // Rediriger vers la page de confirmation ou le dashboard
    router.push('/client/onboarding/complete');
  };

  const handleBack = () => {
    router.push('/client/onboarding');
  };

  const isPhoneValid = phoneNumber.length >= 10;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration Sara</h1>
              <p className="text-sm text-gray-600">Votre assistant vocal disponible 24/7</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* Sara Presentation */}
          <div className="bg-white rounded-xl border-2 border-gray-900 p-8">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Phone className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Rencontrez Sara</h2>
                <p className="text-gray-700 mb-4">
                  Sara est votre assistante vocale intelligente, propulsée par l'IA. Elle peut répondre à vos questions,
                  prendre vos rendez-vous et vous accompagner dans votre recherche immobilière.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <span>Disponible 24h/24, 7j/7</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span>Prise de rendez-vous automatique</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Volume2 className="w-5 h-5 text-gray-600" />
                    <span>Compréhension naturelle de vos besoins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sara's Phone Number */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Numéro de Sara</h3>
            <div className="bg-white rounded-lg border-2 border-gray-900 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-gray-900" />
                <span className="text-2xl font-bold text-gray-900">{saraPhoneNumber}</span>
              </div>
              <button
                onClick={() => window.open(`tel:${saraPhoneNumber}`)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Appeler maintenant
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Enregistrez ce numéro dans vos contacts pour pouvoir contacter Sara à tout moment.
            </p>
          </div>

          {/* Client Phone Number */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Votre numéro de téléphone</h3>
            <p className="text-sm text-gray-600 mb-4">
              Indiquez le numéro où Sara pourra vous joindre pour vous rappeler si nécessaire.
            </p>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-lg"
            />
          </div>

          {/* Test Call Option */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={testCallRequested}
                onChange={(e) => setTestCallRequested(e.target.checked)}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900 mt-1"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Recevoir un appel de test</h3>
                <p className="text-sm text-gray-600">
                  Sara vous appellera dans les prochaines minutes pour vous présenter ses capacités et
                  vérifier que tout fonctionne correctement.
                </p>
              </div>
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
              disabled={!isPhoneValid}
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
