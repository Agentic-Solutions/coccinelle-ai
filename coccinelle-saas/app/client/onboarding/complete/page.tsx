'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Mail, MessageSquare, Phone, MessageCircle, ChevronRight, Settings } from 'lucide-react';
import Logo from '@/components/Logo';

type Channel = 'email' | 'sms' | 'whatsapp' | 'phone';

interface Preferences {
  preferredChannel: Channel;
  activeChannels: Channel[];
}

export default function OnboardingCompletePage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    // Charger les préférences depuis localStorage
    const savedPrefs = localStorage.getItem('client_communication_preferences');
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  const channelNames: Record<Channel, string> = {
    phone: 'Téléphone (Sara)',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    email: 'Email'
  };

  const channelIcons: Record<Channel, any> = {
    phone: Phone,
    whatsapp: MessageSquare,
    sms: MessageCircle,
    email: Mail
  };

  const handleGoToDashboard = () => {
    router.push('/client/dashboard');
  };

  const handleModifyPreferences = () => {
    router.push('/client/preferences');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration terminée !</h1>
              <p className="text-sm text-gray-600">Votre compte est prêt à l'emploi</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 border-2 border-green-600 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bienvenue chez Coccinelle.AI !</h2>
            <p className="text-lg text-gray-700">
              Votre compte a été configuré avec succès. Nous sommes prêts à vous accompagner dans votre recherche immobilière.
            </p>
          </div>

          {/* Preferences Summary */}
          {preferences && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Vos préférences de communication</h3>

              {/* Preferred Channel */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Canal préféré</p>
                <div className="bg-gray-50 rounded-lg border-2 border-gray-900 p-4 flex items-center gap-3">
                  {(() => {
                    const Icon = channelIcons[preferences.preferredChannel];
                    return (
                      <>
                        <Icon className="w-6 h-6 text-gray-900" />
                        <span className="font-semibold text-gray-900 text-lg">
                          {channelNames[preferences.preferredChannel]}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Active Channels */}
              {preferences.activeChannels.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Canaux supplémentaires activés</p>
                  <div className="grid grid-cols-2 gap-3">
                    {preferences.activeChannels
                      .filter(ch => ch !== preferences.preferredChannel)
                      .map((channel) => {
                        const Icon = channelIcons[channel];
                        return (
                          <div
                            key={channel}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center gap-2"
                          >
                            <Icon className="w-5 h-5 text-gray-700" />
                            <span className="font-medium text-gray-900">{channelNames[channel]}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Prochaines étapes</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Complétez votre profil</p>
                  <p className="text-sm text-gray-600">
                    Ajoutez vos critères de recherche pour recevoir des biens personnalisés
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Explorez nos biens</p>
                  <p className="text-sm text-gray-600">
                    Parcourez notre catalogue de propriétés disponibles
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Prenez rendez-vous</p>
                  <p className="text-sm text-gray-600">
                    Planifiez une visite ou contactez-nous via votre canal préféré
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          {preferences?.preferredChannel === 'phone' && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="flex items-start gap-3">
                <Phone className="w-6 h-6 text-gray-700 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Besoin d'aide immédiate ?</h3>
                  <p className="text-gray-700 mb-3">
                    Sara, notre assistante vocale, est disponible 24/7 pour répondre à toutes vos questions.
                  </p>
                  <a
                    href="tel:+33123456789"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler Sara maintenant
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              onClick={handleModifyPreferences}
              className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Modifier mes préférences
            </button>
            <button
              onClick={handleGoToDashboard}
              className="flex-1 px-6 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
            >
              Accéder à mon espace
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
