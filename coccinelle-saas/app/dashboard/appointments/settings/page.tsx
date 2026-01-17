'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Mail, Phone, Settings as SettingsIcon, Save } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function AppointmentsSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // Horaires par défaut
    defaultDuration: 30, // minutes
    bufferTime: 15, // temps entre RDV

    // Horaires d'ouverture
    workingHours: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '18:00' },
      saturday: { enabled: false, start: '09:00', end: '13:00' },
      sunday: { enabled: false, start: '09:00', end: '13:00' }
    },

    // Notifications
    notifications: {
      emailConfirmation: true,
      smsReminder: false,
      reminderTime: 24 // heures avant RDV
    },

    // Limites
    maxDailyAppointments: 12,
    allowSameDayBooking: true,
    advanceBookingDays: 30
  });

  const handleSave = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');

      // Sauvegarder via l'API
      const response = await fetch(`${API_URL}/api/v1/appointments/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      // Backup localStorage
      localStorage.setItem('appointment_settings', JSON.stringify(settings));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Charger les settings au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token');

        // Charger depuis l'API
        const response = await fetch(`${API_URL}/api/v1/appointments/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setSettings(data.settings);
            return;
          }
        }

        // Fallback localStorage
        const saved = localStorage.getItem('appointment_settings');
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback localStorage
        const saved = localStorage.getItem('appointment_settings');
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      }
    };

    loadSettings();
  }, []);

  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Paramètres de Rendez-vous</h1>
          <p className="text-gray-600">
            Configurez les créneaux, horaires d'ouverture et notifications pour vos rendez-vous.
          </p>
        </div>

        {/* Success message */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <span className="text-green-600">✓</span>
            Paramètres sauvegardés avec succès !
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Durée des RDV */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-black" />
              <h2 className="text-xl font-semibold text-black">Durée des rendez-vous</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée par défaut (minutes)
                </label>
                <select
                  value={settings.defaultDuration}
                  onChange={(e) => setSettings({ ...settings, defaultDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2 heures</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps de battement (minutes)
                </label>
                <select
                  value={settings.bufferTime}
                  onChange={(e) => setSettings({ ...settings, bufferTime: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value={0}>Aucun</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Horaires d'ouverture */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-black" />
              <h2 className="text-xl font-semibold text-black">Horaires d'ouverture</h2>
            </div>

            <div className="space-y-3">
              {days.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <label className="flex items-center gap-2 w-32">
                    <input
                      type="checkbox"
                      checked={settings.workingHours[key].enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: {
                          ...settings.workingHours,
                          [key]: { ...settings.workingHours[key], enabled: e.target.checked }
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>

                  {settings.workingHours[key].enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={settings.workingHours[key].start}
                        onChange={(e) => setSettings({
                          ...settings,
                          workingHours: {
                            ...settings.workingHours,
                            [key]: { ...settings.workingHours[key], start: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <span className="text-gray-500">→</span>
                      <input
                        type="time"
                        value={settings.workingHours[key].end}
                        onChange={(e) => setSettings({
                          ...settings,
                          workingHours: {
                            ...settings.workingHours,
                            [key]: { ...settings.workingHours[key], end: e.target.value }
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Fermé</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Notifications */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-black" />
              <h2 className="text-xl font-semibold text-black">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailConfirmation}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailConfirmation: e.target.checked }
                  })}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Email de confirmation</div>
                  <div className="text-sm text-gray-600">Envoyer un email automatique après chaque réservation</div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.notifications.smsReminder}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, smsReminder: e.target.checked }
                  })}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Rappel SMS</div>
                  <div className="text-sm text-gray-600">Envoyer un SMS de rappel avant le rendez-vous</div>
                </div>
              </label>

              {settings.notifications.smsReminder && (
                <div className="ml-7">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Envoyer le rappel :
                  </label>
                  <select
                    value={settings.notifications.reminderTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, reminderTime: parseInt(e.target.value) }
                    })}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={1}>1 heure avant</option>
                    <option value={2}>2 heures avant</option>
                    <option value={6}>6 heures avant</option>
                    <option value={24}>24 heures avant</option>
                    <option value={48}>48 heures avant</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Limites */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-black" />
              <h2 className="text-xl font-semibold text-black">Limites et restrictions</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre maximum de RDV par jour
                </label>
                <input
                  type="number"
                  value={settings.maxDailyAppointments}
                  onChange={(e) => setSettings({ ...settings, maxDailyAppointments: parseInt(e.target.value) })}
                  min={1}
                  max={50}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allowSameDayBooking}
                  onChange={(e) => setSettings({ ...settings, allowSameDayBooking: e.target.checked })}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-gray-900">Autoriser les RDV le jour même</div>
                  <div className="text-sm text-gray-600">Les clients peuvent réserver pour aujourd'hui</div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Réservation à l'avance (jours maximum)
                </label>
                <input
                  type="number"
                  value={settings.advanceBookingDays}
                  onChange={(e) => setSettings({ ...settings, advanceBookingDays: parseInt(e.target.value) })}
                  min={1}
                  max={365}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
