'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, RefreshCw, Settings, AlertCircle, ExternalLink, Clock } from 'lucide-react';

type CalendarProvider = 'google' | 'outlook' | 'apple' | 'internal';

interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  email: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSync?: Date;
  eventsCount?: number;
  syncDirection: 'one-way' | 'two-way';
  autoSync: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: CalendarProvider;
}

export default function CalendarIntegration() {
  const [connections, setConnections] = useState<CalendarConnection[]>([
    {
      id: '1',
      provider: 'google',
      email: 'manager@entreprise.com',
      status: 'connected',
      lastSync: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      eventsCount: 42,
      syncDirection: 'two-way',
      autoSync: true
    }
  ]);

  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Visite appartement 3 pièces',
      start: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2h from now
      end: new Date(Date.now() + 1000 * 60 * 60 * 2.5),
      source: 'google'
    },
    {
      id: '2',
      title: 'Réunion d\'équipe',
      start: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4h from now
      end: new Date(Date.now() + 1000 * 60 * 60 * 5),
      source: 'internal'
    }
  ]);

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);

  const providers = [
    {
      id: 'google' as CalendarProvider,
      name: 'Google Calendar',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      description: 'Synchronisez avec Google Calendar',
      oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
    },
    {
      id: 'outlook' as CalendarProvider,
      name: 'Outlook / Microsoft 365',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      description: 'Synchronisez avec Outlook ou Microsoft 365',
      oauthUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    },
    {
      id: 'apple' as CalendarProvider,
      name: 'Apple Calendar',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      description: 'Synchronisez avec iCloud Calendar (CalDAV)',
      oauthUrl: null // CalDAV requires credentials
    },
    {
      id: 'internal' as CalendarProvider,
      name: 'Calendrier Coccinelle',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      description: 'Utilisez le calendrier interne de Coccinelle.AI',
      oauthUrl: null
    }
  ];

  const getConnection = (provider: CalendarProvider) => {
    return connections.find(c => c.provider === provider);
  };

  const handleConnect = (provider: CalendarProvider) => {
    setSelectedProvider(provider);
    setShowConnectionModal(true);

    // Simulate OAuth flow
    if (provider === 'google' || provider === 'outlook') {
      setTimeout(() => {
        setConnections([
          ...connections,
          {
            id: Date.now().toString(),
            provider,
            email: `user@${provider === 'google' ? 'gmail.com' : 'outlook.com'}`,
            status: 'connected',
            lastSync: new Date(),
            eventsCount: 0,
            syncDirection: 'two-way',
            autoSync: true
          }
        ]);
        setShowConnectionModal(false);
        setSelectedProvider(null);
      }, 2000);
    } else if (provider === 'internal') {
      // Internal calendar is always available
      setConnections([
        ...connections,
        {
          id: Date.now().toString(),
          provider: 'internal',
          email: 'Calendrier interne',
          status: 'connected',
          lastSync: new Date(),
          eventsCount: 0,
          syncDirection: 'two-way',
          autoSync: true
        }
      ]);
      setShowConnectionModal(false);
      setSelectedProvider(null);
    }
  };

  const handleDisconnect = (connectionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir déconnecter ce calendrier ?')) {
      setConnections(connections.filter(c => c.id !== connectionId));
    }
  };

  const handleSync = (connectionId: string) => {
    setConnections(connections.map(c =>
      c.id === connectionId
        ? { ...c, status: 'syncing' as const }
        : c
    ));

    // Simulate sync
    setTimeout(() => {
      setConnections(connections.map(c =>
        c.id === connectionId
          ? { ...c, status: 'connected' as const, lastSync: new Date() }
          : c
      ));
    }, 1500);
  };

  const toggleSyncDirection = (connectionId: string) => {
    setConnections(connections.map(c =>
      c.id === connectionId
        ? { ...c, syncDirection: c.syncDirection === 'one-way' ? 'two-way' : 'one-way' }
        : c
    ));
  };

  const toggleAutoSync = (connectionId: string) => {
    setConnections(connections.map(c =>
      c.id === connectionId
        ? { ...c, autoSync: !c.autoSync }
        : c
    ));
  };

  const getStatusBadge = (status: CalendarConnection['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
            <CheckCircle className="w-3 h-3" />
            Connecté
          </span>
        );
      case 'syncing':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Synchronisation...
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
            <XCircle className="w-3 h-3" />
            Erreur
          </span>
        );
      case 'disconnected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
            <XCircle className="w-3 h-3" />
            Déconnecté
          </span>
        );
    }
  };

  const getProviderInfo = (provider: CalendarProvider) => {
    return providers.find(p => p.id === provider);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `dans ${diffMins} min`;
    } else if (diffHours < 24) {
      return `dans ${diffHours}h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) {
      return 'À l\'instant';
    } else if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Calendrier & Intégrations</h2>
        <p className="text-gray-600">
          Connectez vos calendriers externes ou utilisez le calendrier interne de Coccinelle.AI
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Calendriers connectés</p>
          <p className="text-2xl font-bold text-gray-900">{connections.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Événements synchronisés</p>
          <p className="text-2xl font-bold text-blue-600">
            {connections.reduce((sum, c) => sum + (c.eventsCount || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Prochains RDV</p>
          <p className="text-2xl font-bold text-green-600">{upcomingEvents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Sync automatique</p>
          <p className="text-2xl font-bold text-gray-900">
            {connections.filter(c => c.autoSync).length}/{connections.length}
          </p>
        </div>
      </div>

      {/* Calendriers disponibles */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connecter un calendrier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((provider) => {
            const connection = getConnection(provider.id);
            const isConnected = !!connection;

            return (
              <div
                key={provider.id}
                className={`border rounded-lg p-4 transition-all ${
                  isConnected
                    ? `${provider.color} border-2`
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                    <p className="text-xs text-gray-500">{provider.description}</p>
                  </div>
                  {isConnected && getStatusBadge(connection.status)}
                </div>

                {isConnected ? (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Compte :</span>
                      <span className="font-medium text-gray-900">{connection.email}</span>
                    </div>
                    {connection.lastSync && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Dernière sync :</span>
                        <span className="font-medium text-gray-900">
                          {formatLastSync(connection.lastSync)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Événements :</span>
                      <span className="font-medium text-gray-900">{connection.eventsCount || 0}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Synchronisation bidirectionnelle</span>
                        <button
                          onClick={() => toggleSyncDirection(connection.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            connection.syncDirection === 'two-way' ? 'bg-black' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              connection.syncDirection === 'two-way' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Synchronisation automatique</span>
                        <button
                          onClick={() => toggleAutoSync(connection.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            connection.autoSync ? 'bg-black' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              connection.autoSync ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSync(connection.id)}
                        disabled={connection.status === 'syncing'}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black text-white text-sm rounded-lg hover:bg-white transition-colors disabled:bg-gray-400"
                      >
                        <RefreshCw className={`w-4 h-4 ${connection.status === 'syncing' ? 'animate-spin' : ''}`} />
                        Synchroniser
                      </button>
                      <button
                        onClick={() => handleDisconnect(connection.id)}
                        className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Déconnecter
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-white transition-colors"
                  >
                    {provider.oauthUrl && <ExternalLink className="w-4 h-4" />}
                    Connecter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochains événements */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prochains rendez-vous</h3>
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const providerInfo = getProviderInfo(event.source);
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black rounded flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <p className="text-sm text-gray-600">
                        {event.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {event.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{formatRelativeTime(event.start)}</span>
                    {providerInfo && (
                      <span className="text-xl" title={providerInfo.name}>
                        {providerInfo.icon}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paramètres de gestion des conflits */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gestion des conflits</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Que faire en cas de conflit entre calendriers ?
              </p>
              <p className="text-xs text-blue-700">
                Si un créneau est marqué occupé dans un calendrier mais libre dans un autre, Sara ne proposera pas ce créneau pour éviter les doubles réservations.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Blocage préventif</p>
                <p className="text-xs text-gray-500">
                  Bloquer les créneaux 15 minutes avant et après chaque RDV
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-900 transition-colors"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Notification de conflits</p>
                <p className="text-xs text-gray-500">
                  M'alerter quand un conflit est détecté
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-900 transition-colors"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de connexion */}
      {showConnectionModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Connexion à {getProviderInfo(selectedProvider)?.name}
            </h3>
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
              <p className="text-gray-600 text-center">
                Redirection vers la page d'authentification...
              </p>
            </div>
            <button
              onClick={() => {
                setShowConnectionModal(false);
                setSelectedProvider(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
