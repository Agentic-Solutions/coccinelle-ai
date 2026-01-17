'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Users, Search, Filter, Download, Plus,
  Mail, Phone, MessageSquare, Tag, TrendingUp,
  Calendar, ShoppingBag, Euro, Home, Settings, Upload, X, FileText,
  Edit2, Trash2, Eye
} from 'lucide-react';

// Types adaptés au schéma DB
interface Customer {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  tags: string | null;
  preferred_contact_method: string | null;
  language: string;
  timezone: string;
  total_appointments: number;
  total_conversations: number;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  newThisMonth: number;
  vip: number;
  active: number;
}

interface ApiResponse {
  success: boolean;
  customers?: Customer[];
  customer?: Customer;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
  message?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'active',
    source: '',
    tags: '',
    preferred_contact_method: ''
  });
  const [saving, setSaving] = useState(false);
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    newThisMonth: 0,
    vip: 0,
    active: 0,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Récupérer le token depuis localStorage
  const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  };

  // API URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  // Charger les clients depuis l'API
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        setError('Non authentifié. Veuillez vous connecter.');
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`${API_URL}/api/v1/customers?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setCustomers(data.customers || []);
      
      if (data.pagination) {
        setPagination(data.pagination);
      }

      // Calculer les stats
      const allCustomers = data.customers || [];
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        total: data.pagination?.total || allCustomers.length,
        newThisMonth: allCustomers.filter(c => new Date(c.created_at) >= thisMonth).length,
        vip: allCustomers.filter(c => c.status === 'vip').length,
        active: allCustomers.filter(c => c.status === 'active' || c.status === 'vip').length,
      });

    } catch (err) {
      console.error('Erreur fetch customers:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    fetchCustomers();
  }, [selectedStatus, pagination.offset]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, offset: 0 }));
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Créer un client
  const handleCreate = async () => {
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`${API_URL}/api/v1/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          status: formData.status,
          source: formData.source || null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
          preferred_contact_method: formData.preferred_contact_method || null
        })
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setShowCreateModal(false);
      resetForm();
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // Modifier un client
  const handleUpdate = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`${API_URL}/api/v1/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          status: formData.status,
          source: formData.source || null,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
          preferred_contact_method: formData.preferred_contact_method || null
        })
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la modification');
      }

      setShowEditModal(false);
      setSelectedCustomer(null);
      resetForm();
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un client
  const handleDelete = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`${API_URL}/api/v1/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data: ApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      setShowDeleteModal(false);
      setSelectedCustomer(null);
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', email: '', phone: '',
      status: 'active', source: '', tags: '', preferred_contact_method: ''
    });
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    let tagsStr = '';
    if (customer.tags) {
      try {
        const parsed = JSON.parse(customer.tags);
        tagsStr = Array.isArray(parsed) ? parsed.join(', ') : customer.tags;
      } catch { tagsStr = customer.tags; }
    }
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      status: customer.status || 'active',
      source: customer.source || '',
      tags: tagsStr,
      preferred_contact_method: customer.preferred_contact_method || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      vip: 'bg-purple-100 text-purple-800 border-purple-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      prospect: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badges[status] || badges.active}`}>
        {status}
      </span>
    );
  };

  const handleExport = () => {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Statut', 'Source', 'Créé le'];
    const csvData = customers.map(c => [
      c.first_name || '', c.last_name || '', c.email || '', c.phone || '',
      c.status || '', c.source || '', new Date(c.created_at).toLocaleDateString('fr-FR')
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={fetchCustomers} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-gray-900">Coccinelle.AI</h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Home className="w-5 h-5" /> Dashboard
              </Link>
              <Link href="/dashboard/customers" className="flex items-center gap-2 text-red-600 font-medium">
                <Users className="w-5 h-5" /> Clients
              </Link>
              <Link href="/dashboard/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Settings className="w-5 h-5" /> Paramètres
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-red-600" /> Clients
            </h2>
            <p className="text-gray-600 mt-1">Gérez vos clients et suivez leur activité</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Download className="w-5 h-5" /> Exporter CSV
            </button>
            <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">
              <Plus className="w-5 h-5" /> Nouveau client
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Total clients</p><p className="text-2xl font-bold">{stats.total}</p></div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-6 h-6 text-blue-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Nouveaux ce mois</p><p className="text-2xl font-bold">{stats.newThisMonth}</p></div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Clients VIP</p><p className="text-2xl font-bold">{stats.vip}</p></div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Tag className="w-6 h-6 text-purple-600" /></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-600">Clients actifs</p><p className="text-2xl font-bold">{stats.active}</p></div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-orange-600" /></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({...p, offset: 0})); }}
              className="px-4 py-2 border border-gray-300 rounded-lg">
              <option value="all">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactif</option>
              <option value="prospect">Prospect</option>
            </select>
            <button onClick={fetchCustomers} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <Filter className="w-5 h-5" />}
              Actualiser
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créé le</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Aucun client trouvé</td></tr>
              ) : customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {(customer.first_name?.[0] || '?')}{(customer.last_name?.[0] || '')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{customer.first_name || ''} {customer.last_name || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {customer.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4" />{customer.email}</div>}
                      {customer.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4" />{customer.phone}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(customer.status)}</td>
                  <td className="px-6 py-4"><span className="text-sm text-gray-600">{customer.source || '-'}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />{new Date(customer.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/customers/${customer.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button onClick={() => openEditModal(customer)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDeleteModal(customer)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">Affichage de {customers.length} sur {pagination.total} client(s)</div>
          <div className="flex gap-2">
            <button onClick={() => setPagination(p => ({...p, offset: Math.max(0, p.offset - p.limit)}))} disabled={pagination.offset === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Précédent</button>
            <button onClick={() => setPagination(p => ({...p, offset: p.offset + p.limit}))} disabled={!pagination.hasMore}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Suivant</button>
          </div>
        </div>
      </div>

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="w-6 h-6 text-green-600" />Nouveau client</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData(p => ({...p, first_name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData(p => ({...p, last_name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={formData.status} onChange={(e) => setFormData(p => ({...p, status: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="active">Actif</option><option value="vip">VIP</option>
                  <option value="prospect">Prospect</option><option value="inactive">Inactif</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input type="text" value={formData.source} onChange={(e) => setFormData(p => ({...p, source: e.target.value}))}
                  placeholder="ex: site web, téléphone..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                <input type="text" value={formData.tags} onChange={(e) => setFormData(p => ({...p, tags: e.target.value}))}
                  placeholder="ex: premium, fidèle" className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Plus className="w-4 h-4" />}Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2"><Edit2 className="w-6 h-6 text-blue-600" />Modifier le client</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData(p => ({...p, first_name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData(p => ({...p, last_name: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select value={formData.status} onChange={(e) => setFormData(p => ({...p, status: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="active">Actif</option><option value="vip">VIP</option>
                  <option value="prospect">Prospect</option><option value="inactive">Inactif</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input type="text" value={formData.source} onChange={(e) => setFormData(p => ({...p, source: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                <input type="text" value={formData.tags} onChange={(e) => setFormData(p => ({...p, tags: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Annuler</button>
              <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Edit2 className="w-4 h-4" />}Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2"><Trash2 className="w-6 h-6 text-red-600" />Supprimer le client</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Êtes-vous sûr de vouloir supprimer <strong>{selectedCustomer.first_name} {selectedCustomer.last_name}</strong> ?</p>
              <p className="text-sm text-red-600 mt-2">Cette action est irréversible.</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Annuler</button>
              <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Trash2 className="w-4 h-4" />}Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
