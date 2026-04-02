'use client';

import {
  Phone, PhoneIncoming, Clock, TrendingUp,
  PhoneOutgoing, PhoneMissed, ArrowUp, ArrowDown
} from 'lucide-react';

// ── Données mock pour démo Nubbo ─────────────────────

const metrics = [
  { label: "Appels aujourd'hui", value: '47', change: +12, icon: Phone },
  { label: 'Appels entrants', value: '28', change: +8, icon: PhoneIncoming },
  { label: 'Durée moyenne', value: '3m 42s', change: +5, icon: Clock },
  { label: 'Taux de réponse', value: '94%', change: -2, icon: TrendingUp },
];

const recentCalls = [
  { name: 'Marie Martin', phone: '+33 6 12 34 56 78', duration: '4m 23s', ago: 'il y a 5 min', type: 'inbound' as const },
  { name: 'Pierre Durand', phone: '+33 1 23 45 67 89', duration: '12m 05s', ago: 'il y a 15 min', type: 'outbound' as const },
  { name: 'Inconnu', phone: '+33 7 89 01 23 45', duration: '-', ago: 'il y a 23 min', type: 'missed' as const },
  { name: 'Lucas Bernard', phone: '+33 6 45 67 89 01', duration: '2m 45s', ago: 'il y a 30 min', type: 'inbound' as const },
  { name: 'Sophie Petit', phone: '+33 6 78 90 12 34', duration: '0m 52s', ago: 'il y a 45 min', type: 'outbound' as const },
];

// ── Helpers ───────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCallIcon(type: 'inbound' | 'outbound' | 'missed') {
  switch (type) {
    case 'inbound':
      return <PhoneIncoming className="w-4 h-4 text-gray-500" />;
    case 'outbound':
      return <PhoneOutgoing className="w-4 h-4 text-gray-500" />;
    case 'missed':
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
  }
}

function getCallLabel(type: 'inbound' | 'outbound' | 'missed'): string {
  switch (type) {
    case 'inbound': return 'Entrant';
    case 'outbound': return 'Sortant';
    case 'missed': return 'Manqué';
  }
}

// ── Composant ────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Titre */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change >= 0;
          return (
            <div
              key={metric.label}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{metric.label}</p>
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <ArrowUp className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-500'
                }`}>
                  {isPositive ? '+' : ''}{metric.change}%
                </span>
                <span className="text-sm text-gray-400 ml-1">vs hier</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Appels récents */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Appels récents</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCalls.map((call, index) => (
            <div
              key={index}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar initiales */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                call.type === 'missed'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {getInitials(call.name)}
              </div>

              {/* Nom et numéro */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  call.type === 'missed' ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {call.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{call.phone}</p>
              </div>

              {/* Type d'appel */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {getCallIcon(call.type)}
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {getCallLabel(call.type)}
                </span>
              </div>

              {/* Durée */}
              <div className="text-sm text-gray-600 w-16 text-right flex-shrink-0">
                {call.duration}
              </div>

              {/* Temps relatif */}
              <div className="text-xs text-gray-400 w-24 text-right flex-shrink-0 hidden sm:block">
                {call.ago}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
