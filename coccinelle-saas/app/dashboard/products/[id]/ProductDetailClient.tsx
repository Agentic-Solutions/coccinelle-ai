'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Package, MapPin, Tag, Calendar, Edit, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/hooks/useTenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

const getAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { 'Authorization': `Bearer ${token}` } : { 'x-api-key': 'demo-key-12345' };
};

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
  location: any;
  tags: string | null;
  images: string | null;
  attributes: string | null;
  created_at: string;
  updated_at: string;
  variants?: any[];
}

export default function ProductDetailClient() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  const { tenantId, loading: tenantLoading } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantLoading && productId) {
      fetchProduct();
    }
  }, [productId, tenantLoading]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/products/${productId}`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Produit non trouvé');
      const data = await response.json();
      setProduct(data.product);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Produit non trouvé'}</p>
          <Link href="/dashboard/products" className="text-blue-600 hover:text-blue-700">
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  const attributes = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes || {};
  const tags = typeof product.tags === 'string' ? product.tags.split(',').map(t => t.trim()) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard/products" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Retour aux produits
          </Link>
          <Link href={`/dashboard/products/${product.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Edit className="w-4 h-4" /> Modifier
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Package className="w-4 h-4" />{product.category}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.type === 'service' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {product.type === 'service' ? 'Service' : 'Produit'}
                  </span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(product.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{product.price?.toFixed(2)} {product.price_currency}</div>
                <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${product.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {product.available ? 'Disponible' : 'Indisponible'}
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {Object.keys(attributes).length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Attributs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5" /> Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
