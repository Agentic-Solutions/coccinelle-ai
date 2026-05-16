'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Phone,
  PhoneIncoming,
  Clock,
  TrendingUp,
  Check,
  ArrowRight,
  Search,
  Bell,
  LayoutDashboard,
  Bot,
  BookOpen,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';
import {
  type ScenarioData,
  type ScenarioMessage,
  type ScenarioBadge,
} from './SectorHeroAnimation';

// ─── Mini Sidebar ───────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Phone, label: 'Appels' },
  { icon: Users, label: 'Contacts' },
  { icon: Bot, label: 'Agents IA' },
  { icon: BookOpen, label: 'Connaissances' },
  { icon: Calendar, label: 'Rendez-vous' },
  { icon: MessageSquare, label: 'SMS' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Settings, label: 'Param\u00e8tres' },
];

function MiniSidebar({ activeItem }: { activeItem: string }) {
  return (
    <div className="w-48 bg-white border-r border-gray-200 flex-shrink-0 hidden sm:flex flex-col">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-200">
        <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center flex-shrink-0">
          <CoccinelleIcon size={14} color="white" />
        </div>
        <span className="text-sm font-bold text-gray-900">Coccinelle.ai</span>
      </div>
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
              <Icon
                className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-gray-900' : 'text-gray-400'}`}
              />
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
          YA
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
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Call Screen ────────────────────────────────────────────────────────────────

function CallScreen({
  active,
  scenario,
}: {
  active: boolean;
  scenario: ScenarioData;
}) {
  const [msgs, setMsgs] = useState<ScenarioMessage[]>([]);
  const [badges, setBadges] = useState<ScenarioBadge[]>([]);
  const chrono = useChrono(active);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) {
      setMsgs([]);
      setBadges([]);
      return;
    }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setMsgs([]);
    setBadges([]);

    scenario.messages.forEach((m) => {
      const t = setTimeout(
        () => setMsgs((prev) => [...prev, m]),
        m.delay + 500,
      );
      timersRef.current.push(t);
    });
    scenario.badges.forEach((b) => {
      const t = setTimeout(
        () => setBadges((prev) => [...prev, b]),
        b.delay,
      );
      timersRef.current.push(t);
    });
    return () => timersRef.current.forEach(clearTimeout);
  }, [active, scenario]);

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
              <div className="text-xs font-semibold text-gray-900">
                Appel en cours
              </div>
              <div className="text-[10px] text-gray-500 truncate">
                {scenario.callerName} — {scenario.callerPhone}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PhoneIncoming className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">Entrant</span>
            </div>
            <div className="text-xs font-mono text-gray-400 tabular-nums flex-shrink-0">
              {chrono}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-2 max-w-lg">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 max-w-[90%] animate-[fadeSlideUp_300ms_ease-out_forwards] ${
                  m.role === 'client'
                    ? 'bg-gray-100'
                    : 'bg-gray-900 ml-auto'
                }`}
              >
                <p
                  className={`text-xs leading-relaxed ${m.role === 'client' ? 'text-gray-700' : 'text-white'}`}
                >
                  {m.text}
                </p>
              </div>
            ))}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mt-3 space-y-2 max-w-lg">
              {badges.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs animate-[fadeSlideUp_300ms_ease-out_forwards]"
                >
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-600">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Screen ───────────────────────────────────────────────────────────

function DashboardScreen({
  active,
  scenario1,
  scenario2,
  sectorName,
}: {
  active: boolean;
  scenario1: ScenarioData;
  scenario2: ScenarioData;
  sectorName: string;
}) {
  const [showFinal, setShowFinal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setShowFinal(false);
      return;
    }
    setShowFinal(false);
    timerRef.current = setTimeout(() => setShowFinal(true), 2000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  const metrics = [
    { label: "Appels aujourd'hui", value: '2', icon: Phone },
    { label: 'Appels entrants', value: '2', icon: PhoneIncoming },
    { label: 'Dur\u00e9e moyenne', value: '1m 45s', icon: Clock },
    { label: 'Taux de r\u00e9ponse', value: '100%', icon: TrendingUp },
  ];

  const recentCalls = [
    {
      name: scenario1.callerName,
      phone: scenario1.callerPhone,
      duration: '2m 12s',
      time: "\u00e0 l'instant",
    },
    {
      name: scenario2.callerName,
      phone: scenario2.callerPhone,
      duration: '1m 18s',
      time: "\u00e0 l'instant",
    },
  ];

  return (
    <div className="flex h-full bg-gray-50">
      <MiniSidebar activeItem="Dashboard" />
      <div className="flex-1 flex flex-col min-w-0">
        <MiniTopbar />
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-900">Dashboard</h2>
            <p className="text-[10px] text-gray-500">
              Vue d&apos;ensemble de votre activit\u00e9
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className="bg-white border border-gray-200 rounded-lg p-3 animate-[fadeSlideUp_300ms_ease-out_forwards]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-gray-500">{m.label}</p>
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{m.value}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-3 py-2 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-900">
                Appels r\u00e9cents
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {recentCalls.map((call, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 animate-[fadeSlideUp_300ms_ease-out_forwards]"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-700 flex-shrink-0">
                    {call.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {call.name}
                    </p>
                    <p className="text-[10px] text-gray-500">{call.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <PhoneIncoming className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Entrant</span>
                  </div>
                  <div className="text-[11px] text-gray-600 flex-shrink-0">
                    {call.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showFinal && (
            <div className="mt-5 text-center animate-[fadeSlideUp_300ms_ease-out_forwards]">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Tout \u00e7a, automatiquement.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Pendant que vous travaillez.
              </p>
              <a
                href="/fondateurs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Devenir Membre Fondateur
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

const SCREEN_DURATION = 8000;
const TOTAL_SCREENS = 3;

// ─── Main Modal ─────────────────────────────────────────────────────────────────

export default function SectorDemoModal({
  open,
  onClose,
  sectorName,
  scenario1,
  scenario2,
}: {
  open: boolean;
  onClose: () => void;
  sectorName: string;
  scenario1: ScenarioData;
  scenario2: ScenarioData;
}) {
  const screenLabels = [scenario1.label, scenario2.label, 'Dashboard'];
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

  useEffect(() => {
    if (!open) return;
    startRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      if (screen < TOTAL_SCREENS - 1) goToScreen(screen + 1);
    }, SCREEN_DURATION);

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

  useEffect(() => {
    if (open) {
      setScreen(0);
      setProgress(0);
      startRef.current = Date.now();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-gray-900 transition-none"
            style={{
              width: `${((screen + progress) / TOTAL_SCREENS) * 100}%`,
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
              <CoccinelleIcon size={16} color="white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                D\u00e9mo live — {sectorName}
              </h3>
              <p className="text-[10px] text-gray-400">
                {screenLabels[screen]}
              </p>
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

        {/* Body */}
        <div className="flex-1 overflow-hidden" style={{ height: '460px' }}>
          {screen === 0 && (
            <CallScreen active={screen === 0} scenario={scenario1} />
          )}
          {screen === 1 && (
            <CallScreen active={screen === 1} scenario={scenario2} />
          )}
          {screen === 2 && (
            <DashboardScreen
              active={screen === 2}
              scenario1={scenario1}
              scenario2={scenario2}
              sectorName={sectorName}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToScreen(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === screen
                    ? 'bg-gray-900'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`\u00c9cran ${i + 1}`}
              />
            ))}
            <span className="text-[10px] text-gray-400 ml-2">
              {screen + 1}/{TOTAL_SCREENS}
            </span>
          </div>

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
              href="/fondateurs"
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Devenir Membre Fondateur
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
