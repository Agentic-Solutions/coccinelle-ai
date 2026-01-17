'use client';

import React from 'react';
import { Phone, Mail, MessageSquare, PhoneCall, ExternalLink, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CHANNELS = [
  {
    id: 'phone',
    label: 'Téléphone (Voix)',
    description: 'Configurez votre assistant vocal pour gérer les appels entrants',
    icon: PhoneCall,
    link: '/dashboard/settings/channels/phone',
    color: 'blue'
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Configurez l\'envoi et la réception de messages texte',
    icon: MessageSquare,
    link: '/dashboard/settings/channels/sms',
    color: 'green'
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Configurez vos campagnes d\'emails automatisés',
    icon: Mail,
    link: '/dashboard/settings/channels/email',
    color: 'purple'
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Connectez votre compte WhatsApp Business',
    icon: Phone,
    link: '/dashboard/settings/channels/whatsapp',
    color: 'emerald'
  }
];

export default function ChannelSelectionStep({ onNext, onBack, loading }) {
  const router = useRouter();

  const handleChannelConfig = (link) => {
    router.push(`${link}?from=onboarding`);
  };

  const handleKnowledgeBase = () => {
    router.push('/dashboard/knowledge');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Configuration de vos canaux
      </h2>
      <p className="text-gray-600 mb-8">
        Configurez les canaux sur lesquels votre assistant IA communiquera avec vos clients.
        Chaque canal a sa propre page de configuration dédiée.
      </p>

      {/* Canaux de communication */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">Canaux de communication</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;

            return (
              <div
                key={channel.id}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-black mb-1">
                      {channel.label}
                    </div>
                    <div className="text-sm text-gray-600">
                      {channel.description}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleChannelConfig(channel.link)}
                  className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  Configurer
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Base de connaissance */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-black mb-4">Base de connaissance</h3>
        <div className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-black mb-1">
                Documents et connaissances
              </div>
              <div className="text-sm text-gray-600">
                Importez vos documents, FAQ et informations pour enrichir les réponses de l'assistant
              </div>
            </div>
          </div>
          <button
            onClick={handleKnowledgeBase}
            className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            Gérer la base de connaissance
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>Astuce :</strong> Vous pouvez configurer ces canaux maintenant ou plus tard depuis le menu Paramètres.
          Cliquez sur "Terminer" pour accéder au tableau de bord.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => onNext({})}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Terminer et accéder au dashboard →
        </button>
      </div>
    </div>
  );
}
