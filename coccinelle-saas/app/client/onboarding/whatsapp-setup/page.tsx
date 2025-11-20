'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, CheckCircle, ChevronRight, ArrowLeft, Info, Camera, FileText, MapPin } from 'lucide-react';
import Logo from '@/components/Logo';

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [qrCodeScanned, setQrCodeScanned] = useState(false);

  const coccinelleWhatsApp = '+33 1 23 45 67 89'; // Numéro WhatsApp de Coccinelle (à remplacer)

  const handleContinue = () => {
    // Sauvegarder la configuration WhatsApp
    const whatsappConfig = {
      phoneNumber,
      acceptedTerms,
      qrCodeScanned,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_whatsapp_config', JSON.stringify(whatsappConfig));

    // Rediriger vers la page de confirmation ou le dashboard
    router.push('/client/onboarding/complete');
  };

  const handleBack = () => {
    router.push('/client/onboarding');
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Bonjour ! Je souhaite activer WhatsApp pour mes communications.');
    window.open(`https://wa.me/${coccinelleWhatsApp.replace(/\s/g, '')}?text=${message}`, '_blank');
    setQrCodeScanned(true);
  };

  const canContinue = phoneNumber.length >= 10 && acceptedTerms && qrCodeScanned;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration WhatsApp</h1>
              <p className="text-sm text-gray-600">Messagerie instantanée enrichie</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* WhatsApp Benefits */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-gray-900" />
              <h2 className="text-xl font-bold text-gray-900">Avantages de WhatsApp</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 text-gray-700">
                <Camera className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Partagez des photos et vidéos des biens</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <FileText className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Recevez des documents et brochures</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Partage de localisation pour les visites</span>
              </div>
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Confirmations de lecture en temps réel</span>
              </div>
            </div>
          </div>

          {/* Connection Step */}
          <div className="bg-white rounded-xl border-2 border-gray-900 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Étape 1 : Connectez-vous à WhatsApp</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cliquez sur le bouton ci-dessous pour ouvrir une conversation avec notre équipe sur WhatsApp.
              Cela nous permettra de vous envoyer des messages.
            </p>
            <button
              onClick={openWhatsApp}
              className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-3 text-lg"
            >
              <MessageSquare className="w-6 h-6" />
              Ouvrir WhatsApp
            </button>
            {qrCodeScanned && (
              <div className="mt-3 flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Connexion établie !</span>
              </div>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Étape 2 : Votre numéro WhatsApp</h3>
            <p className="text-sm text-gray-600 mb-4">
              Confirmez le numéro de téléphone associé à votre compte WhatsApp.
            </p>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-lg"
            />
            <p className="text-xs text-gray-500 mt-2">
              Ce numéro doit être le même que celui utilisé pour votre compte WhatsApp.
            </p>
          </div>

          {/* Communication Types */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Ce que vous recevrez sur WhatsApp</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Nouveaux biens immobiliers avec photos</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Confirmations de rendez-vous avec localisation</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Documents et brochures détaillées</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <span>Réponses rapides à vos questions</span>
              </li>
            </ul>
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
                  J'accepte de recevoir des messages WhatsApp de la part de Coccinelle.AI. Je peux bloquer
                  ou supprimer le contact à tout moment pour me désabonner.
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
                Vos conversations WhatsApp sont chiffrées de bout en bout. Votre numéro ne sera jamais partagé.
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
