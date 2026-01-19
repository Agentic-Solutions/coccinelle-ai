'use client';

import React, { useState } from 'react';
import { Phone, MessageSquare, Mail, MessageCircle } from 'lucide-react';

interface ChannelSelectionStepProps {
  onNext: (data: { selectedChannels: string[] }) => void;
  onBack: () => void;
  loading: boolean;
}

const channels = [
  { id: 'phone', name: 'Téléphone', icon: Phone, description: 'Appels vocaux avec Sara' },
  { id: 'sms', name: 'SMS', icon: MessageSquare, description: 'Messages texte automatiques' },
  { id: 'email', name: 'Email', icon: Mail, description: 'Emails de confirmation' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, description: 'Messages WhatsApp Business' },
];

export default function ChannelSelectionStep({ onNext, onBack, loading }: ChannelSelectionStepProps) {
  const [selected, setSelected] = useState<string[]>(['phone']);

  const toggleChannel = (channelId: string) => {
    setSelected(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Choisissez vos canaux</h2>
      <p className="text-gray-600 mb-6">Sélectionnez les canaux de communication que Sara utilisera.</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {channels.map(channel => {
          const Icon = channel.icon;
          const isSelected = selected.includes(channel.id);
          return (
            <button
              key={channel.id}
              onClick={() => toggleChannel(channel.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
              <div className="font-semibold">{channel.name}</div>
              <div className="text-sm text-gray-500">{channel.description}</div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-900"
        >
          Retour
        </button>
        <button
          onClick={() => onNext({ selectedChannels: selected })}
          disabled={selected.length === 0 || loading}
          className="bg-black text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Continuer'}
        </button>
      </div>
    </div>
  );
}
