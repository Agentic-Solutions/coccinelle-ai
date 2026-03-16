'use client';

import React, { useState } from 'react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface Product {
  title: string;
  description: string;
  price: string;
}

interface ProductsStepProps {
  productsData: { count: number } | null;
  onProductsChange: (data: { count: number } | null) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ProductsStep({ productsData, onProductsChange, onNext, onBack, onSkip }: ProductsStepProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'csv'>('choose');
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product>({ title: '', description: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showDbMessage, setShowDbMessage] = useState(false);
  const [totalCount, setTotalCount] = useState(productsData?.count || 0);

  const handleAddProduct = async () => {
    if (!currentProduct.title.trim()) return;

    setSaving(true);
    setError('');

    try {
      const response = await fetch(
        buildApiUrl('/api/v1/products'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: currentProduct.title.trim(),
            description: currentProduct.description.trim() || undefined,
            price: currentProduct.price ? parseFloat(currentProduct.price) : undefined,
            category: 'general',
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'ajout');
      }

      setProducts([...products, currentProduct]);
      setCurrentProduct({ title: '', description: '', price: '' });
      const newCount = totalCount + 1;
      setTotalCount(newCount);
      onProductsChange({ count: newCount });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ajout du produit');
    } finally {
      setSaving(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const authToken = localStorage.getItem('auth_token');
      const response = await fetch(
        buildApiUrl('/api/v1/products/import'),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'import');
      }

      const importedCount = data.count || data.imported || 0;
      const newCount = totalCount + importedCount;
      setTotalCount(newCount);
      onProductsChange({ count: newCount });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#D85A30] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-900">Vos produits et services</h2>
      </div>
      <p className="text-center text-gray-500 mb-8">
        Ajoutez vos produits et services pour que l&apos;assistant puisse renseigner vos clients sur votre offre
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {totalCount > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
          <span className="text-[#0F6E56] font-semibold">{totalCount} produit{totalCount > 1 ? 's' : ''} ajouté{totalCount > 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {mode === 'choose' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="border-2 border-gray-200 hover:border-[#D85A30] rounded-xl p-6 text-center transition-all"
            >
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-medium text-gray-700">Ajouter manuellement</span>
              <p className="text-sm text-gray-500 mt-1">Un par un avec un formulaire rapide</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('csv')}
              className="border-2 border-gray-200 hover:border-[#D85A30] rounded-xl p-6 text-center transition-all"
            >
              <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="font-medium text-gray-700">Importer un fichier</span>
              <p className="text-sm text-gray-500 mt-1">CSV ou Excel</p>
            </button>

            {/* Carte connexion base de données */}
            <button
              type="button"
              onClick={() => setShowDbMessage(true)}
              className="border-2 border-dashed border-gray-200 hover:border-[#D85A30] rounded-xl p-6 text-center transition-all relative sm:col-span-2"
            >
              <span className="absolute top-2 right-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                Bientôt
              </span>
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.44a4.5 4.5 0 00-6.364-6.364L4.49 8.185a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span className="font-medium text-gray-500">Connecter une source externe</span>
              <p className="text-sm text-gray-400 mt-1">Shopify, WooCommerce, Google Sheets...</p>
            </button>
          </div>
        )}

        {showDbMessage && mode === 'choose' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            Cette fonctionnalité sera bientôt disponible. Contactez-nous à <strong>contact@coccinelle.ai</strong> pour une intégration personnalisée.
            <button
              type="button"
              onClick={() => setShowDbMessage(false)}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Fermer
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre du produit</label>
              <input
                type="text"
                value={currentProduct.title}
                onChange={e => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                placeholder="Ex : Coupe femme"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
              <input
                type="text"
                value={currentProduct.description}
                onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                placeholder="Courte description"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (optionnel)</label>
              <input
                type="number"
                value={currentProduct.price}
                onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                placeholder="25.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D85A30] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode('choose')}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm"
              >
                Retour au choix
              </button>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={saving || !currentProduct.title.trim()}
                className="flex-1 px-4 py-2 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {saving ? 'Ajout...' : 'Ajouter ce produit'}
              </button>
            </div>

            {products.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {products.map((p, i) => (
                  <div key={i} className="px-4 py-2 flex justify-between items-center">
                    <span className="text-sm text-gray-700">{p.title}</span>
                    {p.price && <span className="text-sm text-gray-500">{p.price} €</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'csv' && (
          <div className="text-center">
            <label className="block border-2 border-dashed border-gray-300 hover:border-[#D85A30] rounded-xl p-8 cursor-pointer transition-colors">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-gray-600 font-medium">
                {uploading ? 'Import en cours...' : 'Cliquez pour sélectionner un fichier CSV'}
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm"
            >
              Retour au choix
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Retour
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            Passer cette étape
          </button>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={onNext}
              className="px-8 py-3 bg-[#D85A30] hover:bg-[#993C1D] text-white font-semibold rounded-lg transition-colors"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
