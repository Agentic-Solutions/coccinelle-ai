'use client';

import React, { useState } from 'react';
import { Phone, Mail, MessageSquare, PhoneCall } from 'lucide-react';

const CHANNELS = [
  {
    id: 'phone',
    label: 'Téléphone (Voix)',
    description: 'Appels vocaux avec Sara',
    icon: PhoneCall,
    color: 'blue'
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Messages texte via Twilio',
    icon: MessageSquare,
    color: 'green'
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Emails automatisés',
    icon: Mail,
    color: 'purple'
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Messages WhatsApp Business',
    icon: Phone,
    color: 'emerald'
  }
];

export default function ChannelSelectionStep({ onNext, onBack, loading }) {
  const [selectedChannels, setSelectedChannels] = useState(['phone']); // Phone sélectionné par défaut

  const toggleChannel = (channelId) => {
    setSelectedChannels(prev => {
      if (prev.includes(channelId)) {
        return prev.filter(id => id !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedChannels.length === 0) {
      alert('Veuillez sélectionner au moins un canal de communication');
      return;
    }

    onNext({
      selectedChannels
    });
  };

  const isFormValid = selectedChannels.length > 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-black mb-2">
        Quels canaux souhaitez-vous activer ?
      </h2>
      <p className="text-gray-600 mb-8">
        Sélectionnez les canaux sur lesquels Sara pourra communiquer avec vos clients.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const isSelected = selectedChannels.includes(channel.id);

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => toggleChannel(channel.id)}
              className={`p-6 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-black' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    isSelected ? 'text-white' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-black">
                      {channel.label}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {channel.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>Note:</strong> Le canal <strong>Téléphone</strong> sera configuré à l'étape suivante. Les autres canaux (SMS, Email, WhatsApp) pourront être configurés plus tard dans <strong>Paramètres {'>'} Canaux</strong>.
          {selectedChannels.length > 0 && (
            <span className="block mt-2 font-medium">
              {selectedChannels.length} canal{selectedChannels.length > 1 ? 'ux' : ''} sélectionné{selectedChannels.length > 1 ? 's' : ''}
            </span>
          )}
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
          onClick={handleSubmit}
          disabled={!isFormValid || loading}
          className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Chargement...' : 'Continuer →'}
        </button>
      </div>
    </div>
  );
}
