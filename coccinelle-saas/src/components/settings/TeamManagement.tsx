'use client';

import { useState } from 'react';
import { UserPlus, Mail, Shield, Calendar, Trash2, CheckCircle, XCircle, Settings } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'agent';
  status: 'active' | 'pending' | 'inactive';
  hasCalendarSync: boolean;
  calendarProvider?: 'google' | 'outlook' | 'apple' | 'internal';
  joinedAt: string;
}

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'Vous (Manager)',
      email: 'manager@entreprise.com',
      role: 'manager',
      status: 'active',
      hasCalendarSync: true,
      calendarProvider: 'google',
      joinedAt: '2025-01-01'
    },
    {
      id: '2',
      name: 'Sara (Agent IA)',
      email: 'sara@coccinelle.ai',
      role: 'agent',
      status: 'active',
      hasCalendarSync: true,
      calendarProvider: 'internal',
      joinedAt: '2025-01-01'
    },
    {
      id: '3',
      name: 'Agent Commercial 1',
      email: 'agent1@entreprise.com',
      role: 'agent',
      status: 'active',
      hasCalendarSync: false,
      joinedAt: '2025-01-15'
    }
  ]);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'agent' | 'manager'>('agent');

  const handleInvite = () => {
    if (inviteEmail) {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        hasCalendarSync: false,
        joinedAt: new Date().toISOString().split('T')[0]
      };
      setMembers([...members, newMember]);
      setInviteEmail('');
      setShowInviteForm(false);
    }
  };

  const toggleMemberStatus = (id: string) => {
    setMembers(members.map(m =>
      m.id === id
        ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' }
        : m
    ));
  };

  const removeMember = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'manager') {
      return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">Manager</span>;
    }
    return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Agent</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
          <CheckCircle className="w-3 h-3" />
          Actif
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
          <Mail className="w-3 h-3" />
          En attente
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
        <XCircle className="w-3 h-3" />
        Inactif
      </span>
    );
  };

  const getCalendarBadge = (member: TeamMember) => {
    if (!member.hasCalendarSync) {
      return <span className="text-xs text-gray-500">Aucun calendrier</span>;
    }

    const providers = {
      google: { name: 'Google', color: 'bg-red-100 text-red-700' },
      outlook: { name: 'Outlook', color: 'bg-blue-100 text-blue-700' },
      apple: { name: 'Apple', color: 'bg-gray-100 text-gray-700' },
      internal: { name: 'Interne', color: 'bg-green-100 text-green-700' }
    };

    const provider = providers[member.calendarProvider || 'internal'];

    return (
      <span className={`flex items-center gap-1 px-2 py-1 ${provider.color} text-xs font-medium rounded`}>
        <Calendar className="w-3 h-3" />
        {provider.name}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion de l'équipe</h2>
        <p className="text-gray-400">
          Gérez les membres de votre équipe et leurs accès à Coccinelle.AI
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Membres totaux</p>
          <p className="text-2xl font-bold text-gray-900">{members.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Actifs</p>
          <p className="text-2xl font-bold text-green-600">{members.filter(m => m.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{members.filter(m => m.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Avec calendrier</p>
          <p className="text-2xl font-bold text-blue-600">{members.filter(m => m.hasCalendarSync).length}</p>
        </div>
      </div>

      {/* Bouton invitation */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Inviter un membre
        </button>
      </div>

      {/* Formulaire d'invitation */}
      {showInviteForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Inviter un nouveau membre</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="agent@entreprise.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'agent' | 'manager')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleInvite}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Envoyer l'invitation
              </button>
              <button
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des membres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Membre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Calendrier</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rejoint le</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(member.role)}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(member.status)}
                </td>
                <td className="px-6 py-4">
                  {getCalendarBadge(member)}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">
                    {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {member.role !== 'manager' && (
                      <>
                        <button
                          onClick={() => toggleMemberStatus(member.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={member.status === 'active' ? 'Désactiver' : 'Activer'}
                        >
                          {member.status === 'active' ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retirer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Paramètres"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Informations */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Astuce :</span> Chaque membre peut configurer son propre calendrier (Google, Outlook, Apple) et ses disponibilités dans l'onglet "Calendrier & Intégrations".
        </p>
      </div>
    </div>
  );
}
