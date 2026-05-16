'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Phone, PhoneIncoming, Clock, TrendingUp, Users,
  Check, ArrowRight, Search, Bell,
  LayoutDashboard, Bot, BookOpen, Calendar, MessageSquare,
  BarChart3, Settings, ChevronDown,
} from 'lucide-react';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface ChatMsg {
  from: 'client' | 'agent';
  text: string;
  delay: number;
}

interface BadgeItem {
  label: string;
  delay: number;
}

// ─── Scenario Data ──────────────────────────────────────────────────────────────

const SCREEN1_MSGS: ChatMsg[] = [
  { from: 'client', delay: 800,  text: "Bonjour, j'ai une fuite d'eau dans mon appartement depuis ce matin" },
  { from: 'agent',  delay: 2400, text: "Bonjour Jean-Pierre. Votre appartement est au 12 rue des Lilas, appartement 3B ?" },
  { from: 'client', delay: 4000, text: "Oui c'est ça, c'est urgent" },
  { from: 'agent',  delay: 5600, text: "Je crée un ticket sinistre et alerte le responsable. Vous recevrez un SMS." },
];

const SCREEN2_BADGES: BadgeItem[] = [
  { label: 'Ticket sinistre créé — Priorité haute', delay: 800 },
  { label: 'Marie (Sinistres) notifiée', delay: 1600 },
  { label: 'SMS envoyé au locataire', delay: 2400 },
];

const SCREEN3_MSGS: ChatMsg[] = [
  { from: 'client', delay: 800,  text: "J'ai reçu une facture FAC-2026-0892 de 340 € que je conteste" },
  { from: 'agent',  delay: 2400, text: "Bonjour Monsieur Martin. Je trouve votre dossier. Je transmets au gestionnaire comptable." },
];

const SCREEN3_BADGES: BadgeItem[] = [
  { label: 'Dossier FAC-2026-0892 identifié', delay: 4000 },
  { label: 'Pierre (Comptable) alerté', delay: 4800 },
  { label: 'Email récapitulatif envoyé', delay: 5600 },
];

// ─── Mini Sidebar (simplified) ──────────────────────────────────────────────────

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: false },
  { icon: Phone, label: 'Appels', active: true },
  { icon: Users, label: 'Contacts', active: false },
  { icon: Bot, label: 'Agents IA', active: false },
  { icon: BookOpen, label: 'Connaissances', active: false },
  { icon: Calendar, label: 'Rendez-vous', active: false },
  { icon: MessageSquare, label: 'SMS', active: false },
  { icon: BarChart3, label: 'Analytics', active: false },
  { icon: Settings, label: 'Paramètres', active: false },
];

function MiniSidebar({ activeItem }: { activeItem: string }) {
  return (
    <div className="w-48 bg-white border-r border-gray-200 flex-shrink-0 hidden sm:flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
          <CoccinelleIcon size={14} color="white" />
        </div>
        <span className="text-sm font-bold text-gray-900">Coccinelle.ai</span>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-hidden">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.label === activeItem;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Mini Topbar ────────────────────────────────────────────────────────────────

function MiniTopbar() {
  return (
    <div className="h-10 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 w-48">
        <Search className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-400">Rechercher...</span>
      </div>
      <div className="flex items-center gap-2">
        <Bell className="w-3.5 h-3.5 text-gray-400" />
        <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-white text-[10px] font-medium">
          SH
        </div>
      </div>
    </div>
  );
}

// ─── Chrono Hook ────────────────────────────────────────────────────────────────

function useChrono(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Screen Components ──────────────────────────────────────────────────────────

function Screen1({ active }: { active: boolean }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const chrono = useChrono(active);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) { setMsgs([]); return; }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setMsgs([]);
    SCREEN1_MSGS.forEach((m) => {
      const t = setTimeout(() => setMsgs(prev => [...prev, m]), m.delay);
      timersRef.current.push(t);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex h-full bg-gray-50">
      <MiniSidebar activeItem="Appels" />
      <div className="flex-1 flex flex-col min-w-0">
        <MiniTopbar />
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {/* Call banner */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <div className="relative">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900">Appel en cours</div>
              <div className="text-[10px] text-gray-500 truncate">Jean-Pierre Lambert — 06 23 45 67 89</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PhoneIncoming className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Entrant</span>
            </div>
            <div className="text-xs font-mono text-gray-400 tabular-nums flex-shrink-0">{chrono}</div>
          </div>

          {/* Messages */}
          <div className="space-y-2 max-w-lg">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 max-w-[90%] animate-[fadeSlideUp_300ms_ease-out_forwards] ${
                  m.from === 'client'
                    ? 'bg-gray-100'
                    : 'bg-gray-900 ml-auto'
                }`}
              >
                <p className={`text-xs leading-relaxed ${m.from === 'client' ? 'text-gray-700' : 'text-white'}`}>
                  {m.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen2({ active }: { active: boolean }) {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [showToast, setShowToast] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) { setBadges([]); setShowToast(false); return; }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setBadges([]);
    setShowToast(false);

    const t1 = setTimeout(() => setShowToast(true), 400);
    timersRef.current.push(t1);
    const t2 = setTimeout(() => setShowToast(false), 3000);
    timersRef.current.push(t2);

    SCREEN2_BADGES.forEach((b) => {
      const t = setTimeout(() => setBadges(prev => [...prev, b]), b.delay);
      timersRef.current.push(t);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex h-full bg-gray-50">
      <MiniSidebar activeItem="Contacts" />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <MiniTopbar />

        {/* Toast notification */}
        {showToast && (
          <div className="absolute top-12 right-3 z-10 animate-[fadeSlideUp_300ms_ease-out_forwards]">
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <span className="text-[11px] text-gray-700 font-medium">Ticket sinistre créé — Jean-Pierre Lambert</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {/* Contact card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm animate-[fadeSlideUp_300ms_ease-out_forwards]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-700">
                JL
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Jean-Pierre Lambert</div>
                <div className="text-[11px] text-gray-500">Locataire — Nouveau</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600 mb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 text-gray-400" />
                <span>06 23 45 67 89</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span>Appt 3B — 12 rue des Lilas</span>
              </div>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 rounded-full">Sinistre</span>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 rounded-full">Priorité haute</span>
            </div>
            {/* Note */}
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[11px] text-gray-600">Fuite d'eau salle de bain — 14/05/2026</p>
            </div>
          </div>

          {/* Action badges */}
          <div className="mt-4 space-y-2 max-w-sm">
            {badges.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs animate-[fadeSlideUp_300ms_ease-out_forwards]">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-gray-600">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen3({ active }: { active: boolean }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const chrono = useChrono(active);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) { setMsgs([]); setBadges([]); return; }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setMsgs([]);
    setBadges([]);

    SCREEN3_MSGS.forEach((m) => {
      const t = setTimeout(() => setMsgs(prev => [...prev, m]), m.delay);
      timersRef.current.push(t);
    });
    SCREEN3_BADGES.forEach((b) => {
      const t = setTimeout(() => setBadges(prev => [...prev, b]), b.delay);
      timersRef.current.push(t);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="flex h-full bg-gray-50">
      <MiniSidebar activeItem="Appels" />
      <div className="flex-1 flex flex-col min-w-0">
        <MiniTopbar />
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {/* Call banner */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <div className="relative">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900">Appel en cours</div>
              <div className="text-[10px] text-gray-500 truncate">Robert Martin — 06 34 56 78 90</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PhoneIncoming className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Entrant</span>
            </div>
            <div className="text-xs font-mono text-gray-400 tabular-nums flex-shrink-0">{chrono}</div>
          </div>

          {/* Messages */}
          <div className="space-y-2 max-w-lg">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 max-w-[90%] animate-[fadeSlideUp_300ms_ease-out_forwards] ${
                  m.from === 'client' ? 'bg-gray-100' : 'bg-gray-900 ml-auto'
                }`}
              >
                <p className={`text-xs leading-relaxed ${m.from === 'client' ? 'text-gray-700' : 'text-white'}`}>
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mt-3 space-y-2 max-w-lg">
              {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs animate-[fadeSlideUp_300ms_ease-out_forwards]">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-600">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Screen4({ active }: { active: boolean }) {
  const [showFinal, setShowFinal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setShowFinal(false); return; }
    setShowFinal(false);
    timerRef.current = setTimeout(() => setShowFinal(true), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  const metrics = [
    { label: "Appels aujourd'hui", value: '2', icon: Phone },
    { label: 'Appels entrants', value: '2', icon: PhoneIncoming },
    { label: 'Durée moyenne', value: '1m 45s', icon: Clock },
    { label: 'Taux de réponse', value: '100%', icon: TrendingUp },
  ];

  const recentCalls = [
    { name: 'Jean-Pierre Lambert', phone: '06 23 45 67 89', duration: '2m 12s', time: "à l'instant", direction: 'Entrant' },
    { name: 'Robert Martin', phone: '06 34 56 78 90', duration: '1m 18s', time: "à l'instant", direction: 'Entrant' },
  ];

  return (
    <div className="flex h-full bg-gray-50">
      <MiniSidebar activeItem="Dashboard" />
      <div className="flex-1 flex flex-col min-w-0">
        <MiniTopbar />
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {/* Title */}
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-900">Dashboard</h2>
            <p className="text-[10px] text-gray-500">Vue d'ensemble de votre activité</p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="bg-white border border-gray-200 rounded-lg p-3 animate-[fadeSlideUp_300ms_ease-out_forwards]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-gray-500">{m.label}</p>
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                </div>
              );
            })}
          </div>

          {/* Recent calls */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-900">Appels récents</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentCalls.map((call, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 animate-[fadeSlideUp_300ms_ease-out_forwards]">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-700 flex-shrink-0">
                    {call.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{call.name}</p>
                    <p className="text-[10px] text-gray-500">{call.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <PhoneIncoming className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">{call.direction}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 flex-shrink-0">{call.duration}</div>
                  <div className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:block">{call.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Final message */}
          {showFinal && (
            <div className="mt-5 text-center animate-[fadeSlideUp_300ms_ease-out_forwards]">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Tout ça, automatiquement.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Pendant que vous travaillez.
              </p>
              <a
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Essayer gratuitement
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen Labels ──────────────────────────────────────────────────────────────

const SCREEN_LABELS = [
  'Appel entrant',
  'Ticket créé',
  'Deuxième appel',
  'Dashboard',
];

const SCREEN_DURATION = 8000;
const TOTAL_SCREENS = 4;

// ─── Main Modal ─────────────────────────────────────────────────────────────────

export default function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [screen, setScreen] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  const goToScreen = useCallback((idx: number) => {
    setScreen(idx);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!open) return;
    startRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      if (screen < TOTAL_SCREENS - 1) {
        goToScreen(screen + 1);
      }
    }, SCREEN_DURATION);

    // Progress bar
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / SCREEN_DURATION, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, screen, goToScreen]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setScreen(0);
      setProgress(0);
      startRef.current = Date.now();
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-gray-900 transition-none"
            style={{ width: `${((screen + progress) / TOTAL_SCREENS) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <CoccinelleIcon size={16} color="white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Démo live — Syndic Horizon</h3>
              <p className="text-[10px] text-gray-400">{SCREEN_LABELS[screen]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body — dashboard simulation */}
        <div className="flex-1 overflow-hidden" style={{ height: '460px' }}>
          {screen === 0 && <Screen1 active={screen === 0} />}
          {screen === 1 && <Screen2 active={screen === 1} />}
          {screen === 2 && <Screen3 active={screen === 2} />}
          {screen === 3 && <Screen4 active={screen === 3} />}
        </div>

        {/* Footer — navigation */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToScreen(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === screen ? 'bg-gray-900' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Écran ${i + 1}`}
              />
            ))}
            <span className="text-[10px] text-gray-400 ml-2">{screen + 1}/{TOTAL_SCREENS}</span>
          </div>

          {/* Next button */}
          {screen < TOTAL_SCREENS - 1 ? (
            <button
              onClick={() => goToScreen(screen + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <a
              href="/signup"
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Essayer gratuitement
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
