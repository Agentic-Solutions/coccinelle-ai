'use client';

import { useState, useCallback, type ReactNode } from 'react';
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
  CheckIcon,
} from './landing/icons';
import {
  UserCheck,
  Radio,
  UsersRound,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IconComponentProps {
  className?: string;
}

type IconComponent = (props: IconComponentProps) => ReactNode;

interface SidebarItem {
  label: string;
  icon: IconComponent;
}

interface TourScreen {
  title: string;
  url: string;
  sidebarIndex: number;
  value: string;
  content: ReactNode;
}

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Avatar Colors ───────────────────────────────────────────────────────────

const avatarColors: Record<string, string> = {
  'JD': 'bg-blue-500',
  'ML': 'bg-emerald-500',
  'PR': 'bg-violet-500',
  'SB': 'bg-pink-500',
  'LM': 'bg-orange-500',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(initials: string): string {
  return avatarColors[initials] || 'bg-gray-500';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: 'green' | 'red' | 'orange' | 'blue' | 'violet' | 'gray';
}) {
  const styles: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

// ─── Sidebar Items (14) ─────────────────────────────────────────────────────

const sidebarItems: SidebarItem[] = [
  { label: 'Vue d\'ensemble', icon: HomeIcon },
  { label: 'Appels', icon: PhoneIcon },
  { label: 'Messages', icon: InboxIcon },
  { label: 'Rendez-vous', icon: CalendarIcon },
  { label: 'Prospects', icon: UsersIcon },
  { label: 'Clients', icon: UserCheck as IconComponent },
  { label: 'Produits', icon: ShoppingBagIcon },
  { label: 'Connaissances', icon: BookOpenIcon },
  { label: 'Canaux', icon: Radio as IconComponent },
  { label: 'Analytics', icon: BarChartIcon },
  { label: 'Équipes', icon: UsersRound as IconComponent },
  { label: 'Facturation', icon: CreditCard as IconComponent },
  { label: 'Paramètres', icon: SettingsIcon },
  { label: 'Aide & Support', icon: LifeBuoy as IconComponent },
];

// Map sidebar label to tour screen index for click navigation
const sidebarToScreen: Record<number, number> = {
  0: 0,   // Vue d'ensemble -> screen 0
  1: 1,   // Appels -> screen 1
  2: 2,   // Messages -> screen 2
  3: 3,   // Rendez-vous -> screen 3
  4: 4,   // Prospects -> screen 4
  6: 5,   // Produits -> screen 5
  7: 6,   // Connaissances -> screen 6
  8: 7,   // Canaux -> screen 7
  9: 8,   // Analytics -> screen 8
};

// ─── Screen 1: Vue d'ensemble ────────────────────────────────────────────────

function DashboardScreen() {
  const kpis = [
    { label: 'Appels aujourd\'hui', value: '23', change: '+15%' },
    { label: 'RDV confirmés', value: '8', change: '+3' },
    { label: 'Nouveaux prospects', value: '5', change: '+2' },
    { label: 'Taux conversion', value: '68%', change: '+5pts' },
  ];

  const weekData = [
    { day: 'Lun', value: 12 },
    { day: 'Mar', value: 18 },
    { day: 'Mer', value: 15 },
    { day: 'Jeu', value: 23 },
    { day: 'Ven', value: 20 },
    { day: 'Sam', value: 8 },
    { day: 'Dim', value: 3 },
  ];

  const maxVal = Math.max(...weekData.map((d) => d.value));

  const rdvs = [
    { time: '09:00', name: 'Jean Dupont', service: 'Coupe homme' },
    { time: '10:30', name: 'Marie Lambert', service: 'Coloration' },
    { time: '14:00', name: 'Pierre Roux', service: 'Brushing' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg p-3 border border-gray-200"
          >
            <p className="text-[12px] font-medium text-gray-500 mb-1">
              {k.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold text-gray-900">
                {k.value}
              </span>
              <span className="text-[12px] text-emerald-600 font-medium">
                {k.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-[12px] font-medium text-gray-700 mb-3">
          Activité de la semaine
        </p>
        <div className="flex items-end gap-2 h-24">
          {weekData.map((d) => (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] font-medium text-gray-500">
                {d.value}
              </span>
              <div
                className="w-full bg-[#D85A30] rounded-t min-h-[4px]"
                style={{ height: `${(d.value / maxVal) * 100}%` }}
              />
              <span className="text-[10px] text-gray-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-[12px] font-medium text-gray-700">
            Prochains RDV
          </span>
        </div>
        {rdvs.map((r) => (
          <div
            key={r.time}
            className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <span className="text-[13px] font-bold text-gray-900 w-12">
              {r.time}
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-900">
                {r.name}
              </p>
              <p className="text-[12px] text-gray-500">{r.service}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen 2: Appels ────────────────────────────────────────────────────────

function CallHistoryScreen() {
  const kpis = [
    { label: 'Total aujourd\'hui', value: '23' },
    { label: 'Durée moyenne', value: '2m 48s' },
    { label: 'Satisfaction', value: '4.6/5' },
  ];

  const calls: {
    time: string;
    caller: string;
    duration: string;
    result: string;
    resultVariant: 'green' | 'blue' | 'orange' | 'violet';
    sentiment: string;
    sentimentVariant: 'green' | 'gray';
  }[] = [
    {
      time: '09:12',
      caller: 'Jean Dupont',
      duration: '3m 22s',
      result: 'RDV pris',
      resultVariant: 'green',
      sentiment: 'Positif',
      sentimentVariant: 'green',
    },
    {
      time: '09:45',
      caller: 'Marie Lambert',
      duration: '1m 55s',
      result: 'Information',
      resultVariant: 'blue',
      sentiment: 'Neutre',
      sentimentVariant: 'gray',
    },
    {
      time: '10:03',
      caller: '+33 6 45 78 xx',
      duration: '4m 10s',
      result: 'RDV pris',
      resultVariant: 'green',
      sentiment: 'Positif',
      sentimentVariant: 'green',
    },
    {
      time: '11:30',
      caller: 'Pierre Roux',
      duration: '2m 08s',
      result: 'Rappel demandé',
      resultVariant: 'orange',
      sentiment: 'Positif',
      sentimentVariant: 'green',
    },
    {
      time: '14:15',
      caller: 'Sophie Bernard',
      duration: '1m 42s',
      result: 'Transféré',
      resultVariant: 'violet',
      sentiment: 'Neutre',
      sentimentVariant: 'gray',
    },
    {
      time: '15:20',
      caller: '+33 7 12 34 xx',
      duration: '3m 55s',
      result: 'RDV pris',
      resultVariant: 'green',
      sentiment: 'Positif',
      sentimentVariant: 'green',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg p-3 border border-gray-200 text-center"
          >
            <p className="text-[18px] font-bold text-gray-900">{k.value}</p>
            <p className="text-[11px] text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Heure
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Appelant
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px] hidden sm:table-cell">
                Durée
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Résultat
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px] hidden md:table-cell">
                Sentiment
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr
                key={c.time + c.caller}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2 text-gray-500 font-medium">
                  {c.time}
                </td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {c.caller}
                </td>
                <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">
                  {c.duration}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge label={c.result} variant={c.resultVariant} />
                </td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <StatusBadge
                    label={c.sentiment}
                    variant={c.sentimentVariant}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Screen 3: Messages ──────────────────────────────────────────────────────

function MessagesScreen() {
  const conversations: {
    name: string;
    message: string;
    channel: string;
    time: string;
    badge: { label: string; variant: 'green' | 'red' };
  }[] = [
    {
      name: 'Jean Dupont',
      message: 'Merci pour le RDV de demain !',
      channel: 'SMS',
      time: 'il y a 12 min',
      badge: { label: 'Lu', variant: 'green' },
    },
    {
      name: 'Marie Lambert',
      message: 'Est-ce que vous faites des colorations ?',
      channel: 'Appel',
      time: 'il y a 45 min',
      badge: { label: '2', variant: 'red' },
    },
    {
      name: 'Pierre Roux',
      message: 'Je confirme ma venue à 14h',
      channel: 'WhatsApp',
      time: 'il y a 1h',
      badge: { label: 'Lu', variant: 'green' },
    },
    {
      name: 'Sophie Bernard',
      message: 'Bonjour, je souhaite un devis...',
      channel: 'Email',
      time: 'il y a 2h',
      badge: { label: '1', variant: 'red' },
    },
    {
      name: 'Lucas Martin',
      message: 'Ok parfait, à demain !',
      channel: 'SMS',
      time: 'hier',
      badge: { label: 'Lu', variant: 'green' },
    },
  ];

  const channelColors: Record<string, string> = {
    SMS: 'bg-blue-100 text-blue-700',
    Appel: 'bg-emerald-100 text-emerald-700',
    WhatsApp: 'bg-green-100 text-green-700',
    Email: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-2">
      {conversations.map((c) => {
        const initials = getInitials(c.name);
        const colorClass = getAvatarColor(initials);
        const isUnread = c.badge.variant === 'red';
        return (
          <div
            key={c.name}
            className={`flex items-center gap-3 bg-white rounded-lg p-3 border transition-colors hover:bg-gray-50 ${
              isUnread
                ? 'border-[#D85A30]/30 bg-orange-50/20'
                : 'border-gray-200'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[13px] font-semibold text-gray-900">
                  {c.name}
                </span>
                <span className="text-[11px] text-gray-400">{c.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${channelColors[c.channel]}`}
                >
                  {c.channel}
                </span>
                <span className="text-[12px] text-gray-500 truncate">
                  {c.message}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                c.badge.variant === 'red'
                  ? 'bg-red-500 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {c.badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Screen 4: Rendez-vous ───────────────────────────────────────────────────

function AppointmentsScreen() {
  const today = 17;
  const daysWithRdv = [3, 7, 10, 14, 17, 19, 21, 24, 28];

  const rdvs: {
    time: string;
    name: string;
    service: string;
    duration: string;
    status: string;
    statusVariant: 'green' | 'orange';
  }[] = [
    {
      time: '09:00',
      name: 'Jean Dupont',
      service: 'Coupe homme',
      duration: '25 min',
      status: 'Confirmé',
      statusVariant: 'green',
    },
    {
      time: '10:30',
      name: 'Marie Lambert',
      service: 'Coloration',
      duration: '1h30',
      status: 'En attente',
      statusVariant: 'orange',
    },
    {
      time: '14:00',
      name: 'Pierre Roux',
      service: 'Brushing',
      duration: '30 min',
      status: 'Confirmé',
      statusVariant: 'green',
    },
    {
      time: '16:00',
      name: 'Sophie Bernard',
      service: 'Coupe + Brushing',
      duration: '1h',
      status: 'Confirmé',
      statusVariant: 'green',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Mini calendar */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <p className="text-[12px] font-medium text-gray-700 mb-2 text-center">
          Mars 2026
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={`day-header-${i}`} className="text-gray-400 font-medium py-1">
              {d}
            </span>
          ))}
          {/* March 2026 starts on Sunday => 6 blanks before day 1 */}
          {Array.from({ length: 6 }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <span
              key={`day-${d}`}
              className={`w-6 h-6 flex items-center justify-center rounded-full mx-auto relative ${
                d === today
                  ? 'bg-[#D85A30] text-white font-bold'
                  : daysWithRdv.includes(d)
                    ? 'text-gray-700 font-medium'
                    : 'text-gray-500'
              }`}
            >
              {d}
              {daysWithRdv.includes(d) && d !== today && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D85A30]" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Today's RDVs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-[12px] font-medium text-gray-700">
            Aujourd&apos;hui — Mardi 17 mars
          </span>
        </div>
        {rdvs.map((r) => (
          <div
            key={r.time}
            className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <span className="text-[13px] font-bold text-gray-900 w-12">
              {r.time}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900">
                {r.name}
              </p>
              <p className="text-[12px] text-gray-500">
                {r.service} ({r.duration})
              </p>
            </div>
            <StatusBadge label={r.status} variant={r.statusVariant} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Screen 5: Prospects ─────────────────────────────────────────────────────

function ProspectsScreen() {
  const kpis = [
    { label: 'Total', value: '147' },
    { label: 'Convertis ce mois', value: '23', change: '+18%' },
    { label: 'Taux conversion', value: '15.6%' },
  ];

  const prospects: {
    name: string;
    phone: string;
    source: string;
    status: string;
    statusVariant: 'red' | 'orange' | 'green' | 'blue';
    score: string;
    lastInteraction: string;
  }[] = [
    {
      name: 'Jean Dupont',
      phone: '+33 6 12 xx',
      source: 'Appel',
      status: 'Chaud',
      statusVariant: 'red',
      score: '85/100',
      lastInteraction: 'Aujourd\'hui',
    },
    {
      name: 'Marie Lambert',
      phone: '+33 6 45 xx',
      source: 'Booking',
      status: 'Tiède',
      statusVariant: 'orange',
      score: '62/100',
      lastInteraction: 'Hier',
    },
    {
      name: 'Pierre Roux',
      phone: '+33 7 89 xx',
      source: 'SMS',
      status: 'Client',
      statusVariant: 'green',
      score: '—',
      lastInteraction: '15 mars',
    },
    {
      name: 'Sophie Bernard',
      phone: '+33 6 34 xx',
      source: 'Email',
      status: 'Froid',
      statusVariant: 'blue',
      score: '28/100',
      lastInteraction: '12 mars',
    },
    {
      name: 'Lucas Martin',
      phone: '+33 7 56 xx',
      source: 'Appel',
      status: 'Chaud',
      statusVariant: 'red',
      score: '78/100',
      lastInteraction: 'Aujourd\'hui',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg p-3 border border-gray-200 text-center"
          >
            <p className="text-[18px] font-bold text-gray-900">{k.value}</p>
            <p className="text-[11px] text-gray-500">
              {k.label}
              {'change' in k && k.change && (
                <span className="text-emerald-600 ml-1">{k.change}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Nom
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px] hidden sm:table-cell">
                Téléphone
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Source
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Statut
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px] hidden md:table-cell">
                Score
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px] hidden lg:table-cell">
                Dernière interaction
              </th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr
                key={p.name}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2 font-medium text-gray-900">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">
                  {p.phone}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.source}</td>
                <td className="px-3 py-2">
                  <StatusBadge label={p.status} variant={p.statusVariant} />
                </td>
                <td className="px-3 py-2 font-medium text-gray-900 hidden md:table-cell">
                  {p.score}
                </td>
                <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">
                  {p.lastInteraction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Screen 6: Produits ──────────────────────────────────────────────────────

function ProductsScreen() {
  const products = [
    { name: 'Coupe homme', duration: '25 min', price: '18 €', category: 'Coupes' },
    { name: 'Coupe femme', duration: '45 min', price: '35 €', category: 'Coupes' },
    { name: 'Coloration', duration: '1h30', price: '65 €', category: 'Couleur' },
    { name: 'Balayage', duration: '2h', price: '85 €', category: 'Couleur' },
    { name: 'Brushing', duration: '30 min', price: '22 €', category: 'Coiffage' },
  ];

  const categoryColors: Record<string, 'blue' | 'orange' | 'violet'> = {
    Coupes: 'blue',
    Couleur: 'orange',
    Coiffage: 'violet',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="text-[13px] font-semibold text-white bg-[#D85A30] hover:bg-[#993C1D] px-4 py-2 rounded-lg transition-colors">
          Ajouter un service
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Service
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Durée
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Prix
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-[12px]">
                Catégorie
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.name}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2 font-medium text-gray-900">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-gray-600">{p.duration}</td>
                <td className="px-3 py-2 font-medium text-gray-900">
                  {p.price}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={p.category}
                    variant={categoryColors[p.category]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Screen 7: Connaissances ─────────────────────────────────────────────────

function KnowledgeScreen() {
  const sources = [
    {
      type: 'Site web',
      detail: 'salon-marie.fr',
      meta: 'Indexé il y a 2h — 45 pages',
      active: true,
    },
    {
      type: 'Brochure tarifs 2026.pdf',
      detail: '',
      meta: 'Indexé hier — 12 pages',
      active: true,
    },
    {
      type: 'FAQ manuelle',
      detail: '15 questions-réponses',
      meta: 'Modifié il y a 3 jours',
      active: true,
    },
  ];

  const questions = [
    'Quels sont vos horaires ?',
    'Vous faites des colorations ?',
    'Comment prendre rendez-vous ?',
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {sources.map((s) => (
          <div
            key={s.type}
            className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-gray-900">
                  {s.type}
                </p>
                {s.detail && (
                  <span className="text-[12px] text-gray-500">
                    — {s.detail}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">{s.meta}</p>
            </div>
            <StatusBadge label="Actif" variant="green" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-[12px] font-medium text-gray-700 mb-3">
          Questions fréquentes détectées
        </p>
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q} className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-[13px] text-gray-700">{q}</span>
              <span className="text-[11px] text-emerald-600 ml-auto">
                Réponse automatique
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 8: Canaux ────────────────────────────────────────────────────────

function ChannelsScreen() {
  const channels: {
    name: string;
    detail: string;
    status: string;
    statusVariant: 'green' | 'orange';
    pulsing: boolean;
  }[] = [
    {
      name: 'Téléphone',
      detail: '+33 9 39 03 57 60',
      status: 'Actif',
      statusVariant: 'green',
      pulsing: false,
    },
    {
      name: 'SMS',
      detail: 'Twilio',
      status: 'Actif',
      statusVariant: 'green',
      pulsing: false,
    },
    {
      name: 'Email',
      detail: 'marie@salon-marie.fr (Gmail)',
      status: 'Connecté',
      statusVariant: 'green',
      pulsing: false,
    },
    {
      name: 'WhatsApp',
      detail: '+33 9 39 03 57 61',
      status: 'En configuration',
      statusVariant: 'orange',
      pulsing: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {channels.map((c) => (
        <div
          key={c.name}
          className="bg-white rounded-lg p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  c.pulsing
                    ? 'bg-orange-400 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="text-[14px] font-semibold text-gray-900">
                {c.name}
              </span>
            </div>
            <StatusBadge label={c.status} variant={c.statusVariant} />
          </div>
          <p className="text-[12px] text-gray-500">{c.detail}</p>
          {/* Toggle visual */}
          <div className="mt-3 flex items-center gap-2">
            <div
              className={`w-8 h-4 rounded-full relative ${
                c.statusVariant === 'green' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                  c.statusVariant === 'green' ? 'left-4' : 'left-0.5'
                }`}
              />
            </div>
            <span className="text-[11px] text-gray-400">
              {c.statusVariant === 'green' ? 'Activé' : 'Configuration'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Screen 9: Analytics ─────────────────────────────────────────────────────

function AnalyticsScreen() {
  const kpis = [
    { label: 'Appels ce mois', value: '342', change: '+22%' },
    { label: 'Durée moyenne', value: '2m 48s', change: '-12%' },
    { label: 'Satisfaction', value: '4.6/5', change: '+0.3' },
    { label: 'RDV pris', value: '89', change: '+31%' },
  ];

  const months = [
    { m: 'Oct', value: 180 },
    { m: 'Nov', value: 210 },
    { m: 'Déc', value: 195 },
    { m: 'Jan', value: 250 },
    { m: 'Fév', value: 290 },
    { m: 'Mars', value: 342 },
  ];

  const maxVal = Math.max(...months.map((m) => m.value));

  const topQuestions = [
    { question: 'Quels sont vos horaires ?', count: 67 },
    { question: 'Combien coûte une coloration ?', count: 42 },
    { question: 'Avez-vous des disponibilités cette semaine ?', count: 38 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <button className="text-[12px] font-medium text-[#D85A30] hover:text-[#993C1D] border border-[#D85A30] hover:border-[#993C1D] px-3 py-1.5 rounded-lg transition-colors">
          Exporter en CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-lg p-3 border border-gray-200"
          >
            <p className="text-[12px] font-medium text-gray-500 mb-1">
              {k.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-bold text-gray-900">
                {k.value}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">
                {k.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-[12px] font-medium text-gray-700 mb-3">
          Appels par mois
        </p>
        <div className="flex items-end gap-3 h-24">
          {months.map((m) => (
            <div
              key={m.m}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] font-medium text-gray-500">
                {m.value}
              </span>
              <div
                className="w-full bg-[#D85A30] rounded-t min-h-[4px]"
                style={{ height: `${(m.value / maxVal) * 100}%` }}
              />
              <span className="text-[10px] text-gray-500">{m.m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="text-[12px] font-medium text-gray-700 mb-3">
          Top 3 questions posées
        </p>
        <div className="space-y-2">
          {topQuestions.map((q, i) => (
            <div
              key={q.question}
              className="flex items-center gap-3"
            >
              <span className="text-[12px] font-bold text-[#D85A30] w-5">
                {i + 1}.
              </span>
              <span className="text-[13px] text-gray-700 flex-1">
                &laquo; {q.question} &raquo;
              </span>
              <span className="text-[12px] font-medium text-gray-500">
                {q.count} fois
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 10: Booking (full-screen, no sidebar) ───────────────────────────

function BookingScreen() {
  const services = [
    { name: 'Coupe homme', duration: '25 min', price: '18€' },
    { name: 'Coupe femme', duration: '45 min', price: '35€' },
    { name: 'Coloration', duration: '1h30', price: '65€' },
    { name: 'Balayage', duration: '2h', price: '85€' },
    { name: 'Brushing', duration: '30 min', price: '22€' },
  ];

  const slots = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00'];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <div className="w-8 h-8 bg-[#D85A30] rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-[13px]">C</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-gray-900">
            Salon Marie — Lyon 6e
          </p>
          <p className="text-[11px] text-gray-400">
            Réservation en ligne
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Services */}
        <div>
          <p className="text-[14px] font-semibold text-gray-900 mb-3">
            Choisissez un service
          </p>
          <div className="space-y-2">
            {services.map((s, i) => (
              <div
                key={s.name}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  i === 0
                    ? 'border-[#D85A30] bg-orange-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  <p
                    className={`text-[13px] font-medium ${
                      i === 0 ? 'text-[#D85A30]' : 'text-gray-900'
                    }`}
                  >
                    {s.name}
                  </p>
                  <p className="text-[11px] text-gray-500">{s.duration}</p>
                </div>
                <span
                  className={`text-[14px] font-bold ${
                    i === 0 ? 'text-[#D85A30]' : 'text-gray-900'
                  }`}
                >
                  {s.price}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <p className="text-[14px] font-semibold text-gray-900 mb-3">
            Créneaux disponibles
          </p>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s, i) => (
              <div
                key={s}
                className={`text-[13px] text-center p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  i === 2
                    ? 'border-[#D85A30] bg-[#D85A30] text-white font-semibold'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100 text-center">
        <p className="text-[11px] text-gray-400">
          Propulsé par{' '}
          <span className="font-medium text-gray-500">coccinelle.ai</span>
        </p>
      </div>
    </div>
  );
}

// ─── Tour Screens Array ──────────────────────────────────────────────────────

const tourScreens: TourScreen[] = [
  {
    title: 'Bonjour, Marie',
    url: '/dashboard',
    sidebarIndex: 0,
    value:
      'Dès votre connexion, vous voyez l’essentiel : appels du jour, rendez-vous prévus, nouveaux contacts. Tout en temps réel.',
    content: <DashboardScreen />,
  },
  {
    title: 'Historique des appels',
    url: '/dashboard/conversations/appels',
    sidebarIndex: 1,
    value:
      'Chaque appel est transcrit et analysé automatiquement. Vous voyez qui a appelé, le résultat et le niveau de satisfaction.',
    content: <CallHistoryScreen />,
  },
  {
    title: 'Boîte de réception',
    url: '/dashboard/conversations',
    sidebarIndex: 2,
    value:
      'Tous vos échanges avec un client dans un seul fil : appels, SMS, emails, WhatsApp. Plus besoin de chercher dans 5 applications.',
    content: <MessagesScreen />,
  },
  {
    title: 'Agenda',
    url: '/dashboard/rdv',
    sidebarIndex: 3,
    value:
      'Les RDV sont pris automatiquement avec rappels SMS la veille et 1h avant. Vos clients reçoivent une confirmation immédiate.',
    content: <AppointmentsScreen />,
  },
  {
    title: 'Gestion des prospects',
    url: '/dashboard/prospects',
    sidebarIndex: 4,
    value:
      'Chaque contact est automatiquement enregistré, dédupliqué et classé. Vous savez immédiatement qui relancer en priorité.',
    content: <ProspectsScreen />,
  },
  {
    title: 'Catalogue de services',
    url: '/dashboard/products',
    sidebarIndex: 6,
    value:
      'Votre assistant connaît vos services, durées et prix. Il répond immédiatement aux clients et propose des créneaux adaptés à la durée.',
    content: <ProductsScreen />,
  },
  {
    title: 'Base de connaissances',
    url: '/dashboard/knowledge',
    sidebarIndex: 7,
    value:
      'Indiquez l’adresse de votre site et l’assistant apprend tout seul. Ajoutez des PDF ou des questions-réponses pour affiner.',
    content: <KnowledgeScreen />,
  },
  {
    title: 'Canaux de communication',
    url: '/dashboard/channels',
    sidebarIndex: 8,
    value:
      'Vos clients vous contactent par le canal de leur choix. L’assistant gère tout et peut basculer d’un canal à l’autre pendant un appel.',
    content: <ChannelsScreen />,
  },
  {
    title: 'Tableau de bord analytique',
    url: '/dashboard/analytics',
    sidebarIndex: 9,
    value:
      'Un récapitulatif est envoyé par email chaque lundi. Tableaux de bord, tendances et export CSV en un clic.',
    content: <AnalyticsScreen />,
  },
  {
    title: 'Réservation en ligne',
    url: '/booking/salon-marie-lyon',
    sidebarIndex: -1,
    value:
      'Vos clients réservent en ligne 24h/24 sans vous appeler. Le prospect est créé, la confirmation envoyée, le rappel programmé.',
    content: <BookingScreen />,
  },
];

// ─── Sidebar Component ───────────────────────────────────────────────────────

function TourSidebar({
  activeSidebarIndex,
  onNavigate,
}: {
  activeSidebarIndex: number;
  onNavigate: (screenIndex: number) => void;
}) {
  return (
    <div className="hidden md:flex w-[200px] bg-[#111827] flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="w-7 h-7 bg-[#D85A30] rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-[12px]">C</span>
        </div>
        <span className="text-white font-semibold text-[13px]">
          coccinelle.ai
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === activeSidebarIndex;
          const screenIndex = sidebarToScreen[i];
          const isClickable = screenIndex !== undefined;

          return (
            <button
              key={item.label}
              onClick={() => {
                if (isClickable) {
                  onNavigate(screenIndex);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[13px] transition-colors ${
                isActive
                  ? 'bg-white/10 text-white border-l-[3px] border-[#D85A30] -ml-px'
                  : isClickable
                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                    : 'text-gray-400 cursor-default'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Avatar */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#D85A30] rounded-full flex items-center justify-center text-[11px] font-bold text-white">
            SM
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white truncate">
              Salon Marie
            </p>
            <p className="text-[10px] text-gray-400">Plan Pro</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal Component ────────────────────────────────────────────────────

export default function ProductTourModal({
  isOpen,
  onClose,
}: ProductTourModalProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const navigateTo = useCallback((index: number) => {
    setCurrentScreen(index);
    setFadeKey((k) => k + 1);
  }, []);

  const goNext = useCallback(() => {
    navigateTo(Math.min(currentScreen + 1, tourScreens.length - 1));
  }, [currentScreen, navigateTo]);

  const goPrev = useCallback(() => {
    navigateTo(Math.max(currentScreen - 1, 0));
  }, [currentScreen, navigateTo]);

  if (!isOpen) return null;

  const screen = tourScreens[currentScreen];
  const isLast = currentScreen === tourScreens.length - 1;
  const isFirst = currentScreen === 0;
  const showSidebar = screen.sidebarIndex !== -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[85vh] flex flex-col overflow-hidden animate-tour-in">
        {/* Progress bar: 10 segments */}
        <div className="flex h-1">
          {tourScreens.map((_, i) => (
            <div
              key={`progress-${i}`}
              className={`flex-1 transition-colors duration-300 ${
                i <= currentScreen ? 'bg-[#D85A30]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Fermer"
        >
          <XIcon className="w-5 h-5 text-gray-500" />
        </button>

        {/* Browser bar */}
        <div className="bg-[#f1f1f1] border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div
              className="w-[10px] h-[10px] rounded-full"
              style={{ backgroundColor: '#FF5F57' }}
            />
            <div
              className="w-[10px] h-[10px] rounded-full"
              style={{ backgroundColor: '#FFBD2E' }}
            />
            <div
              className="w-[10px] h-[10px] rounded-full"
              style={{ backgroundColor: '#28C840' }}
            />
          </div>
          <div className="flex-1 text-center">
            <span className="inline-block bg-white px-4 py-1 rounded-md text-[12px] text-gray-500 font-mono">
              {screen.sidebarIndex === -1
                ? `coccinelle-saas.pages.dev${screen.url}`
                : `app.coccinelle.ai${screen.url}`}
            </span>
          </div>
          <span className="text-[12px] text-gray-400 font-medium tabular-nums">
            {currentScreen + 1} / {tourScreens.length}
          </span>
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar (hidden on mobile, hidden on screen 10) */}
          {showSidebar && (
            <TourSidebar
              activeSidebarIndex={screen.sidebarIndex}
              onNavigate={navigateTo}
            />
          )}

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#f9fafb]">
            <div className="flex-1 p-4 md:p-5 overflow-y-auto">
              {/* Screen title */}
              <h3 className="text-[18px] font-semibold text-gray-900 mb-4">
                {screen.title}
              </h3>

              {/* Screen content with fade animation */}
              <div key={fadeKey} className="animate-tour-fade">
                {screen.content}
              </div>
            </div>

            {/* Value bar */}
            <div className="bg-[#fffbf5] border-t border-orange-100 px-4 md:px-5 py-3 flex-shrink-0 border-l-[3px] border-l-[#D85A30]">
              <p className="text-[13px] text-[#666] leading-relaxed">
                {screen.value}
              </p>
            </div>
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="border-t border-gray-200 px-4 md:px-5 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="inline-flex items-center gap-1 px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Précédent
          </button>

          {/* Dot indicators */}
          <div className="hidden sm:flex items-center gap-1.5">
            {tourScreens.map((_, i) => (
              <button
                key={`dot-${i}`}
                onClick={() => navigateTo(i)}
                className={`rounded-full transition-all ${
                  i === currentScreen
                    ? 'bg-[#D85A30] w-4 h-2'
                    : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
                }`}
                aria-label={`Écran ${i + 1}`}
              />
            ))}
          </div>

          {isLast ? (
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-[14px] font-semibold text-white bg-[#D85A30] hover:bg-[#993C1D] rounded-lg transition-colors"
            >
              Démarrer gratuitement
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-[14px] font-semibold text-white bg-[#D85A30] hover:bg-[#993C1D] rounded-lg transition-colors"
            >
              Suivant
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes tourIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes tourFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-tour-in {
          animation: tourIn 0.3s ease-out;
        }
        .animate-tour-fade {
          animation: tourFade 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
