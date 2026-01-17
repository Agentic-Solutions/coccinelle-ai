'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Home, ShoppingBag, UtensilsCrossed, Briefcase, CheckCircle, AlertCircle, Package, Car, Book, Smartphone, Music, Heart, ShoppingCart, Laptop, Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

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

export default function NewProductPage() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Agents state
  const [agents, setAgents] = useState<Array<{id: string; name: string}>>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentId, setAgentId] = useState<string>('');

  // Form state
  const [category, setCategory] = useState<string>('');
  const [type, setType] = useState<string>('product'); // 'service' ou 'product'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('EUR');
  const [available, setAvailable] = useState(true);
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [tags, setTags] = useState('');

  // Variants
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<Array<{
    sku: string;
    attributes: Record<string, string>;
    stock: number;
    price?: number;
  }>>([{ sku: '', attributes: {}, stock: 0 }]);

  // Location
  const [locationCity, setLocationCity] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  // Charger les catégories et agents depuis l'API
  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchAgents();
    }
  }, [tenantId]); // Re-charger si tenantId change

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch(`/api/proxy?path=/api/v1/product-categories&tenantId=${tenantId}`);
      const data = await response.json();

      if (data.success && data.categories.length > 0) {
        setCategories(data.categories);
        // Sélectionner la première catégorie par défaut
        setCategory(data.categories[0].key);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const response = await fetch(`/api/proxy?path=/api/v1/agents&tenantId=${tenantId}`);
      const data = await response.json();

      if (data.success && data.agents) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAttributeChange = (key: string, value: any, type: string) => {
    setAttributes(prev => ({
      ...prev,
      [key]: type === 'checkbox' ? value : (type === 'number' ? Number(value) : value)
    }));
  };

  const addVariant = () => {
    setVariants([...variants, { sku: '', attributes: {}, stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: string, value: any) => {
    const updated = [...variants];
    if (field === 'sku' || field === 'stock' || field === 'price') {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      // C'est un attribut (color, size, etc.)
      updated[index] = {
        ...updated[index],
        attributes: { ...updated[index].attributes, [field]: value }
      };
    }
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        category,
        type, // 'service' ou 'product'
        title,
        description,
        price: Number(price),
        price_currency: priceCurrency,
        available: available ? 1 : 0,
        attributes,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        agent_id: agentId || null,
        assignment_type: agentId ? 'exclusive' : 'shared'
      };

      // Ajouter la localisation uniquement pour l'immobilier
      if (category === 'real_estate') {
        payload.location = {
          city: locationCity,
          postal_code: locationPostalCode,
          address: locationAddress
        };
      }

      // Ajouter les variantes si applicable
      if (hasVariants) {
        payload.has_variants = 1;
        payload.variants = variants.map(v => ({
          sku: v.sku,
          attributes: v.attributes,
          stock_quantity: Number(v.stock),
          price: v.price ? Number(v.price) : null
        }));
      }

      const res = await fetch(`/api/proxy?path=/api/v1/products&tenantId=${tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/products');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du produit');
    } finally {
      setSaving(false);
    }
  };

  const config = categories.find(cat => cat.key === category);
  const Icon = config ? (ICON_MAP[config.icon] || Package) : Package;

  // Placeholders dynamiques selon la catégorie
  const getTitlePlaceholder = () => {
    switch(category) {
      case 'real_estate': return 'Ex: Appartement 3 pièces Paris';
      case 'retail': return 'Ex: Nike Air Max 90';
      case 'shoes': return 'Ex: Nike Air Max 90'; // Legacy support
      case 'clothing': return 'Ex: T-shirt Nike Dri-FIT';
      case 'food': return 'Ex: Pizza Margherita';
      case 'services': return 'Ex: Réparation plomberie';
      case 'vehicles': return 'Ex: Renault Clio 2020';
      case 'electronics': return 'Ex: iPhone 15 Pro Max';
      case 'books': return 'Ex: Clean Code - Robert Martin';
      default: return 'Ex: Nom du produit';
    }
  };

  const getDescriptionPlaceholder = () => {
    switch(category) {
      case 'real_estate': return 'Description détaillée du bien immobilier...';
      case 'retail': return 'Marque, modèle, couleur, caractéristiques...';
      case 'shoes': return 'Marque, modèle, matériaux, caractéristiques...'; // Legacy support
      case 'clothing': return 'Description de l\'article, matières, coupe...';
      case 'food': return 'Ingrédients, préparation, allergènes...';
      case 'services': return 'Détails de la prestation, durée, zone d\'intervention...';
      default: return 'Description détaillée du produit...';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
              <p className="text-sm text-gray-500 mt-1">
                Créez un nouveau produit multi-secteurs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Produit créé avec succès</p>
              <p className="text-sm text-green-700">Redirection en cours...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-6">

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              {loadingCategories ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Chargement des catégories...
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setAttributes({});
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loadingCategories}
                >
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected Category Icon */}
            {config && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Icon className={`w-6 h-6 ${
                  config.color === 'blue' ? 'text-blue-600' :
                  config.color === 'purple' ? 'text-purple-600' :
                  config.color === 'orange' ? 'text-orange-600' :
                  config.color === 'green' ? 'text-green-600' :
                  config.color === 'red' ? 'text-red-600' :
                  config.color === 'yellow' ? 'text-yellow-600' :
                  'text-gray-600'
                }`} />
                <span className="font-medium text-gray-900">{config.name}</span>
                {config.description && (
                  <span className="text-sm text-gray-500">• {config.description}</span>
                )}
              </div>
            )}

            {/* Type: Service ou Produit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setType('product')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    type === 'product'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Package className="w-5 h-5 mx-auto mb-1" />
                  Produit
                </button>
                <button
                  type="button"
                  onClick={() => setType('service')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    type === 'service'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <Briefcase className="w-5 h-5 mx-auto mb-1" />
                  Service
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {type === 'product' ? 'Bien matériel ou marchandise' : 'Prestation ou service'}
              </p>
            </div>

            {/* Agent Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent assigné
              </label>
              {loadingAgents ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Chargement des agents...
                </div>
              ) : (
                <select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loadingAgents}
                >
                  <option value="">Aucun agent (partagé)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {agentId ? 'Agent exclusif pour ce produit' : 'Produit visible par tous les agents'}
              </p>
            </div>

            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getTitlePlaceholder()}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getDescriptionPlaceholder()}
              />
            </div>

            {/* Price */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise
                </label>
                <select
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Category-Specific Attributes */}
            {config && config.fields && config.fields.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  Attributs spécifiques - {config.name}
                </h3>
                <div className="space-y-4">
                  {config.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={attributes[field.key] || false}
                          onChange={(e) => handleAttributeChange(field.key, e.target.checked, field.type)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={attributes[field.key] || ''}
                          onChange={(e) => handleAttributeChange(field.key, e.target.value, field.type)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={field.label}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location - Only for real estate */}
            {category === 'real_estate' && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  Localisation
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Paris"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code postal
                      </label>
                      <input
                        type="text"
                        value={locationPostalCode}
                        onChange={(e) => setLocationPostalCode(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="75001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 rue de Rivoli"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="nouveau, promotion, populaire"
              />
            </div>

            {/* Availability */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="available"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="available" className="text-sm font-medium text-gray-700">
                Produit disponible
              </label>
            </div>

            {/* Variants Toggle */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">
                  Ce produit a des variantes (couleur, taille, etc.)
                </label>
              </div>

              {/* Variants Section */}
              {hasVariants && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">Variantes du produit</h4>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter variante
                    </button>
                  </div>

                  {variants.map((variant, index) => (
                    <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Variante {index + 1}</span>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            SKU *
                          </label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="PROD-RED-42"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Stock *
                          </label>
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Couleur
                          </label>
                          <input
                            type="text"
                            value={variant.attributes.color || ''}
                            onChange={(e) => updateVariant(index, 'color', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Rouge, Bleu..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Taille
                          </label>
                          <input
                            type="text"
                            value={variant.attributes.size || ''}
                            onChange={(e) => updateVariant(index, 'size', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="42, M, L..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Prix spécifique (optionnel, sinon prix de base)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="129.99"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
            <Link
              href="/dashboard/products"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Créer le produit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
