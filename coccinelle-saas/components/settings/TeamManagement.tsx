'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, MapPin, Crown, User, Loader2, Trash2, Edit, ChevronRight } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';

interface TeamMember {
  id: string;
  role_in_team: string;
  user_name: string;
  user_email: string;
  agent_id: string;
  first_name: string;
  last_name: string;
  title: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  location: string;
  manager_name: string;
  member_count: number;
  is_active: number;
}

export default function TeamManagement() {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    setToken(storedToken);
  }, []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '', location: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  // Charger les équipes
  useEffect(() => {
    fetchTeams();
  }, [token]);

  const fetchTeams = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/v1/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les membres d'une équipe
  const fetchMembers = async (teamId: string) => {
    if (!token) return;
    
    try {
      setLoadingMembers(true);
      const res = await fetch(`${API_URL}/api/v1/teams/${teamId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Erreur chargement membres:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Créer une équipe
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTeam.name) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTeam)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNewTeam({ name: '', description: '', location: '' });
        fetchTeams();
      }
    } catch (error) {
      console.error('Erreur création équipe:', error);
    }
  };

  // Sélectionner une équipe
  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    fetchMembers(team.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestion des équipes</h2>
          <p className="text-sm text-gray-600">Organisez vos collaborateurs en équipes</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle équipe
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des équipes */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
            Équipes ({teams.length})
          </h3>
          
          {teams.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune équipe</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedTeam?.id === team.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedTeam?.id === team.id ? 'bg-orange-500' : 'bg-gray-100'
                      }`}>
                        <Users className={`w-5 h-5 ${
                          selectedTeam?.id === team.id ? 'text-white' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{team.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {team.location && (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span>{team.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {team.member_count} membres
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Détails de l'équipe sélectionnée */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTeam.name}</h3>
                  {selectedTeam.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedTeam.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {selectedTeam.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedTeam.location}
                      </span>
                    )}
                    {selectedTeam.manager_name && (
                      <span className="flex items-center gap-1">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        Manager: {selectedTeam.manager_name}
                      </span>
                    )}
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Liste des membres */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Membres de l'équipe</h4>
                  {user?.role === 'admin' && (
                    <button className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  )}
                </div>

                {loadingMembers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun membre dans cette équipe</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                            {(member.first_name?.[0] || member.user_name?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.first_name && member.last_name
                                ? `${member.first_name} ${member.last_name}`
                                : member.user_name || 'Sans nom'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {member.title || member.user_email || 'Pas de titre'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role_in_team === 'manager' && (
                            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                              <Crown className="w-3 h-3" />
                              Manager
                            </span>
                          )}
                          {member.role_in_team === 'member' && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              Membre
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Sélectionnez une équipe</h3>
              <p className="text-gray-500">Cliquez sur une équipe pour voir ses membres</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal création équipe */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Nouvelle équipe</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'équipe *
                </label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Équipe Paris"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Description de l'équipe..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation
                </label>
                <input
                  type="text"
                  value={newTeam.location}
                  onChange={(e) => setNewTeam({ ...newTeam, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Paris 11ème"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
