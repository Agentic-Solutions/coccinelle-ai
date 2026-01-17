'use client';

import Link from 'next/link';
import { Phone, MessageSquare, Mail, Send } from 'lucide-react';

export default function ChannelsConfigPage() {
  const channels = [
    {
      id: 'phone',
      name: 'Téléphone / Voix',
      description: 'Configuration des appels téléphoniques et assistante vocale',
      icon: Phone,
      href: '/dashboard/channels/phone',
      color: 'blue',
      status: 'active'
    },
    {
      id: 'sms',
      name: 'SMS',
      description: 'Configuration des messages SMS',
      icon: MessageSquare,
      href: '/dashboard/channels/sms',
      color: 'green',
      status: 'active'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Configuration de WhatsApp Business',
      icon: Send,
      href: '/dashboard/channels/whatsapp',
      color: 'emerald',
      status: 'active'
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Configuration des emails entrants et sortants',
      icon: Mail,
      href: '/dashboard/channels/email',
      color: 'purple',
      status: 'active'
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Canaux de communication</h1>
        <p className="text-gray-600 mt-2">
          Configurez vos différents canaux de communication avec vos clients
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <Link
              key={channel.id}
              href={channel.href}
              className="block bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-${channel.color}-50`}>
                  <Icon className={`w-6 h-6 text-${channel.color}-600`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {channel.name}
                    </h3>
                    {channel.status === 'active' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {channel.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          💡 Conseil
        </h3>
        <p className="text-sm text-blue-800">
          Configurez au moins un canal de communication pour permettre à vos clients de contacter votre assistant IA.
          Vous pouvez activer plusieurs canaux pour offrir plus de flexibilité à vos clients.
        </p>
      </div>
    </div>
  );
}
