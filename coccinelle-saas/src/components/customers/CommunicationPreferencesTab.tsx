'use client';

import { useState } from 'react';
import {
  Mail, MessageSquare, Phone, MessageCircle, Bell, Clock,
  MoonStar, CheckCircle, Save, Info
} from 'lucide-react';

interface CommunicationPreferences {
  preferredChannel: 'email' | 'sms' | 'whatsapp' | 'phone';
  emailOptIn: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  phoneOptIn: boolean;
  marketingOptIn: boolean;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  doNotDisturb: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  };
}

interface CommunicationPreferencesTabProps {
  preferences: CommunicationPreferences;
  onSave: (preferences: CommunicationPreferences) => void;
}

export default function CommunicationPreferencesTab({
  preferences,
  onSave
}: CommunicationPreferencesTabProps) {
  const [editedPrefs, setEditedPrefs] = useState<CommunicationPreferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const channels = [
    {
      id: 'email' as const,
      name: 'Email',
      icon: Mail,
      description: 'Notifications par email',
      optInKey: 'emailOptIn' as const
    },
    {
      id: 'sms' as const,
      name: 'SMS',
      icon: MessageCircle,
      description: 'Messages texte courts',
      optInKey: 'smsOptIn' as const
    },
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp',
      icon: MessageSquare,
      description: 'Messages WhatsApp',
      optInKey: 'whatsappOptIn' as const
    },
    {
      id: 'phone' as const,
      name: 'Téléphone',
      icon: Phone,
      description: 'Appels téléphoniques',
      optInKey: 'phoneOptIn' as const
    }
  ];

  const frequencies = [
    { value: 'realtime' as const, label: 'Temps réel', description: 'Recevoir immédiatement' },
    { value: 'daily' as const, label: 'Quotidien', description: 'Un résumé par jour' },
    { value: 'weekly' as const, label: 'Hebdomadaire', description: 'Un résumé par semaine' },
    { value: 'monthly' as const, label: 'Mensuel', description: 'Un résumé par mois' }
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onSave(editedPrefs);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Message de succès */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">Préférences enregistrées avec succès !</p>
        </div>
      )}

      {/* Canal préféré */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Canal de communication préféré</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Le canal préféré sera utilisé en priorité pour contacter ce client.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isPreferred = editedPrefs.preferredChannel === channel.id;

            return (
              <button
                key={channel.id}
                onClick={() => setEditedPrefs({ ...editedPrefs, preferredChannel: channel.id })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isPreferred
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isPreferred ? 'text-gray-900' : 'text-gray-600'}`} />
                    <span className="font-semibold text-gray-900">{channel.name}</span>
                  </div>
                  {isPreferred && <CheckCircle className="w-5 h-5 text-gray-900" />}
                </div>
                <p className="text-xs text-gray-600">{channel.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canaux activés */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Canaux autorisés</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez les canaux par lesquels ce client accepte d'être contacté.
        </p>

        <div className="space-y-3">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const isOptedIn = editedPrefs[channel.optInKey];

            return (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{channel.name}</p>
                    <p className="text-xs text-gray-600">{channel.description}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {isOptedIn ? 'Autorisé' : 'Désactivé'}
                  </span>
                  <input
                    type="checkbox"
                    checked={isOptedIn}
                    onChange={(e) => setEditedPrefs({
                      ...editedPrefs,
                      [channel.optInKey]: e.target.checked
                    })}
                    className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fréquence */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Fréquence des notifications</h3>
        </div>

        <div className="space-y-2">
          {frequencies.map((freq) => (
            <label
              key={freq.value}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                editedPrefs.frequency === freq.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={freq.value}
                checked={editedPrefs.frequency === freq.value}
                onChange={(e) => setEditedPrefs({
                  ...editedPrefs,
                  frequency: e.target.value as CommunicationPreferences['frequency']
                })}
                className="mt-1 w-4 h-4 text-gray-900"
              />
              <div className="flex-1">
                <p className={`font-medium ${editedPrefs.frequency === freq.value ? 'text-white' : 'text-gray-900'}`}>
                  {freq.label}
                </p>
                <p className={`text-xs ${editedPrefs.frequency === freq.value ? 'text-gray-300' : 'text-gray-600'}`}>
                  {freq.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Ne pas déranger */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MoonStar className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Ne pas déranger</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">
              {editedPrefs.doNotDisturb.enabled ? 'Activé' : 'Désactivé'}
            </span>
            <input
              type="checkbox"
              checked={editedPrefs.doNotDisturb.enabled}
              onChange={(e) => setEditedPrefs({
                ...editedPrefs,
                doNotDisturb: {
                  ...editedPrefs.doNotDisturb,
                  enabled: e.target.checked
                }
              })}
              className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
            />
          </label>
        </div>

        {editedPrefs.doNotDisturb.enabled && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Début
              </label>
              <input
                type="time"
                value={editedPrefs.doNotDisturb.startTime || '20:00'}
                onChange={(e) => setEditedPrefs({
                  ...editedPrefs,
                  doNotDisturb: {
                    ...editedPrefs.doNotDisturb,
                    startTime: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fin
              </label>
              <input
                type="time"
                value={editedPrefs.doNotDisturb.endTime || '08:00'}
                onChange={(e) => setEditedPrefs({
                  ...editedPrefs,
                  doNotDisturb: {
                    ...editedPrefs.doNotDisturb,
                    endTime: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Marketing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Communications marketing</h3>
              <p className="text-sm text-gray-600">
                Le client accepte de recevoir des offres promotionnelles et newsletters.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">
              {editedPrefs.marketingOptIn ? 'Accepté' : 'Refusé'}
            </span>
            <input
              type="checkbox"
              checked={editedPrefs.marketingOptIn}
              onChange={(e) => setEditedPrefs({
                ...editedPrefs,
                marketingOptIn: e.target.checked
              })}
              className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
            />
          </label>
        </div>
      </div>

      {/* Bouton Enregistrer */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Enregistrer les préférences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
