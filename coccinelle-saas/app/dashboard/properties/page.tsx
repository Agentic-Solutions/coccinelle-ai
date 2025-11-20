'use client';

import { useState } from 'react';
import { Home, Plus, Search, Filter, MapPin, Euro, Bed, Bath, Maximize, Edit, Trash2, Eye, TrendingUp, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import Link from 'next/link';

interface Property {
  id: string;
  title: string;
  type: 'apartment' | 'house' | 'land' | 'commercial';
  status: 'available' | 'under_offer' | 'sold';
  price: number;
  location: string;
  bedrooms?: number;
  bathrooms?: number;
  surface: number;
  description: string;
  images: string[];
  createdAt: string;
  matches: number;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([
    {
      id: '1',
      title: 'Appartement moderne T3',
      type: 'apartment',
      status: 'available',
      price: 285000,
      location: 'Paris 15ème',
      bedrooms: 3,
      bathrooms: 2,
      surface: 75,
      description: 'Magnifique T3 rénové avec balcon',
      images: [],
      createdAt: '2025-01-10',
      matches: 12
    },
    {
      id: '2',
      title: 'Maison familiale avec jardin',
      type: 'house',
      status: 'available',
      price: 520000,
      location: 'Versailles',
      bedrooms: 5,
      bathrooms: 3,
      surface: 150,
      description: 'Belle maison avec jardin de 300m²',
      images: [],
      createdAt: '2025-01-08',
      matches: 8
    },
    {
      id: '3',
      title: 'Studio centre-ville',
      type: 'apartment',
      status: 'under_offer',
      price: 165000,
      location: 'Lyon 2ème',
      bedrooms: 1,
      bathrooms: 1,
      surface: 28,
      description: 'Studio refait à neuf',
      images: [],
      createdAt: '2025-01-05',
      matches: 15
    },
    {
      id: '4',
      title: 'Terrain constructible',
      type: 'land',
      status: 'available',
      price: 95000,
      location: 'Fontainebleau',
      surface: 800,
      description: 'Terrain viabilisé',
      images: [],
      createdAt: '2025-01-03',
      matches: 3
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const stats = {
    total: properties.length,
    available: properties.filter(p => p.status === 'available').length,
    underOffer: properties.filter(p => p.status === 'under_offer').length,
    sold: properties.filter(p => p.status === 'sold').length,
    averagePrice: Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length),
    totalMatches: properties.reduce((sum, p) => sum + p.matches, 0)
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || property.type === filterType;
    const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    const labels = {
      apartment: 'Appartement',
      house: 'Maison',
      land: 'Terrain',
      commercial: 'Commercial'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      available: { label: 'Disponible', class: 'bg-green-50 text-green-700 border-green-200' },
      under_offer: { label: 'Sous offre', class: 'bg-orange-50 text-orange-700 border-orange-200' },
      sold: { label: 'Vendu', class: 'bg-gray-50 text-gray-700 border-gray-200' }
    };
    const { label, class: className } = config[status as keyof typeof config] || config.available;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${className}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Logo size={48} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Catalogue de biens</h1>
              <p className="text-sm text-gray-600">Gérez votre inventaire immobilier</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Home className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Disponibles</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-600">Sous offre</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.underOffer}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">Vendus</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{stats.sold}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Prix moyen</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{stats.averagePrice.toLocaleString()}€</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-purple-700 font-medium">IA Matches</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{stats.totalMatches}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, localisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="apartment">Appartements</option>
              <option value="house">Maisons</option>
              <option value="land">Terrains</option>
              <option value="commercial">Commerces</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">Tous statuts</option>
              <option value="available">Disponible</option>
              <option value="under_offer">Sous offre</option>
              <option value="sold">Vendu</option>
            </select>

            <button className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter un bien
            </button>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Home className="w-16 h-16 text-gray-400" />
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{property.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {property.location}
                    </div>
                  </div>
                  {getStatusBadge(property.status)}
                </div>

                <div className="flex items-center gap-1 mb-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {getTypeLabel(property.type)}
                  </span>
                  {property.matches > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                      {property.matches} matches IA
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {property.price.toLocaleString()} €
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      {property.bedrooms}
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath className="w-4 h-4" />
                      {property.bathrooms}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Maximize className="w-4 h-4" />
                    {property.surface}m²
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    Voir
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun bien trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
