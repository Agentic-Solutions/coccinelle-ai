'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MessageCircle, Phone, MessageSquare, ChevronRight, CheckCircle, Info } from 'lucide-react';
import Logo from '@/components/Logo';

type Channel = 'email' | 'sms' | 'whatsapp' | 'phone';

interface ChannelOption {
  id: Channel;
  name: string;
  icon: any;
  description: string;
  benefits: string[];
}

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'channel' | 'config'>('channel');
  const [preferredChannel, setPreferredChannel] = useState<Channel | null>(null);
  const [secondaryChannels, setSecondaryChannels] = useState<Channel[]>([]);

  const channels: ChannelOption[] = [
    {
      id: 'phone',
      name: 'Téléphone (Sara)',
      icon: Phone,
      description: 'Appelez Sara, notre assistant vocal IA disponible 24/7',
      benefits: [
        'Réponses instantanées par téléphone',
        'Disponible jour et nuit',
        'Prise de rendez-vous automatique',
        'Rappel en cas d\'absence'
      ]
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageSquare,
      description: 'Messagerie instantanée avec photos et documents',
      benefits: [
        'Conversations riches avec médias',
        'Notifications push en temps réel',
        'Historique de conversation',
        'Partage de photos et documents'
      ]
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: MessageCircle,
      description: 'Messages texte simples et rapides',
      benefits: [
        'Aucune app requise',
        'Réception garantie',
        'Idéal pour les confirmations',
        'Fonctionne partout'
      ]
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      description: 'Communications détaillées avec pièces jointes',
      benefits: [
        'Messages détaillés',
        'Pièces jointes',
        'Archivage facile',
        'Pas de limite de caractères'
      ]
    }
  ];

  const handleChannelSelect = (channelId: Channel) => {
    setPreferredChannel(channelId);
  };

  const handleContinue = () => {
    if (preferredChannel) {
      setStep('config');
    }
  };

  const toggleSecondaryChannel = (channelId: Channel) => {
    if (channelId === preferredChannel) return; // Ne peut pas désactiver le canal préféré

    setSecondaryChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const handleFinish = () => {
    // Sauvegarder les préférences
    const preferences = {
      preferredChannel,
      activeChannels: [preferredChannel, ...secondaryChannels],
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_communication_preferences', JSON.stringify(preferences));

    // Rediriger selon le canal préféré
    switch (preferredChannel) {
      case 'phone':
        router.push('/client/onboarding/phone-setup');
        break;
      case 'sms':
        router.push('/client/onboarding/sms-setup');
        break;
      case 'whatsapp':
        router.push('/client/onboarding/whatsapp-setup');
        break;
      case 'email':
        router.push('/client/onboarding/email-setup');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bienvenue !</h1>
              <p className="text-sm text-gray-600">Choisissez comment vous souhaitez être contacté</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'channel' ? 'text-gray-900' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                step === 'channel' ? 'bg-gray-900 text-white' : 'bg-green-600 text-white'
              }`}>
                {step === 'config' ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Canal préféré</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'config' ? 'text-gray-900' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                step === 'config' ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
              <span className="font-medium">Configuration</span>
            </div>
          </div>
        </div>

        {/* Étape 1 : Sélection du canal préféré */}
        {step === 'channel' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Comment préférez-vous être contacté ?
              </h2>
              <p className="text-gray-600 text-lg">
                Sélectionnez votre canal de communication principal
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((channel) => {
                const Icon = channel.icon;
                const isSelected = preferredChannel === channel.id;

                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-gray-900 bg-gray-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-gray-900' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-700'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{channel.name}</h3>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-gray-900" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{channel.description}</p>

                    <ul className="space-y-2">
                      {channel.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {preferredChannel && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={handleContinue}
                  className="px-8 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium text-lg"
                >
                  Continuer
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Étape 2 : Activation des canaux secondaires */}
        {step === 'config' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Voulez-vous activer d'autres canaux ?
              </h2>
              <p className="text-gray-600 text-lg">
                Vous pouvez combiner plusieurs canaux de communication
              </p>
            </div>

            {/* Canal préféré (toujours actif) */}
            <div className="bg-white rounded-xl border-2 border-gray-900 p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-gray-900" />
                <h3 className="font-bold text-gray-900 text-lg">Canal préféré (toujours actif)</h3>
              </div>
              <div className="flex items-center gap-3 ml-9">
                {(() => {
                  const channel = channels.find(c => c.id === preferredChannel);
                  if (!channel) return null;
                  const Icon = channel.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-gray-700" />
                      <span className="font-medium text-gray-900">{channel.name}</span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Canaux secondaires */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Canaux supplémentaires (optionnels)</h3>
              {channels
                .filter(c => c.id !== preferredChannel)
                .map((channel) => {
                  const Icon = channel.icon;
                  const isActive = secondaryChannels.includes(channel.id);

                  return (
                    <div
                      key={channel.id}
                      className={`bg-white rounded-lg border-2 p-4 transition-all ${
                        isActive ? 'border-gray-900' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-700" />
                          <div>
                            <p className="font-medium text-gray-900">{channel.name}</p>
                            <p className="text-sm text-gray-600">{channel.description}</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-sm text-gray-600">
                            {isActive ? 'Activé' : 'Désactivé'}
                          </span>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleSecondaryChannel(channel.id)}
                            className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Info RGPD */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Respect de votre vie privée</p>
                <p>
                  Vous pouvez modifier ces préférences à tout moment depuis votre espace client.
                  Vos données sont protégées conformément au RGPD.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep('channel')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-medium"
              >
                Retour
              </button>
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium"
              >
                Continuer la configuration
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
