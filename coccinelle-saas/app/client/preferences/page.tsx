'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  MessageSquare,
  Phone,
  MessageCircle,
  ChevronRight,
  CheckCircle,
  Info,
  ArrowLeft,
  Save
} from 'lucide-react';
import Logo from '@/components/Logo';

type Channel = 'email' | 'sms' | 'whatsapp' | 'phone';

interface ChannelOption {
  id: Channel;
  name: string;
  icon: any;
  description: string;
  benefits: string[];
}

interface Preferences {
  preferredChannel: Channel;
  activeChannels: Channel[];
  timestamp: string;
}

export default function ClientPreferencesPage() {
  const router = useRouter();
  const [preferredChannel, setPreferredChannel] = useState<Channel>('email');
  const [secondaryChannels, setSecondaryChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Charger les préférences au montage du composant
  useEffect(() => {
    const savedPrefs = localStorage.getItem('client_communication_preferences');
    if (savedPrefs) {
      const prefs: Preferences = JSON.parse(savedPrefs);
      setPreferredChannel(prefs.preferredChannel);
      setSecondaryChannels(prefs.activeChannels.filter(ch => ch !== prefs.preferredChannel));
    }
  }, []);

  // Détecter les changements
  useEffect(() => {
    const savedPrefs = localStorage.getItem('client_communication_preferences');
    if (savedPrefs) {
      const prefs: Preferences = JSON.parse(savedPrefs);
      const activeNow = [preferredChannel, ...secondaryChannels];
      const activeSaved = prefs.activeChannels;

      const isDifferent =
        prefs.preferredChannel !== preferredChannel ||
        activeNow.length !== activeSaved.length ||
        activeNow.some(ch => !activeSaved.includes(ch));

      setHasChanges(isDifferent);
    } else {
      setHasChanges(true);
    }
  }, [preferredChannel, secondaryChannels]);

  const handleChannelSelect = (channelId: Channel) => {
    setPreferredChannel(channelId);
  };

  const toggleSecondaryChannel = (channelId: Channel) => {
    if (channelId === preferredChannel) return;

    setSecondaryChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(c => c !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSave = async () => {
    setSaving(true);

    // Simuler un appel API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const preferences: Preferences = {
      preferredChannel,
      activeChannels: [preferredChannel, ...secondaryChannels],
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('client_communication_preferences', JSON.stringify(preferences));

    setSaving(false);
    setSaved(true);
    setHasChanges(false);

    setTimeout(() => setSaved(false), 3000);
  };

  const handleBack = () => {
    router.push('/client/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes préférences de communication</h1>
              <p className="text-sm text-gray-600">Gérez vos canaux de communication</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="space-y-6">
          {/* Message de succès */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">Vos préférences ont été enregistrées avec succès !</p>
            </div>
          )}

          {/* Canal préféré */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Canal de communication préféré</h2>
              <p className="text-sm text-gray-600">
                Sélectionnez votre canal de communication principal. C'est par ce canal que nous vous contacterons en priorité.
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
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-gray-900 bg-gray-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-gray-900' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-700'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{channel.name}</h3>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-6 h-6 text-gray-900" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{channel.description}</p>

                    <ul className="space-y-1">
                      {channel.benefits.slice(0, 2).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canaux secondaires */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Canaux supplémentaires</h2>
              <p className="text-sm text-gray-600">
                Activez d'autres canaux pour recevoir aussi des communications via ces moyens.
              </p>
            </div>

            <div className="space-y-3">
              {channels
                .filter(c => c.id !== preferredChannel)
                .map((channel) => {
                  const Icon = channel.icon;
                  const isActive = secondaryChannels.includes(channel.id);

                  return (
                    <div
                      key={channel.id}
                      className={`bg-white rounded-lg border-2 p-4 transition-all ${
                        isActive ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
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
          </div>

          {/* Résumé des canaux actifs */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">
                  Canal principal : <strong>{channels.find(c => c.id === preferredChannel)?.name}</strong>
                </span>
              </div>
              {secondaryChannels.length > 0 && (
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">
                    {secondaryChannels.length} canal{secondaryChannels.length > 1 ? 'ux' : ''} supplémentaire{secondaryChannels.length > 1 ? 's' : ''} activé{secondaryChannels.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info RGPD */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Respect de votre vie privée</p>
              <p>
                Vos données sont protégées conformément au RGPD. Vous pouvez modifier ces préférences
                à tout moment.
              </p>
            </div>
          </div>

          {/* Bouton Enregistrer */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {hasChanges ? 'Enregistrer les modifications' : 'Aucune modification'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
