'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Users, Search, Download, Plus, ArrowLeft,
  Mail, Phone, MessageSquare, Tag, TrendingUp,
  Calendar, Euro, Upload, X, FileText, RefreshCw, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ActionToastContainer from '@/components/ActionToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

// Types
interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredChannel?: 'email' | 'sms' | 'whatsapp' | 'phone';
  segment?: string;
  tags?: string[];
  totalOrders: number;
  totalSpent: { amount: number; currency: string };
  createdAt: Date;
  lastOrderAt?: Date;
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
}

interface Stats {
  total: number;
  newThisMonth: number;
  qualified: number;
  converted: number;
}

export default function ProspectsPage() {
  const toast = useToast();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    newThisMonth: 0,
    qualified: 0,
    converted: 0,
  });

  // New prospect form
  const [newProspect, setNewProspect] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'manual',
  });
  const [addingProspect, setAddingProspect] = useState(false);

  // Charger les prospects depuis l'API
  useEffect(() => {
    loadProspects();
  }, []);

  const loadProspects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/prospects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        const loadedProspects = (data.prospects || []).map((p: any) => ({
          id: p.id || p.prospect_id,
          firstName: p.first_name || p.firstName || '',
          lastName: p.last_name || p.lastName || '',
          email: p.email,
          phone: p.phone,
          preferredChannel: p.preferred_channel || p.preferredChannel,
          segment: p.segment || 'standard',
          tags: p.tags || [],
          totalOrders: p.total_orders || p.totalOrders || 0,
          totalSpent: { amount: p.total_spent || p.totalSpent?.amount || 0, currency: 'EUR' },
          createdAt: new Date(p.created_at || p.createdAt),
          lastOrderAt: p.last_order_at ? new Date(p.last_order_at) : undefined,
          source: p.source || 'unknown',
          status: p.status || 'new',
        }));
        setProspects(loadedProspects);
        setFilteredProspects(loadedProspects);
        computeStats(loadedProspects);
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Erreur chargement prospects:', err);
      // Fallback to mock data
      const mockProspects: Prospect[] = [
        {
          id: '1',
          firstName: 'Julie',
          lastName: 'Martin',
          email: 'julie.martin@example.com',
          phone: '+33601020304',
          preferredChannel: 'sms',
          segment: 'vip',
          tags: ['fidele', 'actif'],
          totalOrders: 12,
          totalSpent: { amount: 1280, currency: 'EUR' },
          createdAt: new Date('2024-01-15'),
          lastOrderAt: new Date('2025-11-10'),
          source: 'website',
          status: 'converted',
        },
        {
          id: '2',
          firstName: 'Emma',
          lastName: 'Rousseau',
          email: 'emma.rousseau@example.com',
          phone: '+33612345678',
          preferredChannel: 'email',
          segment: 'active',
          tags: ['nouveau'],
          totalOrders: 3,
          totalSpent: { amount: 245, currency: 'EUR' },
          createdAt: new Date('2025-10-20'),
          lastOrderAt: new Date('2025-11-05'),
          source: 'appel',
          status: 'qualified',
        },
        {
          id: '3',
          firstName: 'Sophie',
          lastName: 'Dubois',
          email: 'sophie.dubois@example.com',
          phone: '+33698765432',
          preferredChannel: 'whatsapp',
          segment: 'prospect',
          tags: ['auto-created', 'premier-contact'],
          totalOrders: 0,
          totalSpent: { amount: 0, currency: 'EUR' },
          createdAt: new Date('2025-11-15'),
          source: 'sara',
          status: 'new',
        },
        {
          id: '4',
          firstName: 'Pierre',
          lastName: 'Leroy',
          email: 'pierre.leroy@example.com',
          phone: '+33678901234',
          preferredChannel: 'phone',
          segment: 'standard',
          tags: ['contact-tel'],
          totalOrders: 0,
          totalSpent: { amount: 0, currency: 'EUR' },
          createdAt: new Date('2025-12-01'),
          source: 'sara',
          status: 'contacted',
        },
      ];
      setProspects(mockProspects);
      setFilteredProspects(mockProspects);
      computeStats(mockProspects);
      setError('Mode hors-ligne : donnees locales affichees');
    } finally {
      setIsLoading(false);
    }
  };

  const computeStats = (data: Prospect[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setStats({
      total: data.length,
      newThisMonth: data.filter(c => new Date(c.createdAt) >= thisMonth).length,
      qualified: data.filter(c => c.status === 'qualified').length,
      converted: data.filter(c => c.status === 'converted').length,
    });
  };

  // Filtrer les prospects
  useEffect(() => {
    let filtered = prospects;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    if (selectedSegment !== 'all') {
      filtered = filtered.filter(c => c.segment === selectedSegment);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    setFilteredProspects(filtered);
  }, [searchQuery, selectedSegment, selectedStatus, prospects]);

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    const badges: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      qualified: 'bg-green-100 text-green-800 border-green-200',
      converted: 'bg-purple-100 text-purple-800 border-purple-200',
      lost: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const labels: Record<string, string> = {
      new: 'Nouveau',
      contacted: 'Contacte',
      qualified: 'Qualifie',
      converted: 'Converti',
      lost: 'Perdu',
    };

    const badge = status ? badges[status] : badges.new;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge}`}>
        {status ? labels[status] || status : 'Nouveau'}
      </span>
    );
  };

  const getSegmentBadge = (segment?: string) => {
    const badges: Record<string, string> = {
      vip: 'bg-purple-100 text-purple-800 border-purple-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      prospect: 'bg-blue-100 text-blue-800 border-blue-200',
      standard: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const badge = segment ? badges[segment] : badges.standard;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge || badges.standard}`}>
        {segment || 'standard'}
      </span>
    );
  };

  // Add prospect
  const handleAddProspect = async () => {
    if (!newProspect.firstName.trim() || !newProspect.lastName.trim()) return;

    setAddingProspect(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          first_name: newProspect.firstName,
          last_name: newProspect.lastName,
          email: newProspect.email || undefined,
          phone: newProspect.phone || undefined,
          source: newProspect.source,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewProspect({ firstName: '', lastName: '', email: '', phone: '', source: 'manual' });
        toast.success('Prospect ajoute avec succes');
        loadProspects();
      } else {
        // Fallback: add locally
        const localProspect: Prospect = {
          id: `local_${Date.now()}`,
          firstName: newProspect.firstName,
          lastName: newProspect.lastName,
          email: newProspect.email || undefined,
          phone: newProspect.phone || undefined,
          segment: 'prospect',
          tags: [],
          totalOrders: 0,
          totalSpent: { amount: 0, currency: 'EUR' },
          createdAt: new Date(),
          source: newProspect.source,
          status: 'new',
        };
        setProspects(prev => [localProspect, ...prev]);
        computeStats([localProspect, ...prospects]);
        setShowAddModal(false);
        setNewProspect({ firstName: '', lastName: '', email: '', phone: '', source: 'manual' });
      }
    } catch (err) {
      // Fallback: add locally
      const localProspect: Prospect = {
        id: `local_${Date.now()}`,
        firstName: newProspect.firstName,
        lastName: newProspect.lastName,
        email: newProspect.email || undefined,
        phone: newProspect.phone || undefined,
        segment: 'prospect',
        tags: [],
        totalOrders: 0,
        totalSpent: { amount: 0, currency: 'EUR' },
        createdAt: new Date(),
        source: newProspect.source,
        status: 'new',
      };
      setProspects(prev => [localProspect, ...prev]);
      computeStats([localProspect, ...prospects]);
      setShowAddModal(false);
      setNewProspect({ firstName: '', lastName: '', email: '', phone: '', source: 'manual' });
    } finally {
      setAddingProspect(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Prenom', 'Nom', 'Email', 'Telephone', 'Canal prefere', 'Segment', 'Statut', 'Source', 'Tags', 'Total commandes', 'Total depense'];
    const csvData = filteredProspects.map(c => [
      c.firstName,
      c.lastName,
      c.email || '',
      c.phone || '',
      c.preferredChannel || '',
      c.segment || '',
      c.status || '',
      c.source || '',
      c.tags?.join(';') || '',
      c.totalOrders.toString(),
      `${c.totalSpent.amount} ${c.totalSpent.currency}`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prospects_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Import CSV
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1);

      const importedProspects: Prospect[] = dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.replace(/(^"|"$)/g, '').trim());
        return {
          id: `imported_${Date.now()}_${index}`,
          firstName: values[0] || '',
          lastName: values[1] || '',
          email: values[2] || undefined,
          phone: values[3] || undefined,
          preferredChannel: (values[4] as Prospect['preferredChannel']) || undefined,
          segment: values[5] || 'prospect',
          tags: values[8] ? values[8].split(';') : [],
          totalOrders: parseInt(values[9]) || 0,
          totalSpent: { amount: parseFloat(values[10]) || 0, currency: 'EUR' },
          createdAt: new Date(),
          source: 'import',
          status: 'new',
        };
      });

      const allProspects = [...importedProspects, ...prospects];
      setProspects(allProspects);
      computeStats(allProspects);
      setShowImportModal(false);
      setImportFile(null);
      toast.success(`${importedProspects.length} prospect(s) importes avec succes`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Erreur import:', err);
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des prospects...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <ActionToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard/crm"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="hidden sm:block">
              <Logo size={48} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Prospects</h1>
              <p className="text-xs sm:text-sm text-gray-600">Gerez votre pipeline commercial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
            <button
              onClick={loadProspects}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Rafraichir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importer</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total prospects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Users className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux ce mois</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualifies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.qualified}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Tag className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Convertis</p>
                <p className="text-2xl font-bold text-gray-900">{stats.converted}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <Euro className="w-6 h-6 text-gray-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou telephone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">Tous les segments</option>
              <option value="vip">VIP</option>
              <option value="active">Actif</option>
              <option value="prospect">Prospect</option>
              <option value="standard">Standard</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouveau</option>
              <option value="contacted">Contacte</option>
              <option value="qualified">Qualifie</option>
              <option value="converted">Converti</option>
              <option value="lost">Perdu</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prospect</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Aucun prospect trouve</p>
                    <p className="text-sm text-gray-400 mt-1">Ajoutez un nouveau prospect ou modifiez vos filtres</p>
                  </td>
                </tr>
              ) : (
                filteredProspects.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {prospect.firstName[0]}{prospect.lastName[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {prospect.firstName} {prospect.lastName}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {prospect.tags?.slice(0, 2).map((tag, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {prospect.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {prospect.email}
                          </div>
                        )}
                        {prospect.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            {getChannelIcon(prospect.preferredChannel) || <Phone className="w-3 h-3" />}
                            {prospect.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(prospect.status)}
                    </td>
                    <td className="px-6 py-4">
                      {getSegmentBadge(prospect.segment)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 capitalize">{prospect.source || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {prospect.totalSpent.amount > 0 ? `${prospect.totalSpent.amount.toFixed(0)}EUR` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(prospect.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/crm/prospects/${prospect.id}`}
                        className="text-gray-900 hover:text-gray-600 text-sm font-medium"
                      >
                        Voir details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredProspects.length} prospect(s) affiche(s)
          </div>
        </div>
      </div>

      {/* Add Prospect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Nouveau prospect</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom *</label>
                  <input
                    type="text"
                    value={newProspect.firstName}
                    onChange={(e) => setNewProspect({ ...newProspect, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    value={newProspect.lastName}
                    onChange={(e) => setNewProspect({ ...newProspect, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newProspect.email}
                  onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input
                  type="tel"
                  value={newProspect.phone}
                  onChange={(e) => setNewProspect({ ...newProspect, phone: e.target.value })}
                  placeholder="+33..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={newProspect.source}
                  onChange={(e) => setNewProspect({ ...newProspect, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="manual">Saisie manuelle</option>
                  <option value="sara">Agent Sara</option>
                  <option value="website">Site web</option>
                  <option value="appel">Appel telephonique</option>
                  <option value="recommandation">Recommandation</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddProspect}
                disabled={!newProspect.firstName.trim() || !newProspect.lastName.trim() || addingProspect}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {addingProspect ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Ajout...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-gray-700" />
                Importer des prospects
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-3">
                Importez un fichier CSV avec les colonnes suivantes :
              </p>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono mb-4">
                Prenom, Nom, Email, Telephone, Canal, Segment, Statut, Source, Tags, Commandes, Total
              </div>
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
                />
              </div>
              {importFile && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">{importFile.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importer
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
