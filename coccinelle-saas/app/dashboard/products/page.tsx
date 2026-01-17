'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Filter, MapPin, Euro, ShoppingBag, UtensilsCrossed, Briefcase, Home, Tag, Car, Book, Smartphone, Music, Heart, ShoppingCart, Laptop, Users } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
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

// Mapping des icônes Lucide
const ICON_MAP: Record<string, any> = {
  Home,
  ShoppingBag,
  UtensilsCrossed,
  Briefcase,
  Package,
  Car,
  Book,
  Smartphone,
  Music,
  Heart,
  ShoppingCart,
  Laptop
};

export default function ProductsPage() {
  const { tenantId, loading: tenantLoading } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // 'all', 'product', 'service'
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les catégories depuis l'API - ATTENDRE que le tenant soit chargé
  useEffect(() => {
    if (!tenantLoading) {
      fetchCategories();
    }
  }, [tenantLoading]);

  useEffect(() => {
    if (!tenantLoading) {
      fetchProducts();
    }
  }, [selectedCategory, tenantLoading]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(`/api/proxy?path=/api/v1/product-categories&tenantId=${tenantId}`);
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      const response = await fetch(`/api/proxy?path=/api/v1/products&tenantId=${tenantId}${categoryParam}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtre par recherche et catégorie (sans type)
  const searchAndCategoryFiltered = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ensuite filtre par type (les produits sans type sont considérés comme 'product')
  const filteredProducts = searchAndCategoryFiltered.filter(product => {
    if (selectedType === 'all') return true;
    if (selectedType === 'product') return !product.type || product.type === 'product';
    return product.type === selectedType;
  });

  // Compteurs pour les onglets (basés sur searchAndCategoryFiltered)
  const productsCount = searchAndCategoryFiltered.filter(p => !p.type || p.type === 'product').length;
  const servicesCount = searchAndCategoryFiltered.filter(p => p.type === 'service').length;
  const allCount = searchAndCategoryFiltered.length;

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(price);
  };

  const getCategoryConfig = (categoryKey: string) => {
    return categories.find(cat => cat.key === categoryKey);
  };

  const getCategoryIcon = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    if (!config) return Package;

    const IconComponent = ICON_MAP[config.icon] || Package;
    return IconComponent;
  };

  const getCategoryBgColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-100',
      purple: 'bg-purple-50 border-purple-100',
      orange: 'bg-orange-50 border-orange-100',
      green: 'bg-green-50 border-green-100',
      red: 'bg-red-50 border-red-100',
      yellow: 'bg-yellow-50 border-yellow-100'
    };
    return colors[config?.color || ''] || 'bg-gray-50 border-gray-100';
  };

  const getCategoryTextColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = {
      blue: 'text-blue-700',
      purple: 'text-purple-700',
      orange: 'text-orange-700',
      green: 'text-green-700',
      red: 'text-red-700',
      yellow: 'text-yellow-700'
    };
    return colors[config?.color || ''] || 'text-gray-700';
  };

  const getCategoryIconColor = (categoryKey: string) => {
    const config = getCategoryConfig(categoryKey);
    const colors: Record<string, string> = {
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      green: 'text-green-600',
      red: 'text-red-600',
      yellow: 'text-yellow-600'
    };
    return colors[config?.color || ''] || 'text-gray-600';
  };

  const getDisplayAttributes = (product: Product) => {
    const config = getCategoryConfig(product.category);
    if (!config || !product.attributes) return [];

    const displayFields = config.fields
      .filter(field => product.attributes[field.key] !== undefined)
      .map(field => ({
        key: field.key,
        label: field.label,
        value: product.attributes[field.key]
      }));

    return displayFields;
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-7 h-7 text-blue-600" />
                Produits Multi-Secteurs
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gérez tous vos produits : immobilier, e-commerce, restauration, services...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/products/agents" className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigner les agents
              </Link>
              <Link href="/dashboard/products/import" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Importer CSV
              </Link>
              <Link href="/dashboard/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouveau produit
              </Link>
            </div>
          </div>

          {/* Stats - Afficher uniquement les catégories avec des produits */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
            {loadingCategories ? (
              <div className="col-span-4 text-center py-4 text-gray-500">Chargement des catégories...</div>
            ) : (
              categories
                .map((cat) => ({
                  ...cat,
                  count: products.filter(p => p.category === cat.key).length
                }))
                .filter(cat => cat.count > 0) // Masquer les catégories sans produits
                .map((cat) => {
                  const Icon = getCategoryIcon(cat.key);
                  const iconColor = getCategoryIconColor(cat.key);
                  return (
                    <div key={cat.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
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

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingCategories}
            >
              <option value="all">Toutes catégories</option>
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type Tabs */}
        <div className="mt-6 flex items-center gap-2 bg-white rounded-lg shadow-sm p-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tous ({allCount})
          </button>
          <button
            onClick={() => setSelectedType('product')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              selectedType === 'product'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Produits ({productsCount})
          </button>
          <button
            onClick={() => setSelectedType('service')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              selectedType === 'service'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Services ({servicesCount})
          </button>
        </div>

        {/* Products Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Chargement des produits...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-4">Aucun produit trouvé</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const Icon = getCategoryIcon(product.category);
              const bgColor = getCategoryBgColor(product.category);
              const textColor = getCategoryTextColor(product.category);
              const iconColor = getCategoryIconColor(product.category);
              const displayAttrs = getDisplayAttributes(product);

              return (
                <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className={`${bgColor} p-4 border-b`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${iconColor}`} />
                        <span className={`text-xs font-medium ${textColor}`}>
                          {getCategoryConfig(product.category)?.name || product.category}
                        </span>
                        {/* Type Badge - Afficher uniquement si le type est défini */}
                        {product.type && (
                          product.type === 'service' ? (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              Service
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Produit
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      {product.has_variants === 1 && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Variantes
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        product.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {product.available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <Link href={`/dashboard/products/${product.id}`} className="font-semibold text-gray-900 text-lg mb-2 hover:text-blue-600 block">{product.title}</Link>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                    )}

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Euro className="w-5 h-5 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">
                          {formatPrice(product.price, product.price_currency)}
                        </span>
                      </div>
                    </div>

                    {/* Attributes */}
                    {displayAttrs.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {displayAttrs.map(attr => (
                          <div key={attr.key} className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{attr.label}:</span>
                            <span className="font-medium text-gray-900">
                              {typeof attr.value === 'boolean' ? (attr.value ? 'Oui' : 'Non') :
                               Array.isArray(attr.value) ? attr.value.join(', ') :
                               attr.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Location - Only for real estate */}
                    {product.category === 'real_estate' && product.location && product.location.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <MapPin className="w-4 h-4" />
                        <span>{product.location.city}</span>
                        {product.location.postal_code && <span>• {product.location.postal_code}</span>}
                      </div>
                    )}

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-xs text-gray-400">
                        {new Date(product.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Voir détails →
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
