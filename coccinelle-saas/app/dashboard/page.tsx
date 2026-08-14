'use client';

import { useState, useEffect } from 'react';
import {
  Phone, PhoneIncoming, Clock, TrendingUp,
  PhoneOutgoing, PhoneMissed, ArrowUp, ArrowDown, Loader2,
  CreditCard, AlertCircle, FileText
} from 'lucide-react';
import Link from 'next/link';
import SetupChecklist from '@/components/dashboard/SetupChecklist';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface CallStats {
  total_calls: number;
  inbound_calls: number;
  avg_duration_seconds: number;
  completed_calls: number;
  total_calls_count: number;
}

interface Call {
  id: string;
  from_number: string;
  direction: 'inbound' | 'outbound';
  status: string;
  duration: number;
  prospect_name: string | null;
  created_at: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 00s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'a l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${Math.floor(diffH / 24)}j`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCallIcon(direction: string, status: string) {
  if (status === 'failed' || status === 'no_answer' || status === 'busy') {
    return <PhoneMissed className="w-4 h-4 text-red-500" />;
  }
  if (direction === 'outbound') {
    return <PhoneOutgoing className="w-4 h-4 text-gray-500" />;
  }
  return <PhoneIncoming className="w-4 h-4 text-gray-500" />;
}

function getCallLabel(direction: string, status: string): string {
  if (status === 'failed' || status === 'no_answer' || status === 'busy') return 'Manque';
  if (direction === 'outbound') return 'Sortant';
  return 'Entrant';
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Essai gratuit',
  essentiel: 'Essentiel',
  starter: 'Essentiel',
  pro: 'Pro',
  business: 'Business',
};

interface SubInfo {
  plan: string;
  status: string;
  trial_days_remaining: number | null;
}

/** « mardi 13 août » — le jour, en toutes lettres, sans bibliothèque. */
function dateDuJour(): string {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const d = new Date();
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CallStats | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<number | null>(null);

  useEffect(() => {
    // try/catch : un getItem peut lever (navigation privée stricte, stockage
    // bloqué). Non protégé, l'effet jetait et `loading` restait bloqué à true.
    let token: string | null = null;
    try {
      token = typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
        : null;
    } catch { /* stockage inaccessible : traité comme non authentifié */ }
    if (!token) {
      setLoading(false);
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/api/v1/calls/stats`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/api/v1/calls?limit=5`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/api/v1/billing/subscription`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/api/v1/auth/me`, { headers }).then(r => r.json()).catch(() => null),
    ]).then(([statsRes, callsRes, subRes, meRes]) => {
      if (statsRes?.stats) setStats(statsRes.stats);
      if (callsRes?.calls) setCalls(callsRes.calls);
      if (subRes?.success && subRes.subscription) {
        setSub(subRes.subscription);
      } else {
        setSub({ plan: 'trial', status: 'trialing', trial_days_remaining: 0 });
      }
      if (meRes?.user) setPhoneVerified(meRes.user.phone_verified ?? 0);
      setLoading(false);
    });
  }, []);

  const totalCalls = stats?.total_calls || 0;
  const inboundCalls = stats?.inbound_calls || 0;
  const avgDuration = stats?.avg_duration_seconds || 0;
  const completedCalls = stats?.completed_calls || 0;
  const responseRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

  // Les trois blocs de la maquette. On ne garde plus « taux de reponse » ni
  // « duree moyenne » en vedette : ce sont des indicateurs d'outil, pas des
  // faits de la journee. Ils restent dans Analytics.
  const metrics = [
    {
      label: 'Appels reçus',
      value: String(totalCalls),
      note: inboundCalls > 0 ? `${inboundCalls} entrants` : 'aucun appel entrant',
    },
    {
      label: 'Durée moyenne',
      value: formatDuration(avgDuration),
      note: `${completedCalls} appel${completedCalls > 1 ? 's' : ''} traité${completedCalls > 1 ? 's' : ''}`,
    },
    {
      label: 'Taux de réponse',
      value: `${responseRate}%`,
      note: 'appels menés à leur terme',
    },
  ];

  // La checklist ne dépend PAS du chargement des KPI : elle a son propre état
  // et rend null tant qu'elle n'a rien. La laisser derrière le garde `loading`
  // la rendait tributaire de 4 requêtes (calls/stats, calls, billing, auth/me)
  // regroupées dans un Promise.all sans timeout — une seule qui ne revient pas
  // et l'accompagnement du démarrage disparaît.
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="pl-10 lg:pl-0">
          <h1 className="text-2xl font-bold text-gray-900">Mon activité</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ce que votre assistant a fait aujourd&apos;hui, {dateDuJour()}
          </p>
        </div>
        <SetupChecklist />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Titre */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-2xl font-bold text-gray-900">Mon activité</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ce que votre assistant a fait aujourd&apos;hui, {dateDuJour()}
        </p>
      </div>

      {/* Checklist de demarrage — se masque seule une fois les 5 etapes faites */}
      <SetupChecklist />

      {/* Banniere abonnement */}
      {sub && sub.status === 'trialing' && sub.trial_days_remaining !== null && sub.trial_days_remaining > 0 && (
        <Link href="/dashboard/billing" className="block">
          <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Essai gratuit — {sub.trial_days_remaining} jour{sub.trial_days_remaining > 1 ? 's' : ''} restant{sub.trial_days_remaining > 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">Choisir un plan &rarr;</span>
          </div>
        </Link>
      )}
      {sub && (sub.status === 'trialing') && (sub.trial_days_remaining === null || sub.trial_days_remaining <= 0) && (
        <Link href="/dashboard/billing" className="block">
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Votre essai est termine
              </span>
            </div>
            <span className="text-sm font-medium text-red-900">Choisir un plan &rarr;</span>
          </div>
        </Link>
      )}
      {sub && (sub.status === 'past_due' || sub.status === 'canceled') && (
        <Link href="/dashboard/billing" className="block">
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {sub.status === 'past_due' ? 'Paiement echoue' : 'Abonnement annule'} — mettez a jour votre facturation
              </span>
            </div>
            <span className="text-sm font-medium text-red-900">Facturation &rarr;</span>
          </div>
        </Link>
      )}
      {sub && sub.status === 'active' && (
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">
            Plan <span className="font-medium text-gray-900">{PLAN_LABELS[sub.plan] || sub.plan}</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        </div>
      )}

      {/* Rappel vérification téléphone (item 5) */}
      {phoneVerified === 0 && (
        <Link href="/dashboard/settings" className="block">
          <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Vérifiez votre numéro de téléphone pour sécuriser votre compte
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">Vérifier &rarr;</span>
          </div>
        </Link>
      )}

      {/* Metriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white border border-[#e2e2de] rounded-[14px] px-[22px] py-5 flex flex-col gap-3.5"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-[#6b6b66]">{metric.label}</span>
              <span className="text-[30px] font-semibold tracking-[-0.02em] font-mono text-[#1a1a19]">
                {metric.value}
              </span>
            </span>
            <span className="text-[12.5px] text-[#a3a39c]">{metric.note}</span>
          </div>
        ))}
      </div>

      {/* Appels recents */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Appels recents</h2>
        </div>
        {calls.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            Aucun appel enregistre pour le moment
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {calls.map((call) => {
              const displayName = call.prospect_name || call.from_number || 'Inconnu';
              return (
                <div
                  key={call.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {/* Avatar initiales */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                    call.status === 'failed' || call.status === 'no_answer'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getInitials(displayName)}
                  </div>

                  {/* Nom et numero */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      call.status === 'failed' || call.status === 'no_answer' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{call.from_number}</p>
                  </div>

                  {/* Type appel */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {getCallIcon(call.direction, call.status)}
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {getCallLabel(call.direction, call.status)}
                    </span>
                  </div>

                  {/* Duree */}
                  <div className="text-sm text-gray-600 w-16 text-right flex-shrink-0">
                    {formatDuration(call.duration)}
                  </div>

                  {/* Temps relatif */}
                  <div className="text-xs text-gray-400 w-24 text-right flex-shrink-0 hidden sm:block">
                    {formatTimeAgo(call.created_at)}
                  </div>

                  {/* Transcription */}
                  <Link
                    href={`/dashboard/analytics/transcripts?call_id=${call.id}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors flex-shrink-0"
                    title="Voir la transcription"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Transcription</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
