'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, MapPin, Euro, ShoppingBag, UtensilsCrossed, Briefcase, Home, Tag, Car, Book, Smartphone, Music, Heart, ShoppingCart, Laptop, Users } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface Product {
  id: string;
  title: string;
  category: string;
  type: string;
  price: number;
  price_currency: string;
  description: string;
  status: string;
  available: number;
  has_variants: number;
  attributes: Record<string, any>;
  location: Record<string, any>;
  tags: string[];
  images: string[];
  created_at: string;
}

interface CategoryConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

const ICON_MAP: Record<string, any> = {
  Home, ShoppingBag, UtensilsCrossed, Briefcase, Package, Car, Book, Smartphone, Music, Heart, ShoppingCart, Laptop
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function KnowledgeProductsPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token
      ? { 'Authorization': `Bearer ${token}` }
      : {};
  };

  useEffect(() => {
    if (!tenantLoading) fetchCategories();
  }, [tenantLoading]);

  useEffect(() => {
    if (!tenantLoading) fetchProducts();
  }, [selectedCategory, tenantLoading]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(`${API_URL}/api/v1/product-categories`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setCategories(data.categories);
    } catch { /* ignore */ } finally { setLoadingCategories(false); }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const categoryParam = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      const response = await fetch(`${API_URL}/api/v1/products${categoryParam}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setProducts(data.products);
    } catch {
      setError('Impossible de charger les produits.');
    } finally { setLoading(false); }
  };

  const searchAndCategoryFiltered = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = searchAndCategoryFiltered.filter(product => {
    if (selectedType === 'all') return true;
    if (selectedType === 'product') return !product.type || product.type === 'product';
    return product.type === selectedType;
  });

  const productsCount = searchAndCategoryFiltered.filter(p => !p.type || p.type === 'product').length;
  const servicesCount = searchAndCategoryFiltered.filter(p => p.type === 'service').length;
  const allCount = searchAndCategoryFiltered.length;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'EUR' }).format(price);
  };

  const getCategoryConfig = (categoryKey: string) => categories.find(cat => cat.key === categoryKey);

  const getCategoryIcon = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    return config ? (ICON_MAP[config.icon] || Package) : Package;
  };

  const getCategoryIconColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = { blue: 'text-gray-600', purple: 'text-gray-600', orange: 'text-gray-600', green: 'text-gray-600', red: 'text-gray-600', yellow: 'text-gray-600' };
    return colors[config?.color || ''] || 'text-gray-600';
  };

  const getCategoryBgColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = { blue: 'bg-gray-50 border-gray-100', purple: 'bg-gray-50 border-gray-100', orange: 'bg-gray-50 border-gray-100', green: 'bg-gray-50 border-gray-100', red: 'bg-gray-50 border-gray-100', yellow: 'bg-gray-50 border-gray-100' };
    return colors[config?.color || ''] || 'bg-gray-50 border-gray-100';
  };

  const getCategoryTextColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = { blue: 'text-gray-700', purple: 'text-gray-700', orange: 'text-gray-700', green: 'text-gray-700', red: 'text-gray-700', yellow: 'text-gray-700' };
    return colors[config?.color || ''] || 'text-gray-700';
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700 flex-shrink-0" />
                Produits & Services
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Gérez vos produits et services — accessibles par votre agent vocal
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
              <Link href="/dashboard/products/import" className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm whitespace-nowrap">
                <Package className="w-4 h-4" />
                Importer CSV
              </Link>
              <Link href="/dashboard/products/new" className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm whitespace-nowrap">
                <Plus className="w-4 h-4" />
                Nouveau
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            {loadingCategories ? (
              <div className="col-span-4 text-center py-4 text-gray-500">Chargement...</div>
            ) : (
              categories
                .map(cat => ({ ...cat, count: products.filter(p => p.category === cat.key).length }))
                .filter(cat => cat.count > 0)
                .map(cat => {
                  const Icon = getCategoryIcon(cat.key);
                  return (
                    <div key={cat.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${getCategoryIconColor(cat.key)}`} />
                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{cat.count}</p>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchProducts} className="text-red-600 hover:text-red-700 text-sm font-medium underline">Réessayer</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="mt-6 flex items-center gap-2 bg-white rounded-lg shadow-sm p-2">
          <button onClick={() => setSelectedType('all')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${selectedType === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            Tous ({allCount})
          </button>
          <button onClick={() => setSelectedType('product')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${selectedType === 'product' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Package className="w-4 h-4" /> Produits ({productsCount})
          </button>
          <button onClick={() => setSelectedType('service')} className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${selectedType === 'service' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Briefcase className="w-4 h-4" /> Services ({servicesCount})
          </button>
        </div>

        {/* Products Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-500 mt-4">Chargement...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-4">Aucun produit trouvé</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const Icon = getCategoryIcon(product.category);
              const bgColor = getCategoryBgColor(product.category);
              const textColor = getCategoryTextColor(product.category);
              const iconColor = getCategoryIconColor(product.category);

              return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
                  <div className={`${bgColor} p-4 border-b`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                      <span className={`text-xs font-medium ${textColor}`}>
                        {getCategoryConfig(product.category)?.name || product.category}
                      </span>
                      {product.type === 'service' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Service</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.available ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'}`}>
                        {product.available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <Link href={`/dashboard/products/${product.id}`} className="font-semibold text-gray-900 text-lg mb-2 hover:text-gray-600 block">{product.title}</Link>
                    {product.description && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>}
                    <div className="mb-4 flex items-center gap-2">
                      <Euro className="w-5 h-5 text-gray-700" />
                      <span className="text-2xl font-bold text-gray-900">{formatPrice(product.price, product.price_currency)}</span>
                    </div>
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-xs text-gray-400">{new Date(product.created_at).toLocaleDateString('fr-FR')}</span>
                      <Link href={`/dashboard/products/${product.id}`} className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                        Voir détails
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
