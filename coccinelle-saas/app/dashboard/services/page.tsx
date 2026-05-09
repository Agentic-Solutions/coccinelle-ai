'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Briefcase, Plus, Pencil, Trash2, Users, X, Tag } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

// ── Types ────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string;
  category: string | null;
  agent_count: number;
}

interface Member {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  color: string;
  role: string;
}

interface AssignedAgent {
  agent_id: string;
  name: string;
  color: string;
  custom_duration_minutes: number | null;
}

// ── Constants ────────────────────────────────────────

const COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#6b7280',
];

const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180, 240];

function getInitials(name: string): string {
  return name.split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ── Component ────────────────────────────────────────

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal edit/create
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formPrice, setFormPrice] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  // Modal assign members
  const [assignService, setAssignService] = useState<Service | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<AssignedAgent[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/v1/services'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Modal create/edit handlers ─────────────────────

  const openAdd = () => {
    setEditingService(null);
    setFormName('');
    setFormDescription('');
    setFormDuration(30);
    setFormPrice('');
    setFormColor('#6366f1');
    setShowModal(true);
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setFormName(s.name);
    setFormDescription(s.description || '');
    setFormDuration(s.duration_minutes);
    setFormPrice(s.price ? String(s.price) : '');
    setFormColor(s.color || '#6366f1');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        duration_minutes: formDuration,
        price: formPrice ? Number(formPrice) : null,
        color: formColor,
      };
      if (editingService) {
        await fetch(buildApiUrl(`/api/v1/services/${editingService.id}`), {
          method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body),
        });
      } else {
        await fetch(buildApiUrl('/api/v1/services'), {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
        });
      }
      setShowModal(false);
      await fetchServices();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(buildApiUrl(`/api/v1/services/${id}`), {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      setDeletingId(null);
      await fetchServices();
    } catch { /* silent */ }
  };

  // ── Modal assign members ───────────────────────────

  const openAssign = async (s: Service) => {
    setAssignService(s);
    setAssignLoading(true);
    try {
      const [membersRes, agentsRes] = await Promise.all([
        fetch(buildApiUrl('/api/v1/team/members'), { headers: getAuthHeaders() }),
        fetch(buildApiUrl(`/api/v1/services/${s.id}/agents`), { headers: getAuthHeaders() }),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setAllMembers(data.members || []);
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAssignedAgents((data.agents || []).map((a: { agent_id: string; name: string; color: string; custom_duration_minutes: number | null }) => ({
          agent_id: a.agent_id,
          name: a.name,
          color: a.color,
          custom_duration_minutes: a.custom_duration_minutes,
        })));
      }
    } catch { /* silent */ }
    finally { setAssignLoading(false); }
  };

  const isAgentAssigned = (agentId: string) => assignedAgents.some(a => a.agent_id === agentId);

  const toggleAgent = (m: Member) => {
    if (isAgentAssigned(m.id)) {
      setAssignedAgents(prev => prev.filter(a => a.agent_id !== m.id));
    } else {
      setAssignedAgents(prev => [...prev, { agent_id: m.id, name: m.name, color: m.color, custom_duration_minutes: null }]);
    }
  };

  const setCustomDuration = (agentId: string, value: number | null) => {
    setAssignedAgents(prev => prev.map(a => a.agent_id === agentId ? { ...a, custom_duration_minutes: value } : a));
  };

  const handleSaveAssign = async () => {
    if (!assignService) return;
    setAssignSaving(true);
    try {
      await fetch(buildApiUrl(`/api/v1/services/${assignService.id}/agents`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          agents: assignedAgents.map(a => ({ agent_id: a.agent_id, custom_duration_minutes: a.custom_duration_minutes })),
        }),
      });
      setAssignService(null);
      await fetchServices();
    } catch { /* silent */ }
    finally { setAssignSaving(false); }
  };

  // ── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prestations</h1>
          <p className="text-gray-500 text-sm mt-1">Gerez vos services et assignez-les aux membres de l&apos;equipe</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 px-8 text-center">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune prestation configuree</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Creez vos prestations pour que l&apos;agent vocal propose le bon creneau avec la bonne duree
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter une prestation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
              style={{ borderLeftWidth: '4px', borderLeftColor: s.color }}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{s.name}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openAssign(s)}
                      className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Assigner des membres"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(s.id)} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded">OK</button>
                        <button onClick={() => setDeletingId(null)} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Non</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(s.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {s.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {s.duration_minutes} min
                  </span>
                  {s.price && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      {s.price} euros
                    </span>
                  )}
                </div>

                {/* Agents avatars */}
                {s.agent_count > 0 && (
                  <div className="mt-3 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">{s.agent_count} membre{s.agent_count > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal create/edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex : Consultation decouverte"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Courte description de la prestation"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duree</label>
                  <select
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                  >
                    {DURATIONS.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (euros)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                    placeholder="Optionnel"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
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

      {/* Modal assign members */}
      {assignService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Assigner des membres</h3>
                <p className="text-xs text-gray-500 mt-0.5">{assignService.name} - {assignService.duration_minutes} min</p>
              </div>
              <button onClick={() => setAssignService(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              {assignLoading ? (
                <div className="text-center py-8 text-gray-400">Chargement...</div>
              ) : allMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun membre dans votre equipe. Ajoutez-en depuis la page Equipe.</p>
              ) : (
                <div className="space-y-3">
                  {allMembers.map(m => {
                    const assigned = isAgentAssigned(m.id);
                    const agentData = assignedAgents.find(a => a.agent_id === m.id);
                    return (
                      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${assigned ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <button
                          onClick={() => toggleAgent(m)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            assigned ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                          }`}
                        >
                          {assigned && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: m.color }}
                        >
                          {getInitials(m.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">{m.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{m.role}</span>
                        </div>
                        {assigned && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <label className="text-[10px] text-gray-500">Duree :</label>
                            <select
                              value={agentData?.custom_duration_minutes || ''}
                              onChange={e => setCustomDuration(m.id, e.target.value ? Number(e.target.value) : null)}
                              className="text-xs px-1.5 py-1 border border-gray-300 rounded"
                            >
                              <option value="">Par defaut</option>
                              {DURATIONS.map(d => (
                                <option key={d} value={d}>{d} min</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <span className="text-xs text-gray-500">{assignedAgents.length} membre{assignedAgents.length > 1 ? 's' : ''} assigne{assignedAgents.length > 1 ? 's' : ''}</span>
              <div className="flex gap-3">
                <button onClick={() => setAssignService(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
                  Annuler
                </button>
                <button
                  onClick={handleSaveAssign}
                  disabled={assignSaving}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {assignSaving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
