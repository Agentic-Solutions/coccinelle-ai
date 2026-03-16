'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  HomeIcon,
  PhoneIcon,
  InboxIcon,
  CalendarIcon,
  UsersIcon,
  ShoppingBagIcon,
  BookOpenIcon,
  BarChartIcon,
  SettingsIcon,
  GlobeIcon,
} from './landing/icons';

// ─── Sidebar menu items ───
const sidebarItems = [
  { label: 'Tableau de bord', icon: HomeIcon },
  { label: 'Appels', icon: PhoneIcon },
  { label: 'Inbox', icon: InboxIcon },
  { label: 'Rendez-vous', icon: CalendarIcon },
  { label: 'Prospects', icon: UsersIcon },
  { label: 'Produits', icon: ShoppingBagIcon },
  { label: 'Connaissances', icon: BookOpenIcon },
  { label: 'Canaux', icon: SettingsIcon },
  { label: 'Analytics', icon: BarChartIcon },
  { label: 'Reservation', icon: GlobeIcon },
];

// ─── Tour screen data ───
interface TourScreen {
  title: string;
  url: string;
  sidebarIndex: number;
  value: string;
  content: React.ReactNode;
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorMap[color] || colorMap.gray}`}>
      {status}
    </span>
  );
}

// ── Screen 1: Dashboard ──
function DashboardScreen() {
  const kpis = [
    { label: "Appels aujourd'hui", value: '23', change: '+15%', positive: true },
    { label: 'RDV confirmés', value: '8', change: '+3', positive: true },
    { label: 'Taux conversion', value: '68%', change: '+5pts', positive: true },
  ];
  const weekData = [
    { day: 'L', h: 60 },
    { day: 'M', h: 80 },
    { day: 'M', h: 45 },
    { day: 'J', h: 70 },
    { day: 'V', h: 90 },
    { day: 'S', h: 30 },
    { day: 'D', h: 15 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{k.value}</span>
              <span className="text-xs text-emerald-600 font-medium">{k.change}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-3">Appels cette semaine</p>
        <div className="flex items-end gap-2 h-24">
          {weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-[#D85A30] rounded-t"
                style={{ height: `${d.h}%` }}
              />
              <span className="text-[10px] text-gray-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen 2: Call History ──
function CallHistoryScreen() {
  const calls = [
    { caller: 'Jean Dupont', duration: '3:24', result: 'RDV pris', sentiment: 'Positif', sentimentColor: 'green' },
    { caller: 'Marie Lambert', duration: '1:48', result: 'Information', sentiment: 'Neutre', sentimentColor: 'gray' },
    { caller: 'Pierre Roux', duration: '5:12', result: 'Rappel demande', sentiment: 'Positif', sentimentColor: 'green' },
    { caller: 'Sophie Bernard', duration: '2:35', result: 'Transféré', sentiment: 'Neutre', sentimentColor: 'gray' },
    { caller: 'Luc Martin', duration: '4:07', result: 'RDV pris', sentiment: 'Positif', sentimentColor: 'green' },
  ];
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-medium text-gray-600">Appelant</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Durée</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Résultat</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{c.caller}</td>
              <td className="px-3 py-2 text-gray-600">{c.duration}</td>
              <td className="px-3 py-2"><StatusBadge status={c.result} color={c.result === 'RDV pris' ? 'green' : c.result === 'Transféré' ? 'blue' : 'yellow'} /></td>
              <td className="px-3 py-2"><StatusBadge status={c.sentiment} color={c.sentimentColor} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Screen 3: Inbox ──
function InboxScreen() {
  const conversations = [
    { name: 'Jean Dupont', channel: 'SMS', time: '14:32', unread: 0, preview: 'Merci pour le RDV de demain' },
    { name: 'Marie Lambert', channel: 'Email', time: '13:15', unread: 2, preview: 'Question sur vos tarifs...' },
    { name: 'Pierre Roux', channel: 'Appel', time: '12:04', unread: 0, preview: 'RDV pris pour jeudi 10h' },
    { name: 'Sophie Bernard', channel: 'Email', time: '11:30', unread: 0, preview: 'Bien reçu, à bientôt' },
  ];
  return (
    <div className="space-y-2">
      {conversations.map((c, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 bg-white rounded-lg p-3 border ${c.unread ? 'border-[#D85A30] bg-orange-50/30' : 'border-gray-200'}`}
        >
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
            {c.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{c.name}</span>
              <span className="text-xs text-gray-500">{c.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={c.channel} color={c.channel === 'SMS' ? 'blue' : c.channel === 'Appel' ? 'green' : 'gray'} />
              <span className="text-xs text-gray-500 truncate">{c.preview}</span>
            </div>
          </div>
          {c.unread > 0 && (
            <span className="w-5 h-5 bg-[#D85A30] text-white text-xs font-bold rounded-full flex items-center justify-center">{c.unread}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Screen 4: Appointments ──
function AppointmentsScreen() {
  const today = 16;
  const daysWithRdv = [3, 7, 10, 14, 16, 18, 21, 24, 28];
  const rdvs = [
    { time: '09:00', name: 'Jean Dupont', type: 'Consultation', status: 'Confirmé', color: 'green' },
    { time: '10:30', name: 'Marie Lambert', type: 'Premiere visite', status: 'En attente', color: 'yellow' },
    { time: '14:00', name: 'Pierre Roux', type: 'Suivi', status: 'Confirmé', color: 'green' },
  ];
  return (
    <div className="space-y-4">
      {/* Mini calendar */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-2 text-center">Mars 2026</p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
          {['L','M','M','J','V','S','D'].map((d) => (
            <span key={d} className="text-gray-400 font-medium">{d}</span>
          ))}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <span
              key={d}
              className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto ${
                d === today
                  ? 'bg-[#D85A30] text-white font-bold'
                  : daysWithRdv.includes(d)
                  ? 'bg-orange-100 text-[#D85A30] font-medium'
                  : 'text-gray-600'
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
      {/* Today's RDVs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-700">RDV du jour</span>
        </div>
        {rdvs.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm font-bold text-gray-900 w-12">{r.time}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-500">{r.type}</p>
            </div>
            <StatusBadge status={r.status} color={r.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Screen 5: Prospects ──
function ProspectsScreen() {
  const prospects = [
    { name: 'Jean Dupont', source: 'Appel', status: 'Client', score: 92, interactions: 8, statusColor: 'green' },
    { name: 'Marie Lambert', source: 'Booking', status: 'Chaud', score: 78, interactions: 5, statusColor: 'orange' },
    { name: 'Pierre Roux', source: 'SMS', status: 'Tiede', score: 54, interactions: 3, statusColor: 'yellow' },
    { name: 'Sophie Bernard', source: 'Appel', status: 'Froid', score: 22, interactions: 1, statusColor: 'blue' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <p className="text-xl font-bold text-gray-900">147</p>
          <p className="text-[10px] text-gray-500">Total prospects</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <p className="text-xl font-bold text-gray-900">23</p>
          <p className="text-[10px] text-gray-500">Convertis ce mois</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <p className="text-xl font-bold text-gray-900">15.6%</p>
          <p className="text-[10px] text-gray-500">Taux conversion</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600">Nom</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Source</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Statut</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Score</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                <td className="px-3 py-2 text-gray-600">{p.source}</td>
                <td className="px-3 py-2"><StatusBadge status={p.status} color={p.statusColor} /></td>
                <td className="px-3 py-2 font-medium text-gray-900">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Screen 6: Products ──
function ProductsScreen() {
  const products = [
    { name: 'Coupe homme', duration: '25 min', price: '18 EUR', category: 'Coiffure' },
    { name: 'Coupe femme', duration: '45 min', price: '35 EUR', category: 'Coiffure' },
    { name: 'Coloration', duration: '1h30', price: '65 EUR', category: 'Couleur' },
    { name: 'Balayage', duration: '2h', price: '85 EUR', category: 'Couleur' },
    { name: 'Brushing', duration: '30 min', price: '22 EUR', category: 'Coiffure' },
  ];
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-medium text-gray-600">Service</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Durée</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Prix</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Catégorie</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
              <td className="px-3 py-2 text-gray-600">{p.duration}</td>
              <td className="px-3 py-2 font-medium text-gray-900">{p.price}</td>
              <td className="px-3 py-2"><StatusBadge status={p.category} color={p.category === 'Couleur' ? 'orange' : 'blue'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Screen 7: Knowledge Base ──
function KnowledgeScreen() {
  const sources = [
    { type: 'Crawl web', detail: 'https://mon-salon.fr — 32 pages indexées', time: 'Indexe il y a 2h', active: true },
    { type: 'Brochure PDF', detail: 'catalogue-services-2026.pdf', time: 'Indexe hier', active: true },
    { type: 'FAQ manuelle', detail: '15 questions/réponses', time: 'Mis à jour ce matin', active: true },
  ];
  const questions = [
    'Quels sont vos horaires ?',
    'Vous faites des colorations ?',
    'Quel est le prix d\'une coupe homme ?',
    'Comment prendre rendez-vous ?',
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{s.type}</p>
              <p className="text-xs text-gray-500">{s.detail}</p>
            </div>
            <span className="text-[10px] text-gray-400">{s.time}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-medium text-gray-600 mb-2">Exemples de questions traitées</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <span key={i} className="text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-700">
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Screen 8: Channels ──
function ChannelsScreen() {
  const channels = [
    { name: 'Telephone', status: 'Actif', color: 'green', detail: '+33 9 39 03 57 61' },
    { name: 'SMS', status: 'Actif', color: 'green', detail: 'Envoi automatique après appel' },
    { name: 'Email Gmail', status: 'Connecté', color: 'green', detail: 'contact@mon-salon.fr' },
    { name: 'WhatsApp', status: 'En configuration', color: 'yellow', detail: 'Connexion en cours...' },
  ];
  return (
    <div className="space-y-2">
      {channels.map((c, i) => (
        <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.color === 'green' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{c.name}</p>
              <StatusBadge status={c.status} color={c.color} />
            </div>
            <p className="text-xs text-gray-500">{c.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Screen 9: Analytics ──
function AnalyticsScreen() {
  const kpis = [
    { label: 'Appels ce mois', value: '342', change: '+22%' },
    { label: 'Durée moyenne', value: '2m48s', change: '' },
    { label: 'Satisfaction', value: '4.6/5', change: '' },
  ];
  const months = [
    { m: 'Oct', h: 40 },
    { m: 'Nov', h: 55 },
    { m: 'Dec', h: 48 },
    { m: 'Jan', h: 65 },
    { m: 'Fév', h: 72 },
    { m: 'Mar', h: 90 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-[10px] text-gray-500 mb-1">{k.label}</p>
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
            {k.change && <p className="text-[10px] text-emerald-600 font-medium">{k.change}</p>}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-3">Appels par mois</p>
        <div className="flex items-end gap-3 h-20">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#D85A30] rounded-t" style={{ height: `${m.h}%` }} />
              <span className="text-[10px] text-gray-500">{m.m}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
        <span className="text-xs text-gray-600">Top question : &quot;Quels sont vos horaires ?&quot;</span>
        <span className="text-xs text-[#D85A30] font-medium cursor-pointer">Export CSV</span>
      </div>
    </div>
  );
}

// ── Screen 10: Booking ──
function BookingScreen() {
  const services = ['Coupe homme — 25 min', 'Coupe femme — 45 min', 'Coloration — 1h30'];
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Mon Salon Coiffure</p>
            <p className="text-[10px] text-gray-500">coccinelle.ai/booking/mon-salon</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Choisissez un service</p>
          {services.map((s, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded border cursor-pointer ${i === 0 ? 'border-[#D85A30] bg-orange-50 text-[#D85A30] font-medium' : 'border-gray-200 text-gray-700'}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-xs font-medium text-gray-600 mb-2">Créneaux disponibles — Lundi 17 mars</p>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((s, i) => (
            <div
              key={i}
              className={`text-xs text-center p-2 rounded border cursor-pointer ${i === 2 ? 'border-[#D85A30] bg-[#D85A30] text-white font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tour Screens Array ───
const tourScreens: TourScreen[] = [
  {
    title: 'Tableau de bord',
    url: '/dashboard',
    sidebarIndex: 0,
    value:
      "En un coup d'oeil, vous savez combien d'appels ont ete traités, combien de RDV sont prévus et comment evolue votre conversion.",
    content: <DashboardScreen />,
  },
  {
    title: 'Historique des appels',
    url: '/dashboard/appels',
    sidebarIndex: 1,
    value:
      "Chaque appel est transcrit et analysé. Vous voyez qui a appelé, si un RDV a ete pris, et le niveau de satisfaction.",
    content: <CallHistoryScreen />,
  },
  {
    title: 'Inbox omnicanal',
    url: '/dashboard/inbox',
    sidebarIndex: 2,
    value:
      "Fini les allers-retours entre telephone, SMS et emails. Tout l'historique d'un contact est regroupé dans un seul fil.",
    content: <InboxScreen />,
  },
  {
    title: 'Rendez-vous',
    url: '/dashboard/appointments',
    sidebarIndex: 3,
    value:
      'Les RDV sont pris automatiquement avec rappels SMS la veille et 1h avant. Le client reçoit une confirmation immédiate.',
    content: <AppointmentsScreen />,
  },
  {
    title: 'Prospects / CRM',
    url: '/dashboard/prospects',
    sidebarIndex: 4,
    value:
      'Chaque contact est enregistré, dédupliqué et classé automatiquement. Vous savez qui relancer en priorité.',
    content: <ProspectsScreen />,
  },
  {
    title: 'Produits et services',
    url: '/dashboard/products',
    sidebarIndex: 5,
    value:
      "L'assistant connait vos services, durees et prix. Il répond immédiatement et propose des créneaux adaptés.",
    content: <ProductsScreen />,
  },
  {
    title: 'Base de connaissances',
    url: '/dashboard/knowledge',
    sidebarIndex: 6,
    value:
      "Collez l'URL de votre site et l'assistant apprend tout seul. Ajoutez PDF ou Q/R pour affiner.",
    content: <KnowledgeScreen />,
  },
  {
    title: 'Canaux',
    url: '/dashboard/channels',
    sidebarIndex: 7,
    value:
      "Vos clients vous contactent par le canal de leur choix. L'assistant gère tout et peut basculer d'un canal à l'autre.",
    content: <ChannelsScreen />,
  },
  {
    title: 'Analytics',
    url: '/dashboard/analytics',
    sidebarIndex: 8,
    value:
      'Récap hebdomadaire par email. Tableaux de bord, tendances, export CSV.',
    content: <AnalyticsScreen />,
  },
  {
    title: 'Page de reservation publique',
    url: '/booking/mon-salon',
    sidebarIndex: 9,
    value:
      'Vos clients réservent en ligne 24h/24 sans vous appeler. Prospect créé, confirmation envoyée, rappel programmé.',
    content: <BookingScreen />,
  },
];

// ─── Modal Component ───
interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductTourModal({ isOpen, onClose }: ProductTourModalProps) {
  const [currentScreen, setCurrentScreen] = useState(0);

  const goNext = useCallback(() => {
    setCurrentScreen((prev) => Math.min(prev + 1, tourScreens.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentScreen((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!isOpen) return null;

  const screen = tourScreens[currentScreen];
  const isLast = currentScreen === tourScreens.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-tour-in">
        {/* Progress bar */}
        <div className="flex h-1 bg-gray-100">
          {tourScreens.map((_, i) => (
            <div
              key={i}
              className={`flex-1 transition-colors duration-300 ${i <= currentScreen ? 'bg-[#D85A30]' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-gray-100 transition"
          aria-label="Fermer"
        >
          <XIcon className="w-5 h-5 text-gray-500" />
        </button>

        {/* Browser bar */}
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          </div>
          <div className="flex-1 text-center">
            <span className="inline-block bg-white px-4 py-1 rounded text-xs text-gray-500">
              app.coccinelle.ai{screen.url}
            </span>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {currentScreen + 1}/{tourScreens.length}
          </span>
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — hidden on mobile */}
          <div className="hidden md:flex w-48 bg-gray-900 flex-col p-3 flex-shrink-0">
            <div className="flex items-center gap-2 mb-6 px-2">
              <div className="w-7 h-7 bg-gray-700 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="text-white font-semibold text-sm">coccinelle.ai</span>
            </div>
            <nav className="space-y-0.5">
              {sidebarItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = i === screen.sidebarIndex;
                return (
                  <button
                    key={item.label}
                    onClick={() => setCurrentScreen(i)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition ${
                      isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 p-4 md:p-6 bg-gray-50">
              {/* Screen title */}
              <h3 className="text-lg font-bold text-gray-900 mb-4">{screen.title}</h3>

              {/* Screen content with fade animation */}
              <div key={currentScreen} className="animate-tour-fade">
                {screen.content}
              </div>
            </div>

            {/* Value bar */}
            <div className="bg-emerald-50 border-t border-emerald-100 px-4 md:px-6 py-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#0F6E56] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                <p className="text-sm text-[#0F6E56]">{screen.value}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="border-t border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between bg-white">
          <button
            onClick={goPrev}
            disabled={currentScreen === 0}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Précédent
          </button>

          {/* Dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {tourScreens.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentScreen(i)}
                className={`w-2 h-2 rounded-full transition ${
                  i === currentScreen ? 'bg-[#D85A30] w-4' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold text-white bg-[#D85A30] hover:bg-[#993C1D] rounded-lg transition"
            >
              Démarrer gratuitement
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold text-white bg-[#D85A30] hover:bg-[#993C1D] rounded-lg transition"
            >
              Suivant
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes tourIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tourFade {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-tour-in { animation: tourIn 0.3s ease-out; }
        .animate-tour-fade { animation: tourFade 0.3s ease-out; }
      `}</style>
    </div>
  );
}
