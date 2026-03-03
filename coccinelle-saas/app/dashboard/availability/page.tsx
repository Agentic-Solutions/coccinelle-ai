'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, ChevronDown } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

const SLOT_DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
];

interface DaySlot {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  slot_duration: number;
  modified: boolean;
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [slots, setSlots] = useState<DaySlot[]>(
    DAYS.map(d => ({
      day_of_week: d.value,
      is_available: d.value <= 5,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '12:00',
      break_end: '13:00',
      slot_duration: 30,
      modified: false,
    }))
  );

  const getToken = () => localStorage.getItem('auth_token');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || '');
      } catch {}
    }
    fetchAgents();
    fetchSlots();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchSlots(selectedAgent);
    }
  }, [selectedAgent]);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/agents`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.agents) {
        setAgents(data.agents);
      }
    } catch {}
  };

  const fetchSlots = async (agentId?: string) => {
    setLoading(true);
    try {
      const params = agentId ? `?agent_id=${agentId}` : '';
      const res = await fetch(`${API_URL}/api/v1/availability${params}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && data.slots && data.slots.length > 0) {
        setSlots(prev =>
          prev.map(day => {
            const found = data.slots.find((s: any) => s.day_of_week === day.day_of_week);
            if (found) {
              return {
                day_of_week: found.day_of_week,
                is_available: !!found.is_available,
                start_time: found.start_time || '09:00',
                end_time: found.end_time || '18:00',
                break_start: found.break_start || '12:00',
                break_end: found.break_end || '13:00',
                slot_duration: found.slot_duration || 30,
                modified: false,
              };
            }
            return { ...day, modified: false };
          })
        );
      } else {
        // Reset to defaults if no data
        setSlots(
          DAYS.map(d => ({
            day_of_week: d.value,
            is_available: d.value <= 5,
            start_time: '09:00',
            end_time: '18:00',
            break_start: '12:00',
            break_end: '13:00',
            slot_duration: 30,
            modified: false,
          }))
        );
      }
    } catch {
      showToast('error', 'Erreur lors du chargement des disponibilites');
    } finally {
      setLoading(false);
    }
  };

  const updateSlot = (dayIndex: number, field: keyof DaySlot, value: any) => {
    setSlots(prev =>
      prev.map((s, i) =>
        i === dayIndex ? { ...s, [field]: value, modified: true } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const modifiedSlots = slots.filter(s => s.modified);
      for (const slot of modifiedSlots) {
        await fetch(`${API_URL}/api/v1/availability`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: selectedAgent || undefined,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            break_start: slot.break_start,
            break_end: slot.break_end,
            slot_duration: slot.slot_duration,
            is_available: slot.is_available,
          }),
        });
      }
      setSlots(prev => prev.map(s => ({ ...s, modified: false })));
      showToast('success', 'Disponibilites enregistrees');
    } catch {
      showToast('error', 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const isAdminOrManager = userRole === 'admin' || userRole === 'manager' || userRole === 'owner';
  const hasChanges = slots.some(s => s.modified);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Disponibilites</h1>
              <p className="text-sm text-gray-500">Configurez vos creneaux de disponibilite</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agent selector for admin/manager */}
        {isAdminOrManager && agents.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent
            </label>
            <div className="relative">
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Mes disponibilites</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Weekly schedule */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Planning hebdomadaire</h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {slots.map((slot, index) => {
                  const dayLabel = DAYS.find(d => d.value === slot.day_of_week)?.label || '';
                  return (
                    <div
                      key={slot.day_of_week}
                      className={`p-4 rounded-lg border transition-colors ${
                        slot.is_available
                          ? 'border-blue-200 bg-blue-50/50'
                          : 'border-gray-200 bg-gray-50'
                      } ${slot.modified ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      {/* Day header with toggle */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{dayLabel}</span>
                        <button
                          onClick={() => updateSlot(index, 'is_available', !slot.is_available)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            slot.is_available ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              slot.is_available ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Time inputs - only visible when available */}
                      {slot.is_available && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Debut</label>
                            <input
                              type="time"
                              value={slot.start_time}
                              onChange={(e) => updateSlot(index, 'start_time', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fin</label>
                            <input
                              type="time"
                              value={slot.end_time}
                              onChange={(e) => updateSlot(index, 'end_time', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Pause debut</label>
                            <input
                              type="time"
                              value={slot.break_start}
                              onChange={(e) => updateSlot(index, 'break_start', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Pause fin</label>
                            <input
                              type="time"
                              value={slot.break_end}
                              onChange={(e) => updateSlot(index, 'break_end', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Creneau</label>
                            <select
                              value={slot.slot_duration}
                              onChange={(e) => updateSlot(index, 'slot_duration', Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {SLOT_DURATIONS.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
