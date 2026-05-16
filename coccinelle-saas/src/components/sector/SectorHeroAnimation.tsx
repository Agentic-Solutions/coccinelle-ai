'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Phone, Check } from 'lucide-react';

// ─── Types (exported for reuse) ─────────────────────────────────────────────────

export interface ScenarioMessage {
  role: 'client' | 'assistant';
  text: string;
  delay: number;
}

export interface ScenarioBadge {
  text: string;
  delay: number;
}

export interface ScenarioData {
  label: string;
  callerName: string;
  callerPhone: string;
  messages: ScenarioMessage[];
  badges: ScenarioBadge[];
}

// ─── Component ──────────────────────────────────────────────────────────────────

const CYCLE_DURATION = 9000;

export default function SectorHeroAnimation({
  scenario1,
  scenario2,
}: {
  scenario1: ScenarioData;
  scenario2: ScenarioData;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ScenarioMessage[]>([]);
  const [visibleBadges, setVisibleBadges] = useState<ScenarioBadge[]>([]);
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const startScenario = useCallback(
    (idx: number) => {
      clearTimers();
      setVisibleMessages([]);
      setVisibleBadges([]);
      setProgress(0);
      startRef.current = Date.now();

      const scenario = idx === 0 ? scenario1 : scenario2;

      scenario.messages.forEach((msg) => {
        const t = setTimeout(
          () => setVisibleMessages((prev) => [...prev, msg]),
          msg.delay + 500,
        );
        timersRef.current.push(t);
      });

      scenario.badges.forEach((badge) => {
        const t = setTimeout(
          () => setVisibleBadges((prev) => [...prev, badge]),
          badge.delay,
        );
        timersRef.current.push(t);
      });

      const autoSwitch = setTimeout(
        () => setActiveTab((idx + 1) % 2),
        CYCLE_DURATION,
      );
      timersRef.current.push(autoSwitch);

      const tick = () => {
        const elapsed = Date.now() - startRef.current;
        const p = Math.min(elapsed / CYCLE_DURATION, 1);
        setProgress(p);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [clearTimers, scenario1, scenario2],
  );

  useEffect(() => {
    startScenario(activeTab);
    return clearTimers;
  }, [activeTab, startScenario, clearTimers]);

  const scenario = activeTab === 0 ? scenario1 : scenario2;

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex">
          {[scenario1, scenario2].map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                activeTab === i
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
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
              <div className="text-sm font-semibold text-gray-900">
                Appel en cours
              </div>
              <div className="text-xs text-gray-500 truncate">
                {scenario.callerName} — {scenario.callerPhone}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 mb-5 min-h-[180px]">
            {visibleMessages.map((msg, i) => (
              <div
                key={`${activeTab}-${i}`}
                className={`rounded-xl px-4 py-3 max-w-[88%] animate-[fadeSlideUp_300ms_ease-out_forwards] ${
                  msg.role === 'client'
                    ? 'bg-gray-100'
                    : 'bg-gray-900 ml-auto'
                }`}
              >
                <p
                  className={`text-sm leading-relaxed ${
                    msg.role === 'client' ? 'text-gray-700' : 'text-white'
                  }`}
                >
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
                  <span className="text-gray-600">{badge.text}</span>
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
