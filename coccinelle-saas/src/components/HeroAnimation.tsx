'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, Check } from 'lucide-react';

// ─── Scenarios ──────────────────────────────────────────────────────────────────

interface Message { from: 'client' | 'agent'; text: string }
interface Badge { label: string }

interface Scenario {
  tab: string;
  name: string;
  phone: string;
  messages: { delay: number; msg: Message }[];
  badges: { delay: number; badge: Badge }[];
}

const SCENARIOS: Scenario[] = [
  {
    tab: 'Appel 1 — Locataire',
    name: 'Jean-Pierre L.',
    phone: '06 23 45 67 89',
    messages: [
      { delay: 1000,  msg: { from: 'client', text: "Bonjour, j'ai une fuite d'eau dans ma salle de bain depuis ce matin" } },
      { delay: 2500,  msg: { from: 'agent',  text: "Bonjour Jean-Pierre. Je comprends l'urgence. Votre appartement est bien au 12 rue des Lilas, appartement 3B ?" } },
      { delay: 4000,  msg: { from: 'client', text: "Oui c'est ça, c'est urgent" } },
      { delay: 5500,  msg: { from: 'agent',  text: "Je crée immédiatement un ticket sinistre et j'alerte le responsable. Vous recevrez un SMS de suivi." } },
    ],
    badges: [
      { delay: 7000,  badge: { label: 'Ticket sinistre créé — Priorité haute' } },
      { delay: 7400,  badge: { label: 'Marie (Responsable sinistres) notifiée' } },
      { delay: 7800,  badge: { label: 'SMS envoyé au locataire' } },
    ],
  },
  {
    tab: 'Appel 2 — Propriétaire',
    name: 'Robert M.',
    phone: '06 34 56 78 90',
    messages: [
      { delay: 1000,  msg: { from: 'client', text: "J'ai reçu une facture de 340 € que je conteste, ce n'est pas normal" } },
      { delay: 2500,  msg: { from: 'agent',  text: "Bonjour Monsieur Martin. Je comprends votre préoccupation. Pouvez-vous me donner la référence de la facture ?" } },
      { delay: 4000,  msg: { from: 'client', text: "C'est la facture FAC-2026-0892" } },
      { delay: 5500,  msg: { from: 'agent',  text: "J'ai trouvé votre dossier. Je transmets votre contestation au gestionnaire comptable avec priorité." } },
    ],
    badges: [
      { delay: 7000,  badge: { label: 'Dossier FAC-2026-0892 identifié' } },
      { delay: 7400,  badge: { label: 'Pierre (Gestionnaire comptable) alerté' } },
      { delay: 7800,  badge: { label: 'Email récapitulatif envoyé' } },
    ],
  },
];

const CYCLE_DURATION = 9000;

// ─── Component ──────────────────────────────────────────────────────────────────

export default function HeroAnimation() {
  const [activeTab, setActiveTab] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [visibleBadges, setVisibleBadges] = useState<Badge[]>([]);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const startScenario = useCallback((idx: number) => {
    clearTimers();
    setVisibleMessages([]);
    setVisibleBadges([]);
    setProgress(0);
    startRef.current = Date.now();

    const scenario = SCENARIOS[idx];

    // Schedule messages
    scenario.messages.forEach(({ delay, msg }) => {
      const t = setTimeout(() => {
        setVisibleMessages(prev => [...prev, msg]);
      }, delay);
      timersRef.current.push(t);
    });

    // Schedule badges
    scenario.badges.forEach(({ delay, badge }) => {
      const t = setTimeout(() => {
        setVisibleBadges(prev => [...prev, badge]);
      }, delay);
      timersRef.current.push(t);
    });

    // Auto-switch
    const autoSwitch = setTimeout(() => {
      const next = (idx + 1) % SCENARIOS.length;
      setActiveTab(next);
    }, CYCLE_DURATION);
    timersRef.current.push(autoSwitch);

    // Progress bar
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / CYCLE_DURATION, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [clearTimers]);

  useEffect(() => {
    startScenario(activeTab);
    return clearTimers;
  }, [activeTab, startScenario, clearTimers]);

  const scenario = SCENARIOS[activeTab];

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Tabs */}
        <div className="flex">
          {SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                activeTab === i
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Appel en cours</div>
              <div className="text-xs text-gray-500 truncate">{scenario.name} — {scenario.phone}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 mb-5 min-h-[180px]">
            {visibleMessages.map((msg, i) => (
              <div
                key={`${activeTab}-${i}`}
                className={`rounded-xl px-4 py-3 max-w-[88%] animate-[fadeSlideUp_300ms_ease-out_forwards] ${
                  msg.from === 'client'
                    ? 'bg-gray-100'
                    : 'bg-gray-900 ml-auto'
                }`}
              >
                <p className={`text-sm leading-relaxed ${
                  msg.from === 'client' ? 'text-gray-700' : 'text-white'
                }`}>
                  {msg.text}
                </p>
              </div>
            ))}
          </div>

          {/* Badges */}
          {visibleBadges.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-gray-100">
              {visibleBadges.map((badge, i) => (
                <div
                  key={`${activeTab}-b-${i}`}
                  className="flex items-center gap-2 text-sm animate-[fadeSlideUp_300ms_ease-out_forwards]"
                >
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-600">{badge.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
