'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Building2, CreditCard, Bell,
  Save, Loader2, Trash2, Eye, EyeOff,
  ChevronDown, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { SECTORS } from '@/lib/sectors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// ── Types ──────────────────────────────────────────────────

interface AccountData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_verified: number;
}

interface CompanyData {
  name: string;
  sector: string;
  address: string;
  phone: string;
  email_pro: string;
  horaires: HorairesData | null;
}

interface HorairesData {
  days: Record<string, boolean>;
  start: string;
  end: string;
}

interface NotificationPrefs {
  email_after_call: number;
  sms_reminder_j1: number;
  weekly_summary: number;
  quota_alerts: number;
}

interface UsageData {
  minutes_used: number;
  minutes_included: number;
  sms_used: number;
  sms_included: number;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

const DAYS = [
  { key: 'lun', label: 'Lun' },
  { key: 'mar', label: 'Mar' },
  { key: 'mer', label: 'Mer' },
  { key: 'jeu', label: 'Jeu' },
  { key: 'ven', label: 'Ven' },
  { key: 'sam', label: 'Sam' },
  { key: 'dim', label: 'Dim' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return [`${h}:00`, `${h}:30`];
}).flat();

const DEFAULT_HORAIRES: HorairesData = {
  days: { lun: true, mar: true, mer: true, jeu: true, ven: true, sam: false, dim: false },
  start: '09:00',
  end: '18:00',
};

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    trial: 'Essai gratuit',
    essentiel: 'Essentiel',
    starter: 'Essentiel',
    pro: 'Pro',
    business: 'Business',
  };
  return labels[plan] || plan;
}

function getStatusBadge(status: string): { label: string; className: string } {
  const badges: Record<string, { label: string; className: string }> = {
    trial: { label: 'Essai', className: 'bg-gray-100 text-gray-700' },
    active: { label: 'Actif', className: 'bg-gray-900 text-white' },
    past_due: { label: 'Impaye', className: 'bg-gray-200 text-gray-800' },
    canceled: { label: 'Annule', className: 'bg-gray-200 text-gray-600' },
    expired: { label: 'Expire', className: 'bg-gray-200 text-gray-600' },
  };
  return badges[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
}

// ── Toggle Component ──────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        enabled ? 'bg-gray-900' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Tab definitions ──────────────────────────────────────────

const TABS = [
  { id: 'account', label: 'Mon compte', icon: User },
  { id: 'company', label: 'Mon entreprise', icon: Building2 },
  { id: 'subscription', label: 'Abonnement', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Composant principal ──────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Account
  const [account, setAccount] = useState<AccountData>({
    first_name: '', last_name: '', email: '', phone: '', phone_verified: 0,
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Company
  const [company, setCompany] = useState<CompanyData>({
    name: '', sector: '', address: '', phone: '', email_pro: '',
    horaires: DEFAULT_HORAIRES,
  });

  // Notifications
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    email_after_call: 1, sms_reminder_j1: 1, weekly_summary: 1, quota_alerts: 1,
  });

  // Usage / Subscription
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Load settings ──────────────────────────────────────

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAccount(data.account || {
            first_name: '', last_name: '', email: '', phone: '', phone_verified: 0,
          });
          setCompany({
            name: data.company?.name || '',
            sector: data.company?.sector || '',
            address: data.company?.address || '',
            phone: data.company?.phone || '',
            email_pro: data.company?.email_pro || '',
            horaires: data.company?.horaires || DEFAULT_HORAIRES,
          });
          setNotifications(data.notifications || {
            email_after_call: 1, sms_reminder_j1: 1, weekly_summary: 1, quota_alerts: 1,
          });
        }
      }
    } catch {
      // Graceful degradation — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/settings/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsage(data.usage);
        }
      }
    } catch {
      // Graceful degradation
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (activeTab === 'subscription') {
      loadUsage();
    }
  }, [activeTab, loadUsage]);

  // ── Save handlers ──────────────────────────────────────

  const handleSaveAccount = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    // Validate password match
    if (showPasswordSection && newPassword) {
      if (newPassword !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        setSaving(false);
        return;
      }
      if (!currentPassword) {
        setError('Le mot de passe actuel est requis');
        setSaving(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const body: Record<string, string> = {
        first_name: account.first_name,
        last_name: account.last_name,
      };

      if (showPasswordSection && newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }

      const res = await fetch(`${API_URL}/api/v1/settings/account`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSaved(true);
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/settings/company`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(company),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/settings/notifications`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(notifications),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la sauvegarde');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Erreur reseau. Verifiez votre connexion.');
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
      setDeleteError('Erreur reseau. Verifiez votre connexion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Loading state ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        <p className="text-sm text-gray-500 mt-1">Gerez votre compte, votre entreprise et vos preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setSaved(false);
                }}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error / Success message */}
      {error && (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm text-gray-800">{error}</p>
        </div>
      )}
      {saved && (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm text-gray-700">Parametres sauvegardes avec succes</p>
        </div>
      )}

      {/* ──────────── TAB 1 : Mon compte ──────────── */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Identite */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                <input
                  type="text"
                  value={account.first_name}
                  onChange={(e) => setAccount({ ...account, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Votre prenom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text"
                  value={account.last_name}
                  onChange={(e) => setAccount({ ...account, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={account.email}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">L&apos;email ne peut pas etre modifie</p>
            </div>
          </div>

          {/* Mot de passe */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="text-base font-semibold text-gray-900">Modifier le mot de passe</h3>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} />
            </button>

            {showPasswordSection && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none pr-10"
                      placeholder="Votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none pr-10"
                      placeholder="Minimum 8 caracteres, 1 majuscule, 1 chiffre"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Retapez le nouveau mot de passe"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-gray-500 mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAccount}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>

          {/* Zone dangereuse */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mt-8">
            <h3 className="text-base font-semibold text-red-600 mb-2">Zone dangereuse</h3>
            <p className="text-sm text-gray-600 mb-4">
              Les actions ci-dessous sont irreversibles. Procedez avec prudence.
            </p>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-800">Supprimer mon compte</h4>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Supprime definitivement toutes vos donnees
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
        </div>
      )}

      {/* ──────────── TAB 2 : Mon entreprise ──────────── */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Informations de l&apos;entreprise</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;entreprise</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Nom de votre entreprise"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d&apos;activite</label>
                <div className="relative">
                  <select
                    value={company.sector}
                    onChange={(e) => setCompany({ ...company, sector: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    <option value="">Selectionnez un secteur</option>
                    {SECTORS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                  placeholder="Adresse de l'entreprise"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telephone professionnel</label>
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
                  <input
                    type="email"
                    value={company.email_pro}
                    onChange={(e) => setCompany({ ...company, email_pro: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="contact@entreprise.fr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Horaires d&apos;ouverture</h3>

            {/* Jours */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Jours ouvres</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const isActive = company.horaires?.days?.[day.key] ?? false;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        const currentHoraires = company.horaires || DEFAULT_HORAIRES;
                        setCompany({
                          ...company,
                          horaires: {
                            ...currentHoraires,
                            days: {
                              ...currentHoraires.days,
                              [day.key]: !isActive,
                            },
                          },
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heures */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ouverture</label>
                <div className="relative">
                  <select
                    value={company.horaires?.start || '09:00'}
                    onChange={(e) => {
                      const currentHoraires = company.horaires || DEFAULT_HORAIRES;
                      setCompany({
                        ...company,
                        horaires: { ...currentHoraires, start: e.target.value },
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fermeture</label>
                <div className="relative">
                  <select
                    value={company.horaires?.end || '18:00'}
                    onChange={(e) => {
                      const currentHoraires = company.horaires || DEFAULT_HORAIRES;
                      setCompany({
                        ...company,
                        horaires: { ...currentHoraires, end: e.target.value },
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none appearance-none bg-white"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveCompany}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ──────────── TAB 3 : Abonnement ──────────── */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {usageLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Plan actuel */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Plan actuel</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-bold text-gray-900">
                    {getPlanLabel(usage?.plan || 'trial')}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(usage?.status || 'trial').className}`}>
                    {getStatusBadge(usage?.status || 'trial').label}
                  </span>
                </div>

                {usage?.status === 'trial' && usage.trial_ends_at && (
                  <p className="text-sm text-gray-500 mb-4">
                    Essai gratuit jusqu&apos;au{' '}
                    {new Date(usage.trial_ends_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}

                {usage?.current_period_end && usage.status === 'active' && (
                  <p className="text-sm text-gray-500 mb-4">
                    Prochain renouvellement le{' '}
                    {new Date(usage.current_period_end).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* Usage */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Utilisation ce mois</h3>
                <div className="space-y-5">
                  {/* Minutes vocales */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Minutes vocales</span>
                      <span className="text-sm text-gray-500">
                        {usage?.minutes_used || 0} / {usage?.minutes_included || 0} min
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            ((usage?.minutes_used || 0) / Math.max(usage?.minutes_included || 1, 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    {(usage?.minutes_used || 0) > (usage?.minutes_included || 0) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Depassement de {(usage?.minutes_used || 0) - (usage?.minutes_included || 0)} minutes
                      </p>
                    )}
                  </div>

                  {/* SMS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">SMS envoyes</span>
                      <span className="text-sm text-gray-500">
                        {usage?.sms_used || 0} / {usage?.sms_included || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            ((usage?.sms_used || 0) / Math.max(usage?.sms_included || 1, 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    {usage?.sms_included === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        SMS non inclus dans votre plan actuel
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Gestion</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/dashboard/billing/upgrade"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Changer de plan
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Gerer la facturation
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ──────────── TAB 4 : Notifications ──────────── */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-6">Preferences de notifications</h3>
            <div className="space-y-6">
              {/* Email recap */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email recapitulatif apres chaque appel</p>
                  <p className="text-xs text-gray-500 mt-0.5">Recevez un resume par email a la fin de chaque appel traite par l&apos;assistant</p>
                </div>
                <Toggle
                  enabled={!!notifications.email_after_call}
                  onChange={(v) => setNotifications({ ...notifications, email_after_call: v ? 1 : 0 })}
                />
              </div>

              <div className="border-t border-gray-100" />

              {/* SMS rappel J-1 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">SMS rappel J-1 active</p>
                  <p className="text-xs text-gray-500 mt-0.5">Envoi automatique d&apos;un SMS de rappel 24h avant chaque rendez-vous</p>
                </div>
                <Toggle
                  enabled={!!notifications.sms_reminder_j1}
                  onChange={(v) => setNotifications({ ...notifications, sms_reminder_j1: v ? 1 : 0 })}
                />
              </div>

              <div className="border-t border-gray-100" />

              {/* Weekly summary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Resume hebdomadaire par email</p>
                  <p className="text-xs text-gray-500 mt-0.5">Un bilan chaque lundi avec vos statistiques de la semaine</p>
                </div>
                <Toggle
                  enabled={!!notifications.weekly_summary}
                  onChange={(v) => setNotifications({ ...notifications, weekly_summary: v ? 1 : 0 })}
                />
              </div>

              <div className="border-t border-gray-100" />

              {/* Quota alerts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Alertes depassement quota</p>
                  <p className="text-xs text-gray-500 mt-0.5">Soyez prevenu quand vous approchez de votre limite de minutes ou SMS</p>
                </div>
                <Toggle
                  enabled={!!notifications.quota_alerts}
                  onChange={(v) => setNotifications({ ...notifications, quota_alerts: v ? 1 : 0 })}
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveNotifications}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* ──────────── Modal suppression ──────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est irreversible. Toutes vos donnees seront supprimees definitivement.
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
                {deleteLoading ? 'Suppression...' : 'Supprimer definitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
