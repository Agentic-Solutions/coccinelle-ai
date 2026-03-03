'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  UserCog,
  X,
  Clock,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ActionToastContainer from '@/src/components/ActionToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  message: string | null;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

const roleBadge: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrateur', color: 'bg-purple-100 text-purple-800' },
  manager: { label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  employee: { label: 'Collaborateur', color: 'bg-gray-100 text-gray-800' }
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'employee', message: '' });
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toasts, success, error: showError, removeToast } = useToast();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setCurrentUserId(u.id);
      }
    } catch {}
    fetchUsers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/users`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setInvitations(data.pending_invitations || []);
      } else {
        showError(data.error || 'Erreur lors du chargement');
      }
    } catch {
      showError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) {
      showError('Veuillez entrer un email');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/users/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (data.success) {
        success('Invitation envoyée avec succès');
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'employee', message: '' });
        fetchUsers();
      } else {
        showError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      showError('Erreur réseau');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        success('Rôle mis à jour');
        fetchUsers();
      } else {
        showError(data.error || 'Erreur');
      }
    } catch {
      showError('Erreur réseau');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`Désactiver le compte de ${userName} ?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        success('Utilisateur désactivé');
        fetchUsers();
      } else {
        showError(data.error || 'Erreur');
      }
    } catch {
      showError('Erreur réseau');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/users/invite/${invitationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        success('Invitation annulée');
        fetchUsers();
      } else {
        showError(data.error || 'Erreur');
      }
    } catch {
      showError('Erreur réseau');
    }
  };

  const handleResendInvitation = async (email: string, role: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/users/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, role })
      });
      const data = await res.json();
      if (data.success) {
        success('Invitation renvoyée');
      } else {
        showError(data.error || 'Erreur lors du renvoi');
      }
    } catch {
      showError('Erreur réseau');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ActionToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/settings">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
                <p className="text-sm text-gray-600">Gérez votre équipe et les invitations</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Inviter un collaborateur</span>
              <span className="sm:hidden">Inviter</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Tableau des utilisateurs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Membres de l'équipe ({users.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {users.map((u) => {
              const badge = roleBadge[u.role] || roleBadge.employee;
              const isSelf = u.id === currentUserId;

              return (
                <div key={u.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-600">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{u.name}</p>
                        {isSelf && (
                          <span className="text-xs text-gray-500">(vous)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>

                    {!u.is_active && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Désactivé
                      </span>
                    )}

                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {formatDate(u.created_at)}
                    </span>

                    {!isSelf && u.is_active ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white"
                        >
                          <option value="admin">Administrateur</option>
                          <option value="manager">Manager</option>
                          <option value="employee">Collaborateur</option>
                        </select>
                        <button
                          onClick={() => handleDeactivate(u.id, u.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Désactiver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        </div>

        {/* Invitations en attente */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Invitations en attente ({invitations.length})
                </h2>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {invitations.map((inv) => {
                const badge = roleBadge[inv.role] || roleBadge.employee;
                const isExpired = new Date(inv.expires_at) < new Date();

                return (
                  <div key={inv.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{inv.email}</p>
                        <p className="text-sm text-gray-500">
                          Expire le {formatDate(inv.expires_at)}
                          {isExpired && <span className="text-red-500 ml-1">(expirée)</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>

                      <button
                        onClick={() => handleResendInvitation(inv.email, inv.role)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        title="Renvoyer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Renvoyer</span>
                      </button>

                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium"
                        title="Annuler"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Annuler</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal d'invitation */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Inviter un collaborateur</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="collaborateur@entreprise.fr"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                >
                  <option value="manager">Manager</option>
                  <option value="employee">Collaborateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optionnel)
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Un message personnalisé pour votre collaborateur..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteForm.email}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {inviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Envoyer l'invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
