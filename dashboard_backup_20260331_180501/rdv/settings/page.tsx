'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Calendar,
  Bell,
  Settings,
  Save,
  CheckCircle,
  Mail,
  MessageSquare,
  Phone
} from 'lucide-react';
import Logo from '@/components/Logo';

interface AvailabilitySlot {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface AppointmentSettings {
  defaultDuration: number; // en minutes
  slotInterval: number; // en minutes
  maxAdvanceBooking: number; // en jours
  minAdvanceBooking: number; // en heures
  availability: AvailabilitySlot[];
  notifications: {
    emailReminder: boolean;
    smsReminder: boolean;
    whatsappReminder: boolean;
    reminderHours: number; // heures avant le RDV
  };
  autoConfirm: boolean;
  requireApproval: boolean;
}

export default function RdvSettingsPage() {
  const [settings, setSettings] = useState<AppointmentSettings>({
    defaultDuration: 30,
    slotInterval: 15,
    maxAdvanceBooking: 30,
    minAdvanceBooking: 2,
    availability: [
      { day: 'Lundi', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Mardi', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Mercredi', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Jeudi', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Vendredi', enabled: true, startTime: '09:00', endTime: '17:00' },
      { day: 'Samedi', enabled: false, startTime: '10:00', endTime: '13:00' },
      { day: 'Dimanche', enabled: false, startTime: '10:00', endTime: '13:00' },
    ],
    notifications: {
      emailReminder: true,
      smsReminder: true,
      whatsappReminder: false,
      reminderHours: 24
    },
    autoConfirm: false,
    requireApproval: true
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    // Simuler l'enregistrement
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSaving(false);
    setSaved(true);

    // Reset le message de succès après 3 secondes
    setTimeout(() => setSaved(false), 3000);

    // TODO: Enregistrer dans la DB via API
    console.log('Settings saved:', settings);
  };

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const newAvailability = [...settings.availability];
    newAvailability[index] = { ...newAvailability[index], [field]: value };
    setSettings({ ...settings, availability: newAvailability });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/rdv">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration des Rendez-vous</h1>
              <p className="text-sm text-gray-600">Personnalisez les paramètres de planification</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Message de succès */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Paramètres enregistrés avec succès !</p>
          </div>
        )}

        {/* Paramètres généraux */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Paramètres généraux</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée par défaut (minutes)
              </label>
              <input
                type="number"
                value={settings.defaultDuration}
                onChange={(e) => setSettings({ ...settings, defaultDuration: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Durée standard d'un rendez-vous</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalle entre créneaux (minutes)
              </label>
              <input
                type="number"
                value={settings.slotInterval}
                onChange={(e) => setSettings({ ...settings, slotInterval: parseInt(e.target.value) })}
                min="5"
                step="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Espacement entre les créneaux proposés</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Réservation maximum à l'avance (jours)
              </label>
              <input
                type="number"
                value={settings.maxAdvanceBooking}
                onChange={(e) => setSettings({ ...settings, maxAdvanceBooking: parseInt(e.target.value) })}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Les clients peuvent réserver jusqu'à X jours à l'avance</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Délai minimum de réservation (heures)
              </label>
              <input
                type="number"
                value={settings.minAdvanceBooking}
                onChange={(e) => setSettings({ ...settings, minAdvanceBooking: parseInt(e.target.value) })}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Les clients doivent réserver au moins X heures à l'avance</p>
            </div>
          </div>
        </div>

        {/* Horaires de disponibilité */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Horaires de disponibilité</h2>
          </div>

          <div className="space-y-3">
            {settings.availability.map((slot, index) => (
              <div key={slot.day} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(e) => updateAvailability(index, 'enabled', e.target.checked)}
                  className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
                />
                <div className="w-24">
                  <span className="font-medium text-gray-900">{slot.day}</span>
                </div>

                {slot.enabled ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateAvailability(index, 'startTime', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <span className="text-gray-500">à</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateAvailability(index, 'endTime', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Indisponible</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications et rappels */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900">Notifications et rappels</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Rappel par email</p>
                  <p className="text-sm text-gray-600">Envoyer un email de rappel aux clients</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.emailReminder}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, emailReminder: e.target.checked }
                })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Rappel par SMS</p>
                  <p className="text-sm text-gray-600">Envoyer un SMS de rappel aux clients</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.smsReminder}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, smsReminder: e.target.checked }
                })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Rappel WhatsApp</p>
                  <p className="text-sm text-gray-600">Envoyer un message WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.whatsappReminder}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, whatsappReminder: e.target.checked }
                })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Envoyer les rappels (heures avant le RDV)
              </label>
              <select
                value={settings.notifications.reminderHours}
                onChange={(e) => setSettings({
                  ...settings,
                  notifications: { ...settings.notifications, reminderHours: parseInt(e.target.value) }
                })}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
              >
                <option value="1">1 heure avant</option>
                <option value="2">2 heures avant</option>
                <option value="4">4 heures avant</option>
                <option value="24">24 heures avant</option>
                <option value="48">48 heures avant</option>
              </select>
            </div>
          </div>
        </div>

        {/* Règles de planification */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Règles de planification</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Confirmation automatique</p>
                <p className="text-sm text-gray-600">Les rendez-vous sont automatiquement confirmés sans validation manuelle</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoConfirm}
                onChange={(e) => setSettings({ ...settings, autoConfirm: e.target.checked })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Approbation requise</p>
                <p className="text-sm text-gray-600">Chaque rendez-vous doit être approuvé manuellement par un agent</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                className="w-5 h-5 text-gray-900 rounded focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Bouton d'enregistrement */}
        <div className="flex justify-end">
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
                Enregistrer les paramètres
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
