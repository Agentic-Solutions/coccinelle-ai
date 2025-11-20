'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function NotificationsSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    emailNewProspect: true,
    emailNewAppointment: true,
    emailMissedCall: true,
    smsNewProspect: false,
    smsNewAppointment: true,
    smsMissedCall: false,
    webhookEnabled: false,
    webhookUrl: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/settings/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/settings/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage('✅ Paramètres enregistrés avec succès');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(`❌ Erreur: ${error.message}`);
      }
    } catch (error) {
      setMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
        <p className="text-gray-400">Configurez vos préférences de notifications</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📧</span> Notifications Email
          </h3>
          <div className="space-y-4">
            <ToggleItem
              label="Nouveau prospect"
              description="Recevoir un email à chaque nouveau prospect"
              checked={settings.emailNewProspect}
              onChange={() => handleToggle('emailNewProspect')}
            />
            <ToggleItem
              label="Nouveau rendez-vous"
              description="Recevoir un email à chaque prise de rendez-vous"
              checked={settings.emailNewAppointment}
              onChange={() => handleToggle('emailNewAppointment')}
            />
            <ToggleItem
              label="Appel manqué"
              description="Recevoir un email en cas d'appel manqué"
              checked={settings.emailMissedCall}
              onChange={() => handleToggle('emailMissedCall')}
            />
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💬</span> Notifications SMS
          </h3>
          <div className="space-y-4">
            <ToggleItem
              label="Nouveau prospect"
              description="Recevoir un SMS à chaque nouveau prospect"
              checked={settings.smsNewProspect}
              onChange={() => handleToggle('smsNewProspect')}
            />
            <ToggleItem
              label="Nouveau rendez-vous"
              description="Recevoir un SMS à chaque prise de rendez-vous"
              checked={settings.smsNewAppointment}
              onChange={() => handleToggle('smsNewAppointment')}
            />
            <ToggleItem
              label="Appel manqué"
              description="Recevoir un SMS en cas d'appel manqué"
              checked={settings.smsMissedCall}
              onChange={() => handleToggle('smsMissedCall')}
            />
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔗</span> Webhooks
          </h3>
          <ToggleItem
            label="Activer les webhooks"
            description="Envoyer des événements vers une URL externe"
            checked={settings.webhookEnabled}
            onChange={() => handleToggle('webhookEnabled')}
          />
          {settings.webhookEnabled && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL du webhook
              </label>
              <input
                type="url"
                name="webhookUrl"
                value={settings.webhookUrl}
                onChange={handleInputChange}
                placeholder="https://votre-api.com/webhook"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Les événements seront envoyés en POST à cette URL
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer les préférences'}
        </button>
      </div>
    </form>
  );
}

function ToggleItem({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
      <div>
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-white' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
