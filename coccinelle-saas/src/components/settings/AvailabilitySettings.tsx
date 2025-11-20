'use client';

import { useState } from 'react';
import { Clock, Calendar, Plus, X, Save, Users, User } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeekSchedule {
  lundi: DaySchedule;
  mardi: DaySchedule;
  mercredi: DaySchedule;
  jeudi: DaySchedule;
  vendredi: DaySchedule;
  samedi: DaySchedule;
  dimanche: DaySchedule;
}

interface BlockedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'agent';
  hasCalendarSync: boolean;
  calendarProvider?: 'google' | 'outlook' | 'apple' | 'internal';
}

export default function AvailabilitySettings() {
  // Team members
  const [teamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Vous (Manager)',
      email: 'manager@entreprise.com',
      role: 'manager',
      hasCalendarSync: true,
      calendarProvider: 'google'
    },
    {
      id: '2',
      name: 'Sara (Agent IA)',
      email: 'sara@coccinelle.ai',
      role: 'agent',
      hasCalendarSync: true,
      calendarProvider: 'internal'
    },
    {
      id: '3',
      name: 'Agent Commercial 1',
      email: 'agent1@entreprise.com',
      role: 'agent',
      hasCalendarSync: false
    }
  ]);

  const [selectedMemberId, setSelectedMemberId] = useState('1');
  const selectedMember = teamMembers.find(m => m.id === selectedMemberId);

  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(0);
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] = useState(10);

  const [schedule, setSchedule] = useState<WeekSchedule>({
    lundi: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    mardi: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    mercredi: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    jeudi: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    vendredi: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    samedi: { enabled: false, slots: [] },
    dimanche: { enabled: false, slots: [] }
  });

  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([
    { id: '1', startDate: '2025-12-24', endDate: '2025-12-31', reason: 'Vacances de Noël' }
  ]);

  const [newBlockedPeriod, setNewBlockedPeriod] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const days = [
    { key: 'lundi' as keyof WeekSchedule, label: 'Lundi' },
    { key: 'mardi' as keyof WeekSchedule, label: 'Mardi' },
    { key: 'mercredi' as keyof WeekSchedule, label: 'Mercredi' },
    { key: 'jeudi' as keyof WeekSchedule, label: 'Jeudi' },
    { key: 'vendredi' as keyof WeekSchedule, label: 'Vendredi' },
    { key: 'samedi' as keyof WeekSchedule, label: 'Samedi' },
    { key: 'dimanche' as keyof WeekSchedule, label: 'Dimanche' }
  ];

  const toggleDay = (day: keyof WeekSchedule) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: !schedule[day].enabled
      }
    });
  };

  const addTimeSlot = (day: keyof WeekSchedule) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: [...schedule[day].slots, { start: '09:00', end: '17:00' }]
      }
    });
  };

  const removeTimeSlot = (day: keyof WeekSchedule, index: number) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: schedule[day].slots.filter((_, i) => i !== index)
      }
    });
  };

  const updateTimeSlot = (day: keyof WeekSchedule, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...schedule[day].slots];
    newSlots[index][field] = value;
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: newSlots
      }
    });
  };

  const addBlockedPeriod = () => {
    if (newBlockedPeriod.startDate && newBlockedPeriod.endDate && newBlockedPeriod.reason) {
      setBlockedPeriods([
        ...blockedPeriods,
        {
          id: Date.now().toString(),
          ...newBlockedPeriod
        }
      ]);
      setNewBlockedPeriod({ startDate: '', endDate: '', reason: '' });
    }
  };

  const removeBlockedPeriod = (id: string) => {
    setBlockedPeriods(blockedPeriods.filter(p => p.id !== id));
  };

  const handleSave = () => {
    // TODO: Sauvegarder via API
    console.log('Saving availability settings...', {
      appointmentDuration,
      bufferTime,
      maxAppointmentsPerDay,
      schedule,
      blockedPeriods
    });
    alert('Disponibilités sauvegardées !');
  };

  const getCalendarBadge = (member: TeamMember) => {
    if (!member.hasCalendarSync) {
      return <span className="text-xs text-gray-500">Aucun calendrier</span>;
    }

    const providers = {
      google: { name: 'Google', color: 'bg-gray-100 text-gray-700' },
      outlook: { name: 'Outlook', color: 'bg-gray-100 text-gray-700' },
      apple: { name: 'Apple', color: 'bg-gray-100 text-gray-700' },
      internal: { name: 'Coccinelle', color: 'bg-gray-100 text-gray-700' }
    };

    const provider = providers[member.calendarProvider || 'internal'];

    return (
      <span className={`flex items-center gap-1 px-2 py-1 ${provider.color} text-xs font-medium rounded`}>
        {provider.name}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des disponibilités</h2>
        <p className="text-gray-600">
          Configurez les horaires de travail et les disponibilités pour les rendez-vous
        </p>
      </div>

      {/* Sélection du membre de l'équipe */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-700" />
          <h3 className="font-semibold text-gray-900">Configurer les disponibilités pour</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMemberId(member.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedMemberId === member.id
                  ? 'border-gray-900 bg-gray-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold text-gray-900">{member.name}</span>
                </div>
                {selectedMemberId === member.id && (
                  <span className="px-2 py-1 bg-gray-900 text-white text-xs font-bold rounded">
                    Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{member.email}</p>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  member.role === 'manager'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {member.role === 'manager' ? 'Manager' : 'Agent'}
                </span>
                {getCalendarBadge(member)}
              </div>
            </button>
          ))}
        </div>

        {selectedMember && selectedMember.hasCalendarSync && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Info :</span> {selectedMember.name} a synchronisé son calendrier {
                selectedMember.calendarProvider === 'google' ? 'Google' :
                selectedMember.calendarProvider === 'outlook' ? 'Outlook' :
                selectedMember.calendarProvider === 'apple' ? 'Apple' : 'Coccinelle'
              }. Les disponibilités ci-dessous seront combinées avec les événements du calendrier synchronisé.
            </p>
          </div>
        )}
      </div>

      {/* Paramètres généraux */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres généraux</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Durée des RDV
            </label>
            <select
              value={appointmentDuration}
              onChange={(e) => setAppointmentDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              Temps de battement
            </label>
            <select
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Aucun</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Entre chaque RDV</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RDV max/jour
            </label>
            <input
              type="number"
              value={maxAppointmentsPerDay}
              onChange={(e) => setMaxAppointmentsPerDay(Number(e.target.value))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Horaires par jour */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Horaires de travail</h3>

        <div className="space-y-4">
          {days.map(({ key, label }) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={schedule[key].enabled}
                    onChange={() => toggleDay(key)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="font-medium text-gray-900">{label}</span>
                </div>

                {schedule[key].enabled && (
                  <button
                    onClick={() => addTimeSlot(key)}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un créneau
                  </button>
                )}
              </div>

              {schedule[key].enabled && (
                <div className="space-y-2 ml-8">
                  {schedule[key].slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">à</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => removeTimeSlot(key, index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Périodes bloquées (vacances, absences) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Périodes d'absence</h3>

        {/* Liste des périodes bloquées */}
        {blockedPeriods.length > 0 && (
          <div className="space-y-2 mb-4">
            {blockedPeriods.map((period) => (
              <div key={period.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">{period.reason}</p>
                  <p className="text-sm text-gray-600">
                    Du {new Date(period.startDate).toLocaleDateString('fr-FR')} au {new Date(period.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => removeBlockedPeriod(period.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter une nouvelle période */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Ajouter une absence</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date de début</label>
              <input
                type="date"
                value={newBlockedPeriod.startDate}
                onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
              <input
                type="date"
                value={newBlockedPeriod.endDate}
                onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Motif</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBlockedPeriod.reason}
                  onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, reason: e.target.value })}
                  placeholder="Ex: Vacances d'été"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={addBlockedPeriod}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Astuce :</span> Les disponibilités configurées ici s'appliquent à <span className="font-semibold">{selectedMember?.name}</span>. Pour synchroniser un calendrier externe (Google, Outlook, Apple), rendez-vous dans l'onglet "Calendrier & Intégrations".
        </p>
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Save className="w-5 h-5" />
          Enregistrer les disponibilités de {selectedMember?.name}
        </button>
      </div>
    </div>
  );
}
