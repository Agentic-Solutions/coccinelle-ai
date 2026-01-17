'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, MapPin, Tag, DollarSign, Image as ImageIcon, Calendar, Edit, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/hooks/useTenant';

interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number | null;
  stock_quantity: number;
  stock_status: string;
  available: number;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  price: number;
  price_currency: string;
  has_variants: number;
  available: number;
  location: string | null;
  tags: string | null;
  images: string | null;
  attributes: string | null;
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { tenantId, loading: tenantLoading } = useTenant();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantLoading) {
      fetchProduct();
    }
  }, [productId, tenantLoading]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxy?path=/api/v1/products/${productId}&tenantId=${tenantId}`);

      if (!response.ok) {
        throw new Error('Produit non trouvé');
      }

      const data = await response.json();
      setProduct(data.product);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const getStockBadgeColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'En stock';
      case 'low_stock':
        return 'Stock faible';
      case 'out_of_stock':
        return 'Rupture de stock';
      default:
        return status;
    }
  };

  const formatAttributeName = (key: string) => {
    // Format attribute names to be more readable
    // e.g., "pr_0-5rem" -> "Pr 0-5rem", "postal_code" -> "Code postal"
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
  };

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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Produit non trouvé'}</p>
          <Link
            href="/dashboard/products"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  const attributes = typeof product.attributes === 'string'
    ? JSON.parse(product.attributes)
    : product.attributes || {};
  const images = typeof product.images === 'string'
    ? JSON.parse(product.images)
    : product.images || [];
  const tags = typeof product.tags === 'string'
    ? (product.tags.includes(',') ? product.tags.split(',').map(t => t.trim()) : product.tags.split(';').map(t => t.trim()))
    : Array.isArray(product.tags)
      ? product.tags
      : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard/products"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux produits
          </Link>

          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Modifier
          </Link>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {product.category}
                  </span>
                  {/* Type Badge */}
                  {product.type === 'service' ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Service
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Produit
                    </span>
                  )}
                  {product.category === 'real_estate' && product.location && product.location.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {product.location.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(product.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {product.price.toFixed(2)} {product.price_currency}
                </div>
                {product.has_variants === 0 && (
                  <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.available ? 'Disponible' : 'Indisponible'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Location */}
          {product.location && (product.location.address || product.location.city || product.location.postal_code) && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </h2>
              <div className="space-y-2 text-gray-700">
                {product.location.address && product.location.address.trim() && <p>{product.location.address}</p>}
                {(product.location.city || product.location.postal_code) && (
                  <p>
                    {product.location.city && product.location.city.trim()}
                    {product.location.city && product.location.city.trim() && product.location.postal_code && product.location.postal_code.trim() && ' '}
                    {product.location.postal_code && product.location.postal_code.trim()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img: string, idx: number) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={img}
                      alt={`${product.title} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attributes */}
          {Object.keys(attributes).length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Attributs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-gray-600">{formatAttributeName(key)}:</span>
                    <span className="font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {product.has_variants === 1 && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Variantes ({product.variants?.length || 0})
              </h2>

              {!product.variants || product.variants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune variante trouvée</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attributs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.variants.map((variant) => {
                        const variantAttrs = variant.attributes;
                        return (
                          <tr key={variant.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm text-gray-900">
                                {variant.sku}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(variantAttrs).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                  >
                                    <span className="capitalize">{key}:</span> {value}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {variant.price !== null
                                  ? `${variant.price.toFixed(2)} ${product.price_currency}`
                                  : `${product.price.toFixed(2)} ${product.price_currency}`}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">
                                {variant.stock_quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStockBadgeColor(variant.stock_status)}`}>
                                {getStockLabel(variant.stock_status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
