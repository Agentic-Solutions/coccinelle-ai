'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import {
  Users, Search, Filter, Download, Plus,
  Mail, Phone, MessageSquare, Tag, TrendingUp,
  Calendar, ShoppingBag, Euro, Home, Settings, Upload, X, FileText
} from 'lucide-react';

// Types
interface Customer {
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
}

interface Stats {
  total: number;
  newThisMonth: number;
  vip: number;
  active: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    newThisMonth: 0,
    vip: 0,
    active: 0,
  });

  // Charger les clients (TODO: remplacer par vraie API)
  useEffect(() => {
    // Simuler le chargement
    setTimeout(() => {
      const mockCustomers: Customer[] = [
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
        },
      ];

      setCustomers(mockCustomers);
      setFilteredCustomers(mockCustomers);

      // Calculer les stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        total: mockCustomers.length,
        newThisMonth: mockCustomers.filter(c => new Date(c.createdAt) >= thisMonth).length,
        vip: mockCustomers.filter(c => c.segment === 'vip').length,
        active: mockCustomers.filter(c => c.segment === 'active' || c.segment === 'vip').length,
      });

      setIsLoading(false);
    }, 500);
  }, []);

  // Filtrer les clients
  useEffect(() => {
    let filtered = customers;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.firstName.toLowerCase().includes(query) ||
        c.lastName.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      );
    }

    // Filtre par segment
    if (selectedSegment !== 'all') {
      filtered = filtered.filter(c => c.segment === selectedSegment);
    }

    // Filtre par canal
    if (selectedChannel !== 'all') {
      filtered = filtered.filter(c => c.preferredChannel === selectedChannel);
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, selectedSegment, selectedChannel, customers]);

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return null;
    }
  };

  const getSegmentBadge = (segment?: string) => {
    const badges = {
      vip: 'bg-purple-100 text-purple-800 border-purple-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      prospect: 'bg-blue-100 text-blue-800 border-blue-200',
      standard: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const badge = segment ? badges[segment as keyof typeof badges] : badges.standard;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge}`}>
        {segment || 'standard'}
      </span>
    );
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Canal préféré', 'Segment', 'Tags', 'Total commandes', 'Total dépensé'];
    const csvData = filteredCustomers.map(c => [
      c.firstName,
      c.lastName,
      c.email || '',
      c.phone || '',
      c.preferredChannel || '',
      c.segment || '',
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
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Import CSV
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Skip header
      const dataLines = lines.slice(1);

      const importedCustomers: Customer[] = dataLines.map((line, index) => {
        const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());

        return {
          id: `imported_${Date.now()}_${index}`,
          firstName: values[0] || '',
          lastName: values[1] || '',
          email: values[2] || undefined,
          phone: values[3] || undefined,
          preferredChannel: (values[4] as any) || undefined,
          segment: values[5] || 'standard',
          tags: values[6] ? values[6].split(';') : [],
          totalOrders: parseInt(values[7]) || 0,
          totalSpent: { amount: parseFloat(values[8]) || 0, currency: 'EUR' },
          createdAt: new Date(),
        };
      });

      // Ajouter les clients importés
      setCustomers(prev => [...prev, ...importedCustomers]);

      // Mettre à jour les stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const allCustomers = [...customers, ...importedCustomers];

      setStats({
        total: allCustomers.length,
        newThisMonth: allCustomers.filter(c => new Date(c.createdAt) >= thisMonth).length,
        vip: allCustomers.filter(c => c.segment === 'vip').length,
        active: allCustomers.filter(c => c.segment === 'active' || c.segment === 'vip').length,
      });

      // Fermer le modal
      setShowImportModal(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(`${importedCustomers.length} clients importés avec succès !`);
    } catch (error) {
      console.error('Erreur import:', error);
      alert('Erreur lors de l\'import du fichier. Vérifiez le format CSV.');
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size={40} />
              <h1 className="text-2xl font-bold text-gray-900">Coccinelle.AI</h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              <Link href="/dashboard/customers" className="flex items-center gap-2 text-red-600 font-medium">
                <Users className="w-5 h-5" />
                Clients
              </Link>
              <Link href="/dashboard/settings/integrations" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="w-5 h-5" />
                Intégrations
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-8 h-8 text-red-600" />
                Clients
              </h2>
              <p className="text-gray-600 mt-1">
                Gérez vos clients et suivez leur activité
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Importer
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Download className="w-5 h-5" />
                Exporter CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium">
                <Plus className="w-5 h-5" />
                Nouveau client
              </button>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nouveaux ce mois</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients VIP</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vip}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Segment Filter */}
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les segments</option>
              <option value="vip">VIP</option>
              <option value="active">Actif</option>
              <option value="prospect">Prospect</option>
              <option value="standard">Standard</option>
            </select>

            {/* Channel Filter */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les canaux</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Téléphone</option>
            </select>

            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-5 h-5" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Segment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commandes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total dépensé
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière activité
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Aucun client trouvé
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {customer.tags?.map((tag, i) => (
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
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {getChannelIcon(customer.preferredChannel)}
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getSegmentBadge(customer.segment)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{customer.totalOrders}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Euro className="w-4 h-4 text-gray-400" />
                      {customer.totalSpent.amount.toFixed(2)} €
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {customer.lastOrderAt ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(customer.lastOrderAt).toLocaleDateString('fr-FR')}
                        </div>
                      ) : (
                        <span className="text-gray-400">Aucune commande</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Voir détails →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {/* Pagination (placeholder) */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage de {filteredCustomers.length} client(s)
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
              Précédent
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-red-600" />
                Importer des clients
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

            {/* Body */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Importez un fichier CSV avec les colonnes suivantes :
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono mb-4">
                  <p className="text-gray-700">Prénom, Nom, Email, Téléphone, Canal préféré, Segment, Tags, Total commandes, Total dépensé</p>
                </div>
                <p className="text-xs text-gray-500">
                  Format : CSV avec séparateur virgule. Les tags doivent être séparés par des points-virgules.
                </p>
              </div>

              {/* File input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none hover:bg-gray-100"
                />
              </div>

              {importFile && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">{importFile.name}</span>
                </div>
              )}

              {/* Modèle CSV */}
              <div className="mb-4">
                <a
                  href="data:text/csv;charset=utf-8,%EF%BB%BFPr%C3%A9nom%2CNom%2CEmail%2CT%C3%A9l%C3%A9phone%2CCanal%20pr%C3%A9f%C3%A9r%C3%A9%2CSegment%2CTags%2CTotal%20commandes%2CTotal%20d%C3%A9pens%C3%A9%0AJean%2CDupont%2Cjean.dupont%40example.com%2C%2B33601020304%2Cemail%2Cprospect%2Cnouveau%3Bactif%2C0%2C0"
                  download="modele_clients.csv"
                  className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Télécharger un modèle CSV
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
