'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import CommunicationPreferencesTab from '@/components/customers/CommunicationPreferencesTab';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag,
  Euro, MessageSquare, Tag, Edit, Save, X, Plus,
  TrendingUp, Clock, Package, FileText, Activity,
  Home, Users, Settings, Bell
} from 'lucide-react';

// Types
interface CommunicationPreferences {
  preferredChannel: 'email' | 'sms' | 'whatsapp' | 'phone';
  emailOptIn: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  phoneOptIn: boolean;
  marketingOptIn: boolean;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  doNotDisturb: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  };
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  preferredChannel?: string;
  communicationPreferences?: CommunicationPreferences;
  segment?: string;
  tags?: string[];
  totalOrders: number;
  totalSpent: { amount: number; currency: string };
  averageOrderValue: { amount: number; currency: string };
  createdAt: Date;
  lastOrderAt?: Date;
  defaultAddress?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

interface CustomerActivity {
  id: string;
  type: string;
  channel?: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface CustomerNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activities, setActivities] = useState<CustomerActivity[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'notes' | 'preferences'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editedPreferences, setEditedPreferences] = useState<CommunicationPreferences | null>(null);

  // Charger les données (TODO: remplacer par vraie API)
  useEffect(() => {
    setTimeout(() => {
      // Mock data
      const mockCustomer: Customer = {
        id: customerId,
        firstName: 'Julie',
        lastName: 'Martin',
        email: 'julie.martin@example.com',
        phone: '+33601020304',
        preferredChannel: 'sms',
        communicationPreferences: {
          preferredChannel: 'sms',
          emailOptIn: true,
          smsOptIn: true,
          whatsappOptIn: false,
          phoneOptIn: true,
          marketingOptIn: true,
          frequency: 'daily',
          doNotDisturb: {
            enabled: true,
            startTime: '20:00',
            endTime: '08:00'
          }
        },
        segment: 'vip',
        tags: ['fidele', 'actif', 'vip'],
        totalOrders: 12,
        totalSpent: { amount: 1280, currency: 'EUR' },
        averageOrderValue: { amount: 106.67, currency: 'EUR' },
        createdAt: new Date('2024-01-15'),
        lastOrderAt: new Date('2025-11-10'),
        defaultAddress: {
          street: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
      };

      const mockActivities: CustomerActivity[] = [
        {
          id: '1',
          type: 'message_received',
          channel: 'sms',
          description: 'Message reçu: "Bonjour, avez-vous la robe en 38 ?"',
          timestamp: new Date('2025-11-15T14:30:00'),
        },
        {
          id: '2',
          type: 'order_placed',
          channel: 'website',
          description: 'Commande #2847 passée - 89,90€',
          timestamp: new Date('2025-11-10T16:20:00'),
        },
        {
          id: '3',
          type: 'message_sent',
          channel: 'sms',
          description: 'Message envoyé: "Bonjour Julie, votre colis a été expédié!"',
          timestamp: new Date('2025-11-08T10:15:00'),
        },
      ];

      const mockNotes: CustomerNote[] = [
        {
          id: '1',
          content: 'Cliente très fidèle, toujours satisfaite de ses achats',
          createdBy: 'Assistanth (propriétaire)',
          createdAt: new Date('2025-10-20'),
        },
        {
          id: '2',
          content: 'Préfère les robes et les couleurs vives',
          createdBy: 'IA Coccinelle',
          createdAt: new Date('2025-11-01'),
        },
      ];

      setCustomer(mockCustomer);
      setActivities(mockActivities);
      setNotes(mockNotes);
      setIsLoading(false);
    }, 500);
  }, [customerId]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: CustomerNote = {
      id: Date.now().toString(),
      content: newNote,
      createdBy: 'Vous',
      createdAt: new Date(),
    };

    setNotes([note, ...notes]);
    setNewNote('');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_received':
      case 'message_sent':
        return <MessageSquare className="w-5 h-5" />;
      case 'order_placed':
        return <ShoppingBag className="w-5 h-5" />;
      case 'note_added':
        return <FileText className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'message_received':
        return 'bg-blue-100 text-blue-600';
      case 'message_sent':
        return 'bg-green-100 text-green-600';
      case 'order_placed':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading || !customer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
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
        {/* Breadcrumb */}
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux clients
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {customer.firstName[0]}{customer.lastName[0]}
              </div>

              {/* Info */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {customer.firstName} {customer.lastName}
                </h1>
                <div className="flex items-center gap-4 text-gray-600">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {customer.segment && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      {customer.segment.toUpperCase()}
                    </span>
                  )}
                  {customer.tags?.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isEditing ? <X className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                {isEditing ? 'Annuler' : 'Modifier'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <MessageSquare className="w-5 h-5" />
                Envoyer message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total commandes</span>
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{customer.totalOrders}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total dépensé</span>
            <Euro className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{customer.totalSpent.amount.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Panier moyen</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{customer.averageOrderValue.amount.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Client depuis</span>
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {Math.floor((new Date().getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24))} j
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="border-b border-gray-200">
          <div className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Préférences
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Activité ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Notes ({notes.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{customer.email || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-medium text-gray-900">{customer.phone || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">Canal préféré</p>
                      <select
                        value={customer.preferredChannel || 'email'}
                        onChange={(e) => {
                          const newChannel = e.target.value as 'email' | 'sms' | 'whatsapp' | 'phone';
                          setCustomer({
                            ...customer,
                            preferredChannel: newChannel,
                            communicationPreferences: customer.communicationPreferences ? {
                              ...customer.communicationPreferences,
                              preferredChannel: newChannel
                            } : undefined
                          });
                          // TODO: Sauvegarder via API
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-gray-900 cursor-pointer"
                      >
                        <option value="email">📧 Email</option>
                        <option value="sms">💬 SMS</option>
                        <option value="whatsapp">📱 WhatsApp</option>
                        <option value="phone">📞 Téléphone</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Adresse</p>
                      {customer.defaultAddress ? (
                        <p className="font-medium text-gray-900">
                          {customer.defaultAddress.city}, {customer.defaultAddress.postalCode}
                        </p>
                      ) : (
                        <p className="font-medium text-gray-900">Non renseignée</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dernière activité</h3>
                <div className="space-y-3">
                  {activities.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.description}</p>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {activity.timestamp.toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique complet</h3>
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {activity.timestamp.toLocaleString('fr-FR')}
                      {activity.channel && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="capitalize">{activity.channel}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'preferences' && customer?.communicationPreferences && (
            <CommunicationPreferencesTab
              preferences={customer.communicationPreferences}
              onSave={(newPrefs) => {
                if (customer) {
                  setCustomer({
                    ...customer,
                    communicationPreferences: newPrefs,
                    preferredChannel: newPrefs.preferredChannel
                  });
                }
                // TODO: Sauvegarder via API
                console.log('Preferences saved:', newPrefs);
              }}
            />
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajouter une note</h3>
                <div className="flex gap-3">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ajoutez une note sur ce client..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {note.createdBy[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{note.createdBy}</p>
                          <p className="text-sm text-gray-600">{note.createdAt.toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
