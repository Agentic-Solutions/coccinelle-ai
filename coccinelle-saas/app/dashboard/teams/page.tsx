'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Settings, Pencil, Trash2, ArrowLeft, X, Briefcase } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

// ── Types ────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string;
  color: string;
  slot_count: number;
}

interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_available: number;
}

interface MemberService {
  service_id: string;
  name: string;
  duration_minutes: number;
  color: string;
  custom_duration_minutes: number | null;
}

interface AllService {
  id: string;
  name: string;
  duration_minutes: number;
  color: string;
}

// ── Constants ────────────────────────────────────────

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const ROLES = ['Responsable', 'Commercial', 'Assistant', 'Autre'];
const COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#10b981', label: 'Vert' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#6b7280', label: 'Gris' },
];

const HEURES: string[] = [];
for (let h = 0; h < 24; h++) {
  HEURES.push(`${String(h).padStart(2, '0')}:00`);
  HEURES.push(`${String(h).padStart(2, '0')}:30`);
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'Responsable': return 'bg-indigo-50 text-indigo-700';
    case 'Commercial': return 'bg-blue-50 text-blue-700';
    case 'Assistant': return 'bg-amber-50 text-amber-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ── Component ────────────────────────────────────────

export default function TeamsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Commercial');
  const [formColor, setFormColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  // Planning state
  const [planningMember, setPlanningMember] = useState<Member | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [plageForm, setPlageForm] = useState<{ day: number; debut: string; fin: string } | null>(null);
  const [slotSaving, setSlotSaving] = useState(false);

  // Member services state
  const [memberServices, setMemberServices] = useState<MemberService[]>([]);
  const [allServices, setAllServices] = useState<AllService[]>([]);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch members ──────────────────────────────────

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/team/members'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Modal handlers ─────────────────────────────────

  const openAdd = () => {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Commercial');
    setFormColor('#6366f1');
    setShowModal(true);
  };

  const openEdit = (m: Member) => {
    setEditingMember(m);
    setFormName(m.name);
    setFormEmail(m.email || '');
    setFormRole(m.role || 'Commercial');
    setFormColor(m.color || '#6366f1');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body = { name: formName.trim(), email: formEmail.trim() || null, role: formRole, color: formColor };
      if (editingMember) {
        await fetch(buildApiUrl(`/api/v1/team/members/${editingMember.id}`), {
          method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body),
        });
      } else {
        await fetch(buildApiUrl('/api/v1/team/members'), {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      await fetchMembers();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(buildApiUrl(`/api/v1/team/members/${id}`), {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      setDeletingId(null);
      await fetchMembers();
    } catch { /* silent */ }
  };

  // ── Planning handlers ──────────────────────────────

  const openPlanning = async (m: Member) => {
    setPlanningMember(m);
    setSlotsLoading(true);
    try {
      const [slotsRes, servicesRes] = await Promise.all([
        fetch(buildApiUrl(`/api/v1/team/members/${m.id}/slots`), { headers: getAuthHeaders() }),
        fetch(buildApiUrl(`/api/v1/team/members/${m.id}/services`), { headers: getAuthHeaders() }),
      ]);
      if (slotsRes.ok) {
        const data = await slotsRes.json();
        setSlots(data.slots || []);
      }
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setMemberServices(data.services || []);
      }
    } catch { /* silent */ }
    finally { setSlotsLoading(false); }
  };

  const openServicesModal = async () => {
    setShowServicesModal(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/services'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAllServices(data.services || []);
      }
    } catch { /* silent */ }
  };

  const isMemberServiceAssigned = (serviceId: string) => memberServices.some(s => s.service_id === serviceId);

  const toggleMemberService = (svc: AllService) => {
    if (isMemberServiceAssigned(svc.id)) {
      setMemberServices(prev => prev.filter(s => s.service_id !== svc.id));
    } else {
      setMemberServices(prev => [...prev, { service_id: svc.id, name: svc.name, duration_minutes: svc.duration_minutes, color: svc.color, custom_duration_minutes: null }]);
    }
  };

  const handleSaveMemberServices = async () => {
    if (!planningMember) return;
    setServicesSaving(true);
    try {
      await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/services`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          services: memberServices.map(s => ({ service_id: s.service_id, custom_duration_minutes: s.custom_duration_minutes })),
        }),
      });
      setShowServicesModal(false);
    } catch { /* silent */ }
    finally { setServicesSaving(false); }
  };

  const slotsForDay = (day: number) => slots.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleAddPlage = async () => {
    if (!plageForm || !planningMember) return;
    setSlotSaving(true);
    try {
      await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          day_of_week: plageForm.day,
          start_time: plageForm.debut,
          end_time: plageForm.fin,
          duration_minutes: 30,
        }),
      });
      // Refresh slots
      const res = await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
      setPlageForm(null);
    } catch { /* silent */ }
    finally { setSlotSaving(false); }
  };

  const handleClearDaySlots = async (day: number) => {
    if (!planningMember) return;
    // Delete all slots then re-add remaining days
    // Simpler: delete all and re-add all except this day
    const remaining = slots.filter(s => s.day_of_week !== day);
    try {
      await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      // Re-insert remaining by day groups
      const byDay = new Map<number, { start: string; end: string }>();
      for (const s of remaining) {
        const existing = byDay.get(s.day_of_week);
        if (!existing || s.start_time < existing.start) {
          byDay.set(s.day_of_week, { start: s.start_time, end: s.end_time });
        }
        const cur = byDay.get(s.day_of_week)!;
        if (s.end_time > cur.end) cur.end = s.end_time;
      }
      // Group consecutive slots per day to find plages
      const dayGroups = new Map<number, Slot[]>();
      for (const s of remaining) {
        if (!dayGroups.has(s.day_of_week)) dayGroups.set(s.day_of_week, []);
        dayGroups.get(s.day_of_week)!.push(s);
      }
      for (const [d, daySlots] of dayGroups) {
        daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
        // Find contiguous plages
        let plStart = daySlots[0].start_time;
        let plEnd = daySlots[0].end_time;
        for (let i = 1; i < daySlots.length; i++) {
          if (daySlots[i].start_time === plEnd) {
            plEnd = daySlots[i].end_time;
          } else {
            await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), {
              method: 'POST', headers: getAuthHeaders(),
              body: JSON.stringify({ day_of_week: d, start_time: plStart, end_time: plEnd, duration_minutes: 30 }),
            });
            plStart = daySlots[i].start_time;
            plEnd = daySlots[i].end_time;
          }
        }
        await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), {
          method: 'POST', headers: getAuthHeaders(),
          body: JSON.stringify({ day_of_week: d, start_time: plStart, end_time: plEnd, duration_minutes: 30 }),
        });
      }
      // Refresh
      const res = await fetch(buildApiUrl(`/api/v1/team/members/${planningMember.id}/slots`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch { /* silent */ }
  };

  const handleSavePlanning = async () => {
    // Planning is saved slot by slot, show confirmation
    setPlanningMember(null);
    await fetchMembers();
  };

  // ── PLANNING VIEW ──────────────────────────────────

  if (planningMember) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setPlanningMember(null); fetchMembers(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: planningMember.color }}
            >
              {getInitials(planningMember.name)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{planningMember.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeClass(planningMember.role)}`}>
                {planningMember.role}
              </span>
            </div>
          </div>
        </div>

        {/* Planning grid */}
        {slotsLoading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Planning hebdomadaire</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {JOURS.map((jour, i) => {
                  const dayNum = i + 1;
                  const daySlots = slotsForDay(dayNum);
                  return (
                    <div key={jour} className="bg-gray-50 rounded-lg p-3 min-h-[120px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{JOURS_FULL[i]}</span>
                        {daySlots.length > 0 && (
                          <button
                            onClick={() => handleClearDaySlots(dayNum)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer les plages"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Chips */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {daySlots.map(s => (
                          <span
                            key={s.id}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium"
                            title={`${s.start_time} - ${s.end_time}`}
                          >
                            {s.start_time}
                          </span>
                        ))}
                      </div>
                      {/* Add plage */}
                      {plageForm?.day === dayNum ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-xs">
                            <select
                              value={plageForm.debut}
                              onChange={e => setPlageForm({ ...plageForm, debut: e.target.value })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                            >
                              {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <span className="text-gray-400">-</span>
                            <select
                              value={plageForm.fin}
                              onChange={e => setPlageForm({ ...plageForm, fin: e.target.value })}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-xs"
                            >
                              {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={handleAddPlage}
                              disabled={slotSaving}
                              className="flex-1 text-[10px] py-1 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                            >
                              {slotSaving ? '...' : 'OK'}
                            </button>
                            <button
                              onClick={() => setPlageForm(null)}
                              className="flex-1 text-[10px] py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlageForm({ day: dayNum, debut: '09:00', fin: '12:00' })}
                          className="text-xs text-gray-500 hover:text-gray-900 font-medium"
                        >
                          + Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {slots.length} {slots.length > 1 ? 'creneaux disponibles' : 'creneau disponible'} cette semaine
              </p>
              <button
                onClick={handleSavePlanning}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Retour a la liste
              </button>
            </div>
          </div>
        )}

        {/* Section Prestations proposees */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" />
                Prestations proposees
              </h3>
              <button
                onClick={openServicesModal}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Gerer
              </button>
            </div>
            {memberServices.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune prestation assignee a ce membre.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {memberServices.map(s => (
                  <span
                    key={s.service_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-700"
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                    <span className="text-gray-400 text-xs ml-1">{s.custom_duration_minutes || s.duration_minutes} min</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Prestations */}
        {showServicesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">Prestations de {planningMember.name}</h3>
                <button onClick={() => setShowServicesModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-2">
                {allServices.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Aucune prestation configuree. Creez-en depuis la page Prestations.</p>
                ) : allServices.map(svc => {
                  const assigned = isMemberServiceAssigned(svc.id);
                  return (
                    <div key={svc.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${assigned ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => toggleMemberService(svc)}>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                      <span className="text-sm font-medium text-gray-900 flex-1">{svc.name}</span>
                      <span className="text-xs text-gray-400">{svc.duration_minutes} min</span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${assigned ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                        {assigned && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-5 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                <button onClick={() => setShowServicesModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">Annuler</button>
                <button
                  onClick={handleSaveMemberServices}
                  disabled={servicesSaving}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {servicesSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
          <p className="text-gray-500 text-sm mt-1">Gerez vos interlocuteurs et leurs plannings</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter un membre
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : members.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-xl border border-gray-200 py-16 px-8 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun membre dans votre equipe</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Ajoutez vos collaborateurs pour que l&apos;agent propose des rendez-vous avec la bonne personne
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter un membre
          </button>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Membre</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Creneaux/sem</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: m.color }}
                        >
                          {getInitials(m.name)}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadgeClass(m.role)}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{m.email || '-'}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 hidden md:table-cell">{m.slot_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openPlanning(m)}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Planning"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deletingId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(m.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ajouter/Modifier */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMember ? 'Modifier le membre' : 'Ajouter un membre'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom et Nom *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex : Marie Dupont"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                  autoFocus
                />
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="marie@entreprise.fr"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                />
              </div>
              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formColor === c.value ? 'border-gray-900 scale-110' : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
