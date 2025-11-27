'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle,
  Settings,
  Bell,
  Save,
  Info,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Logo from '@/components/Logo';

interface ChannelConfig {
  channel: 'email' | 'sms' | 'whatsapp' | 'phone';
  name: string;
  iconColor: string;
  enabled: boolean;
  verified: boolean;
  description: string;
  notificationTypes: {
    rdv: boolean;
    promotions: boolean;
    updates: boolean;
    newsletters: boolean;
  };
}

export default function ChannelsConfigPage() {
  const searchParams = useSearchParams();
  const channelParam = searchParams.get('channel');

  const [preferredChannel, setPreferredChannel] = useState<'email' | 'sms' | 'whatsapp' | 'phone'>('email');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction helper pour obtenir l'icône selon le canal
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return Mail;
      case 'sms':
        return MessageSquare;
      case 'whatsapp':
        return MessageSquare;
      case 'phone':
        return Phone;
      default:
        return Mail;
    }
  };

  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      channel: 'email',
      name: 'Email',
      iconColor: 'text-blue-600',
      enabled: true,
      verified: true,
      description: 'Recevez des emails détaillés avec pièces jointes',
      notificationTypes: {
        rdv: true,
        promotions: true,
        updates: true,
        newsletters: true
      }
    },
    {
      channel: 'sms',
      name: 'SMS',
      iconColor: 'text-green-600',
      enabled: true,
      verified: true,
      description: 'Messages texte courts pour les urgences',
      notificationTypes: {
        rdv: true,
        promotions: false,
        updates: true,
        newsletters: false
      }
    },
    {
      channel: 'whatsapp',
      name: 'WhatsApp',
      iconColor: 'text-green-600',
      enabled: true,
      verified: false,
      description: 'Messages instantanés avec médias',
      notificationTypes: {
        rdv: true,
        promotions: true,
        updates: true,
        newsletters: false
      }
    },
    {
      channel: 'phone',
      name: 'Téléphone',
      iconColor: 'text-purple-600',
      enabled: true,
      verified: true,
      description: 'Appels directs pour les urgences uniquement',
      notificationTypes: {
        rdv: true,
        promotions: false,
        updates: false,
        newsletters: false
      }
    }
  ]);

  // Charger les préférences depuis localStorage et URL au montage
  useEffect(() => {
    // Charger depuis localStorage
    const savedPreferredChannel = localStorage.getItem('preferred_channel');
    const savedChannelsConfig = localStorage.getItem('channels_config');

    if (savedPreferredChannel && ['email', 'sms', 'whatsapp', 'phone'].includes(savedPreferredChannel)) {
      setPreferredChannel(savedPreferredChannel as 'email' | 'sms' | 'whatsapp' | 'phone');
    }

    if (savedChannelsConfig) {
      try {
        setChannels(JSON.parse(savedChannelsConfig));
      } catch (e) {
        console.error('Error parsing channels config:', e);
      }
    }

    // Si paramètre URL présent, il a priorité
    if (channelParam && ['email', 'sms', 'whatsapp', 'phone'].includes(channelParam)) {
      setPreferredChannel(channelParam as 'email' | 'sms' | 'whatsapp' | 'phone');
    }
  }, [channelParam]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Sauvegarder dans localStorage
    localStorage.setItem('preferred_channel', preferredChannel);
    localStorage.setItem('channels_config', JSON.stringify(channels));

    // Simuler l'enregistrement API
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSaving(false);
    setSaved(true);

    // Reset le message de succès après 3 secondes
    setTimeout(() => setSaved(false), 3000);

    // TODO: Enregistrer dans la DB via API
    console.log('Channel preferences saved:', {
      preferredChannel,
      channels
    });
  };

  const toggleNotification = (channelIndex: number, notifType: keyof ChannelConfig['notificationTypes']) => {
    const newChannels = [...channels];
    newChannels[channelIndex].notificationTypes[notifType] = !newChannels[channelIndex].notificationTypes[notifType];
    setChannels(newChannels);
  };

  const toggleChannel = (channelIndex: number) => {
    const channel = channels[channelIndex];

    // Empêcher de désactiver le canal préféré
    if (channel.enabled && channel.channel === preferredChannel) {
      setError('Vous ne pouvez pas désactiver votre canal préféré. Sélectionnez d\'abord un autre canal comme préféré.');
      // Reset le message d'erreur après 5 secondes
      setTimeout(() => setError(null), 5000);
      return;
    }

    const newChannels = [...channels];
    newChannels[channelIndex].enabled = !newChannels[channelIndex].enabled;
    setChannels(newChannels);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Canaux de Communication</h1>
              <p className="text-sm text-gray-600">Configurez comment vous souhaitez être contacté</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Message de succès */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Préférences enregistrées avec succès !</p>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Info banner */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">À propos des canaux de communication</p>
            <p>Configurez comment vous souhaitez être contacté. Vous pouvez activer plusieurs canaux et choisir votre canal préféré pour les communications importantes.</p>
          </div>
        </div>

        {/* Canal préféré */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Canal de communication préféré</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Sélectionnez votre canal préféré. Ce canal sera utilisé en priorité pour toutes les communications importantes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => {
              const Icon = getChannelIcon(channel.channel);
              const isPreferred = preferredChannel === channel.channel;

              return (
                <button
                  key={channel.channel}
                  onClick={() => channel.enabled && setPreferredChannel(channel.channel)}
                  disabled={!channel.enabled}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isPreferred
                      ? 'border-red-500 bg-red-50'
                      : channel.enabled
                      ? 'border-gray-200 hover:border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${isPreferred ? 'bg-red-100' : 'bg-gray-100'} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${isPreferred ? 'text-red-600' : channel.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{channel.name}</p>
                        {channel.verified && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Vérifié
                          </div>
                        )}
                      </div>
                    </div>
                    {isPreferred && (
                      <CheckCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{channel.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message conditionnel pour canal voix */}
        {preferredChannel === 'phone' && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Canal voix sélectionné
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Pour le canal voix, configurez <strong>Sara</strong>, votre agent IA vocal qui gère
                  automatiquement vos appels entrants et sortants. Sara peut prendre des rendez-vous,
                  répondre aux questions, et qualifier vos prospects 24/7.
                </p>
                <Link href="/dashboard/sara">
                  <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium">
                    Configurer Sara
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Configuration par canal - Masqué si canal voix */}
        {preferredChannel !== 'phone' && (
        <>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Types de notifications par canal</h2>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Choisissez quels types de messages vous souhaitez recevoir sur chaque canal.
          </p>

          <div className="space-y-6">
            {channels.map((channel, channelIndex) => {
              const Icon = getChannelIcon(channel.channel);

              return (
                <div key={channel.channel} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header du canal */}
                  <div className="bg-gray-50 p-4 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${channel.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{channel.name}</p>
                        {preferredChannel === channel.channel && (
                          <span className="text-xs text-red-600 font-medium">Canal préféré</span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-600">
                        {channel.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={() => toggleChannel(channelIndex)}
                        className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                      />
                    </label>
                  </div>

                  {/* Notifications */}
                  {channel.enabled && (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Rendez-vous</p>
                          <p className="text-xs text-gray-600">Confirmations, rappels et modifications</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={channel.notificationTypes.rdv}
                          onChange={() => toggleNotification(channelIndex, 'rdv')}
                          className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Promotions</p>
                          <p className="text-xs text-gray-600">Offres spéciales et réductions</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={channel.notificationTypes.promotions}
                          onChange={() => toggleNotification(channelIndex, 'promotions')}
                          className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Mises à jour</p>
                          <p className="text-xs text-gray-600">Nouveautés et annonces importantes</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={channel.notificationTypes.updates}
                          onChange={() => toggleNotification(channelIndex, 'updates')}
                          className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">Newsletters</p>
                          <p className="text-xs text-gray-600">Actualités et contenus périodiques</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={channel.notificationTypes.newsletters}
                          onChange={() => toggleNotification(channelIndex, 'newsletters')}
                          className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                const newChannels = channels.map(c => ({
                  ...c,
                  notificationTypes: {
                    rdv: true,
                    promotions: true,
                    updates: true,
                    newsletters: true
                  }
                }));
                setChannels(newChannels);
              }}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Tout activer
            </button>
            <button
              onClick={() => {
                const newChannels = channels.map(c => ({
                  ...c,
                  notificationTypes: {
                    rdv: true,
                    promotions: false,
                    updates: false,
                    newsletters: false
                  }
                }));
                setChannels(newChannels);
              }}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Essentiel uniquement
            </button>
            <button
              onClick={() => {
                const newChannels = channels.map(c => ({
                  ...c,
                  notificationTypes: {
                    rdv: false,
                    promotions: false,
                    updates: false,
                    newsletters: false
                  }
                }));
                setChannels(newChannels);
              }}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Tout désactiver
            </button>
          </div>
        </div>
        </>
        )}

        {/* Boutons d'action */}
        {preferredChannel === 'phone' ? (
          <div className="flex justify-end">
            <Link href="/dashboard/settings">
              <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                Retour aux paramètres
              </button>
            </Link>
          </div>
        ) : (
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/settings">
            <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Annuler
            </button>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
