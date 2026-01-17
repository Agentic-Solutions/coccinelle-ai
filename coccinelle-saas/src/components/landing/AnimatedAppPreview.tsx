'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Calendar, BarChart3, Users, Settings, Home, TrendingUp, Clock } from 'lucide-react';

const modules = [
  {
    id: 'dashboard',
    icon: Home,
    label: 'Vue d\'ensemble',
    content: {
      title: 'Votre activité en un coup d\'œil',
      subtitle: 'Comme votre tableau de bord de voiture : tout ce qui compte, visible immédiatement',
      visual: 'stats',
      liveData: {
        calls: { current: 0, target: 47, label: 'Appels répondus aujourd\'hui', detail: 'Aucun appel perdu' },
        conversion: { current: 0, target: 32, label: 'Clients qui disent oui', detail: '68% de taux de conversion' },
        appointments: { current: 0, target: 23, label: 'Rendez-vous confirmés', detail: 'Tous rappelés automatiquement' }
      }
    }
  },
  {
    id: 'omnichannel',
    icon: MessageSquare,
    label: 'Tous vos canaux',
    content: {
      title: 'Un seul endroit pour tous vos échanges clients',
      subtitle: 'Téléphone, SMS, WhatsApp, Email : tout est centralisé',
      visual: 'omnichannel',
      channels: [
        { name: 'Téléphone', count: 47, label: 'appels aujourd\'hui', status: 'Tous répondus automatiquement' },
        { name: 'WhatsApp', count: 28, label: 'conversations actives', status: '12 messages en attente' },
        { name: 'SMS', count: 15, label: 'messages envoyés', status: 'Taux d\'ouverture 94%' },
        { name: 'Email', count: 8, label: 'emails reçus', status: 'Tous traités' }
      ],
      insight: 'Vos clients vous contactent par 4 canaux différents, vous gérez tout au même endroit'
    }
  },
  {
    id: 'calls',
    icon: Phone,
    label: 'Appels clients',
    content: {
      title: 'Chaque appel est géré, même à 22h',
      subtitle: 'Votre assistant virtuel décroche, comprend et note tout',
      visual: 'conversation',
      example: {
        caller: 'Sophie Martin',
        time: 'Hier, 20h35',
        transcript: [
          { speaker: 'client', text: 'Bonjour, je cherche des informations sur vos services' },
          { speaker: 'ai', text: 'Bonjour Sophie ! Avec plaisir. Quel type de service vous intéresse ?' },
          { speaker: 'client', text: 'Je voudrais un devis pour mon entreprise' },
          { speaker: 'ai', text: 'Parfait ! Je peux vous proposer un rendez-vous demain à 14h30 ?' }
        ],
        outcome: 'Rendez-vous pris automatiquement',
        sentiment: 'positive'
      }
    }
  },
  {
    id: 'messages',
    icon: MessageSquare,
    label: 'Messages',
    content: {
      title: 'Tous vos messages au même endroit',
      subtitle: 'SMS, WhatsApp, emails : fini de chercher dans 5 apps différentes',
      visual: 'inbox',
      conversations: [
        { name: 'Thomas Dubois', channel: 'WhatsApp', preview: 'Merci pour le devis, quand pouvez...', time: 'Il y a 5 min', unread: true },
        { name: 'Marie Legrand', channel: 'SMS', preview: 'Je confirme le RDV de demain', time: 'Il y a 1h', unread: false },
        { name: 'Pierre Martin', channel: 'Email', preview: 'Question sur la facturation', time: 'Hier', unread: true }
      ],
      suggestion: 'Réponse suggérée: "Bonjour Thomas, je peux vous rappeler demain matin ?"'
    }
  },
  {
    id: 'appointments',
    icon: Calendar,
    label: 'Agenda',
    content: {
      title: 'Les clients prennent RDV tout seuls',
      subtitle: 'Votre agenda se remplit automatiquement, vous n\'avez rien à faire',
      visual: 'calendar',
      todayAppointments: [
        { time: '09:00', client: 'Sophie Martin', type: 'Premier contact', status: 'confirmed', icon: '' },
        { time: '11:30', client: 'Marc Durand', type: 'Devis personnalisé', status: 'confirmed', icon: '' },
        { time: '14:00', client: 'Julie Bernard', type: 'Suivi projet', status: 'reminded', icon: '' },
        { time: '16:30', client: 'Libre', type: '', status: 'available', icon: '' }
      ],
      stats: { confirmed: 3, reminded: 3, noShow: 0 }
    }
  },
  {
    id: 'prospects',
    icon: Users,
    label: 'Contacts',
    content: {
      title: 'Vos contacts se classent automatiquement',
      subtitle: 'Les plus intéressés en haut, les moins pressés en bas',
      visual: 'contacts',
      leads: [
        { name: 'Sophie Martin', score: 95, status: 'Très intéressée', lastContact: 'Appel hier 20h35', nextAction: 'RDV demain 14h30', color: 'green' },
        { name: 'Thomas Dubois', score: 78, status: 'Intéressé', lastContact: 'WhatsApp il y a 5min', nextAction: 'Envoyer devis', color: 'yellow' },
        { name: 'Marie Legrand', score: 45, status: 'À recontacter', lastContact: 'Email la semaine dernière', nextAction: 'Relance dans 3 jours', color: 'gray' }
      ],
      totalLeads: 47,
      hotLeads: 12
    }
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Statistiques',
    content: {
      title: 'Suivez ce qui marche vraiment',
      subtitle: 'Vos chiffres clés mis à jour en direct',
      visual: 'charts',
      metrics: [
        { label: 'Taux de réponse', value: 95, target: 100, unit: '%', trend: '+12%', color: 'gray' },
        { label: 'Appels → RDV', value: 68, target: 100, unit: '%', trend: '+5%', color: 'gray' },
        { label: 'Temps de réponse moyen', value: 8, target: 30, unit: 'sec', trend: '-15 sec', color: 'gray' }
      ],
      insight: 'Vos clients obtiennent une réponse 3x plus vite qu\'avant'
    }
  }
];

export default function AnimatedAppPreview() {
  const [activeModule, setActiveModule] = useState(0);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule((prev) => (prev + 1) % modules.length);
      setAnimatedValues({}); // Reset animations
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Animate numbers
  useEffect(() => {
    const current = modules[activeModule];
    if (current.content.liveData) {
      const data = current.content.liveData;
      Object.keys(data).forEach((key) => {
        const target = data[key as keyof typeof data].target;
        let count = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
          count += increment;
          if (count >= target) {
            count = target;
            clearInterval(timer);
          }
          setAnimatedValues((prev) => ({ ...prev, [key]: Math.floor(count) }));
        }, 30);
      });
    }
  }, [activeModule]);

  const current = modules[activeModule];
  const Icon = current.icon;

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Browser-like container */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Browser header */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-md text-sm text-gray-600">
              app.coccinelle.ai
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="flex h-[550px] bg-gray-50">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 p-4 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
              <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="text-white font-semibold text-lg">coccinelle.ai</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {modules.map((module, index) => {
                const ModuleIcon = module.icon;
                const isActive = index === activeModule;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'bg-gray-700 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <ModuleIcon className="w-5 h-5" />
                    <span className="font-medium text-sm">{module.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Settings */}
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
              <Settings className="w-5 h-5" />
              <span className="font-medium text-sm">Paramètres</span>
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div key={activeModule} className="animate-fadeIn">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{current.content.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{current.content.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Visual content */}
              <div className="space-y-4">
                {/* Stats Dashboard */}
                {current.content.visual === 'stats' && current.content.liveData && (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(current.content.liveData).map(([key, data]) => (
                      <div key={key} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-sm text-gray-600 mb-2">{data.label}</p>
                        <div className="flex items-baseline gap-2 mb-2">
                          <p className="text-4xl font-bold text-gray-900">{animatedValues[key] || 0}</p>
                          {data.unit && <span className="text-lg text-gray-500">{data.unit}</span>}
                        </div>
                        <p className="text-xs text-gray-500">{data.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Omnichannel Channels */}
                {current.content.visual === 'omnichannel' && current.content.channels && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {current.content.channels.map((channel, i) => (
                        <div
                          key={i}
                          className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                          style={{ animation: `slideIn 0.3s ease-out ${i * 0.1}s both` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-3xl font-bold text-gray-900">{channel.count}</p>
                            <span className="text-sm text-gray-500">{channel.label}</span>
                          </div>
                          <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{channel.status}</p>
                        </div>
                      ))}
                    </div>

                    {current.content.insight && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-lg">→</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{current.content.insight}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation Example */}
                {current.content.visual === 'conversation' && current.content.example && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Phone className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{current.content.example.caller}</p>
                          <p className="text-xs text-gray-500">{current.content.example.time}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {current.content.example.transcript.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.speaker === 'client' ? 'justify-start' : 'justify-end'}`}
                            style={{ animation: `slideIn 0.3s ease-out ${i * 0.2}s both` }}
                          >
                            <div className={`max-w-[80%] p-3 rounded-lg ${
                              msg.speaker === 'client'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-gray-900 text-white'
                            }`}>
                              <p className="text-sm">{msg.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-700 font-medium">→ {current.content.example.outcome}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages Inbox */}
                {current.content.visual === 'inbox' && current.content.conversations && (
                  <div className="space-y-3">
                    {current.content.conversations.map((conv, i) => (
                      <div
                        key={i}
                        className={`bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                          conv.unread ? 'border-l-4 border-l-gray-900' : ''
                        }`}
                        style={{ animation: `slideIn 0.3s ease-out ${i * 0.1}s both` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-700">{conv.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className={`font-semibold ${conv.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                                {conv.name}
                              </p>
                              <p className="text-xs text-gray-500">{conv.channel}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">{conv.time}</span>
                        </div>
                        <p className={`text-sm ${conv.unread ? 'text-gray-900' : 'text-gray-500'}`}>
                          {conv.preview}
                        </p>
                      </div>
                    ))}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-4">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">→ </span>
                        {current.content.suggestion}
                      </p>
                    </div>
                  </div>
                )}

                {/* Calendar View */}
                {current.content.visual === 'calendar' && current.content.todayAppointments && (
                  <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 mb-3">Aujourd'hui</p>
                      {current.content.todayAppointments.map((apt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ animation: `slideIn 0.3s ease-out ${i * 0.1}s both` }}
                        >
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-gray-900">{apt.time}</p>
                          </div>
                          <div className="flex-1">
                            {apt.client !== 'Libre' ? (
                              <>
                                <p className="font-semibold text-gray-900">{apt.client}</p>
                                <p className="text-sm text-gray-500">{apt.type}</p>
                              </>
                            ) : (
                              <p className="text-gray-400 italic">Créneau disponible</p>
                            )}
                          </div>
                          {apt.icon && <span className="text-xl">{apt.icon}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">→ </span>
                        {current.content.stats?.confirmed} RDV confirmés · Aucune absence ce mois
                      </p>
                    </div>
                  </div>
                )}

                {/* Contacts/Leads */}
                {current.content.visual === 'contacts' && current.content.leads && (
                  <div className="space-y-3">
                    {current.content.leads.map((lead, i) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                        style={{ animation: `slideIn 0.3s ease-out ${i * 0.1}s both` }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-700">{lead.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{lead.name}</p>
                              <p className="text-xs text-gray-500">{lead.lastContact}</p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            lead.color === 'green' ? 'bg-green-100 text-green-800' :
                            lead.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {lead.score}/100
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{lead.status}</p>
                        <p className="text-sm text-gray-500">→ {lead.nextAction}</p>
                      </div>
                    ))}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">→ </span>
                        {current.content.hotLeads} contacts très intéressés sur {current.content.totalLeads} au total
                      </p>
                    </div>
                  </div>
                )}

                {/* Analytics Charts */}
                {current.content.visual === 'charts' && current.content.metrics && (
                  <div className="space-y-4">
                    {current.content.metrics.map((metric, i) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-lg border border-gray-200"
                        style={{ animation: `slideIn 0.3s ease-out ${i * 0.15}s both` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-900">{metric.label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">{metric.value}{metric.unit}</span>
                            <span className="text-xs text-green-600 font-medium">{metric.trend}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-gray-700 to-gray-900 transition-all duration-1000"
                            style={{ width: `${(metric.value / metric.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">→ </span>
                        {current.content.insight}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live indicator */}
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Mis à jour en temps réel
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
