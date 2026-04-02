'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, CreditCard, Puzzle, Webhook,
  Users, Globe, Save, Loader2, Trash2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// ── Types ────────────────────────────────────────────

interface TenantProfile {
  name: string;
  email: string;
  timezone: string;
  language: string;
}

// ── Composant principal ──────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<TenantProfile>({
    name: '',
    email: '',
    timezone: 'Europe/Paris',
    language: 'fr',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Zone dangereuse
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile({
            name: data.tenant?.name || data.user?.first_name || '',
            email: data.user?.email || '',
            timezone: data.tenant?.timezone || 'Europe/Paris',
            language: data.tenant?.language || 'fr',
          });
        }
      }
    } catch {
      // Utiliser les valeurs par défaut
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/tenants/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Erreur silencieuse
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    if (deleteConfirmation !== 'SUPPRIMER') {
      setDeleteError('Tapez exactement SUPPRIMER pour confirmer');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Le mot de passe est requis');
      return;
    }

    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/auth/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }),
      });

      if (!response.ok) {
        const data = await response.json();
        setDeleteError(data.error || 'Erreur lors de la suppression');
        return;
      }

      localStorage.clear();
      router.push('/login');
    } catch {
      setDeleteError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Titre */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez votre organisation et vos préférences</p>
      </div>

      {/* Grille 3 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* COLONNE 1 : Organisation */}
        <div className="space-y-6">
          {/* Général */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Général</h3>
                <p className="text-xs text-gray-500">Nom, fuseau, langue</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nom de l&apos;organisation
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email principal
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Équipe */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Équipe</h3>
                <p className="text-xs text-gray-500">Membres et rôles</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Gérez les membres de votre équipe depuis la page dédiée.
            </p>
            <button
              onClick={() => router.push('/dashboard/teams')}
              className="mt-3 text-sm font-medium text-gray-900 hover:underline"
            >
              Gérer l&apos;équipe
            </button>
          </div>
        </div>

        {/* COLONNE 2 : Facturation */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Abonnement</h3>
                <p className="text-xs text-gray-500">Plan actuel et factures</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Plan</span>
                <span className="text-sm font-medium text-gray-900">Essai gratuit</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Statut</span>
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">Actif</span>
              </div>
              <button
                onClick={() => router.push('/dashboard/billing')}
                className="w-full mt-2 py-2 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Voir la facturation
              </button>
            </div>
          </div>
        </div>

        {/* COLONNE 3 : Technique */}
        <div className="space-y-6">
          {/* Intégrations */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Intégrations</h3>
                <p className="text-xs text-gray-500">CRM, agenda connectés</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Connectez vos outils pour synchroniser vos données.
            </p>
            <button
              onClick={() => router.push('/dashboard/integrations')}
              className="mt-3 text-sm font-medium text-gray-900 hover:underline"
            >
              Gérer les intégrations
            </button>
          </div>

          {/* Webhooks */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Webhook className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Webhooks</h3>
                <p className="text-xs text-gray-500">Endpoints et événements</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Configurez des webhooks pour recevoir des événements en temps réel.
            </p>
            <p className="mt-3 text-xs text-gray-400">Bientôt disponible</p>
          </div>
        </div>
      </div>

      {/* Paramètres généraux */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres généraux</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Fuseau horaire
            </label>
            <select
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Langue
            </label>
            <select
              value={profile.language}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          {saved && (
            <span className="text-sm text-gray-500">Paramètres sauvegardés</span>
          )}
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Zone dangereuse</h3>
        <p className="text-sm text-gray-600 mb-4">
          Les actions ci-dessous sont irréversibles. Procédez avec prudence.
        </p>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800">Supprimer mon compte</h4>
              <p className="text-sm text-gray-600 mt-0.5">
                Supprime définitivement toutes vos données
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est irréversible. Toutes vos données seront supprimées définitivement.
            </p>

            {deleteError && (
              <div className="rounded-lg bg-gray-100 p-3 border border-gray-200 mb-4">
                <p className="text-sm text-gray-800">{deleteError}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tapez SUPPRIMER pour confirmer
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="SUPPRIMER"
                  disabled={deleteLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Votre mot de passe"
                  disabled={deleteLoading}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDeletePassword('');
                  setDeleteError('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || deleteConfirmation !== 'SUPPRIMER' || !deletePassword}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
