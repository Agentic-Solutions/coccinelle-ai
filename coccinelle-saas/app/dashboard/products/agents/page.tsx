'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, CheckCircle, AlertCircle, Filter, Search, User } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Agent {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Product {
  id: string;
  title: string;
  category: string;
  agent_id: string | null;
  agent_name?: string;
  price: number;
  price_currency: string;
}

export default function AgentAssignmentPage() {
  const { tenantId } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');

  // Selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkAgentId, setBulkAgentId] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, agentsRes] = await Promise.all([
        fetch(`/api/proxy?path=/api/v1/products&tenantId=${tenantId}`),
        fetch(`/api/proxy?path=/api/v1/agents&tenantId=${tenantId}`)
      ]);

      const productsData = await productsRes.json();
      const agentsData = await agentsRes.json();

      if (productsData.success) {
        setProducts(productsData.products || []);
      }

      if (agentsData.success) {
        setAgents(agentsData.agents || []);
      }
    } catch (err: any) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchTerm && !product.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filterCategory !== 'all' && product.category !== filterCategory) {
      return false;
    }

    // Agent filter
    if (filterAgent === 'unassigned' && product.agent_id) {
      return false;
    }
    if (filterAgent === 'assigned' && !product.agent_id) {
      return false;
    }
    if (filterAgent !== 'all' && filterAgent !== 'assigned' && filterAgent !== 'unassigned') {
      if (product.agent_id !== filterAgent) {
        return false;
      }
    }

    return true;
  });

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedProducts.size === 0) {
      setError('Aucun produit sélectionné');
      return;
    }

    if (!bulkAgentId) {
      setError('Veuillez sélectionner un agent');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = Array.from(selectedProducts).map(async (productId) => {
        const response = await fetch(`/api/proxy?path=/api/v1/products/${productId}&tenantId=${tenantId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agent_id: bulkAgentId,
            assignment_type: 'exclusive'
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de la mise à jour du produit ${productId}`);
        }

        return response.json();
      });

      await Promise.all(updates);

      setSuccess(`${selectedProducts.size} produit(s) assigné(s) avec succès`);
      setSelectedProducts(new Set());
      setBulkAgentId('');

      // Refresh data
      await fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'assignation');
    } finally {
      setSaving(false);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/products"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Assignation des agents
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Gérez l'assignation des agents aux produits en masse
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-900">{success}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-900">{error}</p>
          </div>
        )}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Rechercher
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titre du produit..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Catégorie
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Agent
              </label>
              <select
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous</option>
                <option value="assigned">Assignés</option>
                <option value="unassigned">Non assignés</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Assignment */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigner en masse
                </label>
                <select
                  value={bulkAgentId}
                  onChange={(e) => setBulkAgentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={selectedProducts.size === 0}
                >
                  <option value="">Sélectionner un agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-7">
                <button
                  onClick={handleBulkAssign}
                  disabled={saving || selectedProducts.size === 0 || !bulkAgentId}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Assignation...
                    </>
                  ) : (
                    <>
                      Assigner ({selectedProducts.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent assigné
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Aucun produit trouvé
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {product.price.toFixed(2)} {product.price_currency}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {product.agent_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-900">
                              {agents.find(a => a.id === product.agent_id)?.name || product.agent_id}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Non assigné</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          {filteredProducts.length} produit(s) • {selectedProducts.size} sélectionné(s)
        </div>
      </div>
    </div>
  );
}
