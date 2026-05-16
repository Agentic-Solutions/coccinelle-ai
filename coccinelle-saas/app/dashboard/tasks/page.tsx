'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare, AlertCircle, Clock, CheckCircle, Loader2,
  Phone, Search, X, ArrowRight, FileText,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Task {
  id: string;
  task_type_id: string | null;
  task_type_name: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'high' | 'normal' | 'low';
  assignee_id: string | null;
  assignee_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  source: string;
  kb_response: string | null;
  kb_satisfied: number;
  call_transcript: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  secteur: string | null;
}

interface TaskStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  urgent: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${Math.floor(diffH / 24)}j`;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-orange-100 text-orange-700',
  low: 'bg-green-100 text-green-700',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Haute',
  normal: 'Normale',
  low: 'Basse',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouverte',
  in_progress: 'En cours',
  resolved: 'Résolue',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const [tasksRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/tasks`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/api/v1/tasks/stats`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      if (tasksRes?.tasks) setTasks(tasksRes.tasks);
      if (statsRes?.stats) setStats(statsRes.stats);
    } catch (e) {
      console.error('Error loading tasks', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const updateTask = async (taskId: string, data: { status?: string; assignee_id?: string; assignee_name?: string }) => {
    setUpdating(taskId);
    const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
        method: 'PATCH', headers, body: JSON.stringify(data),
      });
      if (res.ok) {
        await loadData();
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, ...data } as Task : null);
        }
      }
    } catch (e) {
      console.error('Error updating task', e);
    }
    setUpdating(null);
  };

  // Filter tasks
  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (t.contact_name?.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.assignee_name?.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-gray-700" />
          Tâches
        </h1>
        <p className="text-sm text-gray-500 mt-1">Demandes affectées à votre équipe</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: CheckSquare, color: 'text-gray-400' },
          { label: 'Ouvertes', value: stats.open, icon: AlertCircle, color: 'text-blue-500' },
          { label: 'En cours', value: stats.in_progress, icon: Clock, color: 'text-yellow-500' },
          { label: 'Résolues', value: stats.resolved, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Urgentes', value: stats.urgent, icon: AlertCircle, color: 'text-red-500' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">{s.label}</p>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'open', label: 'Ouvertes' },
            { key: 'in_progress', label: 'En cours' },
            { key: 'resolved', label: 'Résolues' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Priority filter */}
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Priorité' },
            { key: 'high', label: 'Haute' },
            { key: 'normal', label: 'Normale' },
            { key: 'low', label: 'Basse' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setPriorityFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                priorityFilter === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Chercher par contact..."
            className="bg-transparent text-sm outline-none text-gray-700 w-full placeholder-gray-400"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Aucune tâche pour le moment</p>
            <p className="text-xs text-gray-400 mt-1">Les tâches sont créées automatiquement par VoixIA lors des appels</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">Priorité</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Contact</div>
              <div className="col-span-2">Assigné</div>
              <div className="col-span-1">Créée</div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-2">Actions</div>
            </div>
            {filtered.map(task => (
              <div
                key={task.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors items-center"
                onClick={() => setSelectedTask(task)}
              >
                {/* Priority */}
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </div>
                {/* Type */}
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{task.task_type_name || 'Général'}</p>
                  {task.secteur && <p className="text-[10px] text-gray-400 capitalize">{task.secteur}</p>}
                </div>
                {/* Contact */}
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-700 flex-shrink-0">
                    {task.contact_name ? getInitials(task.contact_name) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{task.contact_name || 'Inconnu'}</p>
                    <p className="text-[10px] text-gray-500 truncate">{task.contact_phone || ''}</p>
                  </div>
                </div>
                {/* Assignee */}
                <div className="col-span-2 flex items-center gap-2">
                  {task.assignee_name ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0">
                        {getInitials(task.assignee_name)}
                      </div>
                      <span className="text-xs text-gray-700 truncate">{task.assignee_name}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">Non assigné</span>
                  )}
                </div>
                {/* Created */}
                <div className="col-span-1">
                  <span className="text-[11px] text-gray-400">{formatTimeAgo(task.created_at)}</span>
                </div>
                {/* Status */}
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_BADGE[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                  </span>
                </div>
                {/* Actions */}
                <div className="col-span-2 flex gap-1" onClick={e => e.stopPropagation()}>
                  {task.status === 'open' && (
                    <button
                      onClick={() => updateTask(task.id, { status: 'in_progress' })}
                      disabled={updating === task.id}
                      className="px-2 py-1 text-[10px] font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> Prendre
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <button
                      onClick={() => updateTask(task.id, { status: 'resolved' })}
                      disabled={updating === task.id}
                      className="px-2 py-1 text-[10px] font-medium bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Résoudre
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${PRIORITY_BADGE[selectedTask.priority]}`}>
                    {PRIORITY_LABEL[selectedTask.priority]}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_BADGE[selectedTask.status]}`}>
                    {STATUS_LABEL[selectedTask.status]}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{selectedTask.title}</h3>
                {selectedTask.task_type_name && (
                  <p className="text-xs text-gray-500 mt-0.5">{selectedTask.task_type_name}</p>
                )}
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {/* Contact */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Contact</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700">
                    {selectedTask.contact_name ? getInitials(selectedTask.contact_name) : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedTask.contact_name || 'Inconnu'}</p>
                    {selectedTask.contact_phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{selectedTask.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignee */}
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Assigné</p>
                {selectedTask.assignee_name ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center text-[10px] font-medium text-white">
                      {getInitials(selectedTask.assignee_name)}
                    </div>
                    <span className="text-sm text-gray-700">{selectedTask.assignee_name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Non assigné</p>
                )}
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-700">{selectedTask.description}</p>
                </div>
              )}

              {/* KB Response */}
              {selectedTask.kb_response && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                    Réponse fournie à l'appelant
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-800">{selectedTask.kb_response}</p>
                    <p className="text-[10px] text-blue-500 mt-1">
                      {selectedTask.kb_satisfied ? 'Client satisfait' : 'Client insatisfait'}
                    </p>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedTask.call_transcript && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Transcription appel
                  </p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 max-h-40 overflow-auto">
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">{selectedTask.call_transcript}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-2 px-5 py-3 border-t border-gray-200">
              {selectedTask.status === 'open' && (
                <button
                  onClick={() => { updateTask(selectedTask.id, { status: 'in_progress' }); setSelectedTask({ ...selectedTask, status: 'in_progress' }); }}
                  disabled={updating === selectedTask.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" /> Prendre en charge
                </button>
              )}
              {selectedTask.status === 'in_progress' && (
                <button
                  onClick={() => { updateTask(selectedTask.id, { status: 'resolved' }); setSelectedTask({ ...selectedTask, status: 'resolved' }); }}
                  disabled={updating === selectedTask.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Marquer résolu
                </button>
              )}
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
