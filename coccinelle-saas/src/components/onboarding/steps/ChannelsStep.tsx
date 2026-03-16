'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface ChannelsStepProps {
  channelsData: string[];
  onChannelsChange: (channels: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const CHANNELS = [
  {
    id: 'phone',
    label: 'Telephone',
    description: 'Appels entrants et sortants',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    id: 'sms',
    label: 'SMS',
    description: 'Messages texte automatises',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Reponses email automatiques',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Messages WhatsApp Business',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

export default function ChannelsStep({ channelsData, onChannelsChange, onNext, onBack, onSkip }: ChannelsStepProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleChannel = (channelId: string) => {
    if (channelsData.includes(channelId)) {
      onChannelsChange(channelsData.filter(c => c !== channelId));
    } else {
      onChannelsChange([...channelsData, channelId]);
    }
  };

  const handleSubmit = async () => {
    if (channelsData.length === 0) {
      onSkip();
      return;
    }

    setSaving(true);
    setError('');

    try {
      for (const channelType of channelsData) {
        const response = await fetch(
          buildApiUrl(`/api/v1/channels/${channelType}/enable`),
          {
            method: 'POST',
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          console.warn(`Could not enable channel ${channelType}:`, response.status);
        }
      }
      onNext();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation des canaux');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Canaux de communication</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Selectionnez les canaux que vous souhaitez activer
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map(channel => {
          const isActive = channelsData.includes(channel.id);
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => toggleChannel(channel.id)}
              className={`
                border-2 rounded-xl p-5 text-left transition-all flex items-start gap-4
                ${isActive
                  ? 'border-[#D85A30] bg-orange-50'
                  : 'border-gray-200 hover:border-[#D85A30]'
                }
              `}
            >
              <span className={isActive ? 'text-[#D85A30]' : 'text-gray-500'}>{channel.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isActive ? 'text-[#D85A30]' : 'text-gray-700'}`}>
                    {channel.label}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? 'border-[#D85A30] bg-[#D85A30]' : 'border-gray-300'
                  }`}>
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{channel.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            Passer cette etape
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Activation...' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}
