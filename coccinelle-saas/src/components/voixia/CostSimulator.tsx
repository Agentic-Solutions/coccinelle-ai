'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Cpu, Mic2, Server, TrendingDown, ArrowRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

type LlmOption = 'mistral_small' | 'mistral_large' | 'claude_haiku';
type VoiceOption = 'standard' | 'premium';

interface LlmConfig {
  label: string;
  costPerMin: number;
}

// ─── Constantes tarification ────────────────────────────────────────────────────

const BASE_PER_MIN = 0.02;          // STT + infrastructure
const RETELL_PER_MIN_USD = 0.165;
const USD_TO_EUR = 0.92;
const FONIO_PER_MIN = 0.15;

const LLM_OPTIONS: Record<LlmOption, LlmConfig> = {
  mistral_small:  { label: 'Mistral Small',  costPerMin: 0.06 },
  mistral_large:  { label: 'Mistral Large',  costPerMin: 0.09 },
  claude_haiku:   { label: 'Claude Haiku',   costPerMin: 0.07 },
};

const VOICE_OPTIONS: Record<VoiceOption, { label: string; costPerMin: number }> = {
  standard: { label: 'Standard',  costPerMin: 0.02 },
  premium:  { label: 'Premium',   costPerMin: 0.03 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtEur(n: number): string {
  if (n >= 10000) return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtUsd(n: number): string {
  if (n >= 10000) return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' $';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}

// ─── Slider ticks ───────────────────────────────────────────────────────────────

const SLIDER_TICKS = [100, 1000, 5000, 10000, 50000];

function volumeFromSlider(v: number): number {
  const idx = Math.floor(v);
  const frac = v - idx;
  if (idx >= SLIDER_TICKS.length - 1) return SLIDER_TICKS[SLIDER_TICKS.length - 1];
  return Math.round(SLIDER_TICKS[idx] + frac * (SLIDER_TICKS[idx + 1] - SLIDER_TICKS[idx]));
}

function sliderFromVolume(vol: number): number {
  for (let i = 0; i < SLIDER_TICKS.length - 1; i++) {
    if (vol <= SLIDER_TICKS[i + 1]) {
      return i + (vol - SLIDER_TICKS[i]) / (SLIDER_TICKS[i + 1] - SLIDER_TICKS[i]);
    }
  }
  return SLIDER_TICKS.length - 1;
}

// ─── Composant ──────────────────────────────────────────────────────────────────

export default function CostSimulator() {
  const [sliderVal, setSliderVal] = useState(sliderFromVolume(1000));
  const [llm, setLlm] = useState<LlmOption>('mistral_small');
  const [voice, setVoice] = useState<VoiceOption>('standard');

  const volume = volumeFromSlider(sliderVal);

  const breakdown = useMemo(() => {
    const pricePerMin = BASE_PER_MIN + LLM_OPTIONS[llm].costPerMin + VOICE_OPTIONS[voice].costPerMin;
    const baseCost = volume * BASE_PER_MIN;
    const llmCost = volume * LLM_OPTIONS[llm].costPerMin;
    const voiceCost = volume * VOICE_OPTIONS[voice].costPerMin;
    const total = volume * pricePerMin;
    const retellUsd = volume * RETELL_PER_MIN_USD;
    const retellEur = retellUsd * USD_TO_EUR;
    const retellSaving = retellEur > 0 ? Math.round((1 - total / retellEur) * 100) : 0;
    const fonioEur = volume * FONIO_PER_MIN;
    const fonioSaving = fonioEur > 0 ? Math.round((1 - total / fonioEur) * 100) : 0;
    return { pricePerMin, baseCost, llmCost, voiceCost, total, retellUsd, retellEur, retellSaving, fonioEur, fonioSaving };
  }, [volume, llm, voice]);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-4">
          <Calculator className="w-3 h-3" />
          Simulateur interactif
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Estimez votre co&ucirc;t</h2>
        <p className="text-gray-400">Ajustez les param&egrave;tres selon votre usage</p>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ─── LEFT: Parametres ─────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-8">

          {/* Volume slider */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-300">Volume mensuel</label>
              <span className="text-lg font-bold text-white tabular-nums">
                {fmt(volume)}<span className="text-sm text-gray-500 font-normal ml-1">min/mois</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={SLIDER_TICKS.length - 1}
              step={0.01}
              value={sliderVal}
              onChange={(e) => setSliderVal(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.4)] [&::-webkit-slider-thumb]:cursor-grab
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-emerald-500
                [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
            />
            <div className="flex justify-between mt-2 text-[10px] text-gray-600">
              {SLIDER_TICKS.map((t) => (
                <span key={t}>{t >= 1000 ? `${t / 1000}K` : t}</span>
              ))}
            </div>
          </div>

          {/* LLM selection */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Mod&egrave;le IA</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LLM_OPTIONS) as LlmOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setLlm(key)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    llm === key
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {LLM_OPTIONS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice quality */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Qualit&eacute; voix</label>
            <div className="flex gap-2">
              {(Object.keys(VOICE_OPTIONS) as VoiceOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setVoice(key)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    voice === key
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  {VOICE_OPTIONS[key].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Resultats ─────────────────────────────── */}
        <div className="space-y-6">

          {/* Main result card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
            <p className="text-sm text-gray-400 mb-4">Co&ucirc;t estim&eacute;</p>

            {/* Price per minute */}
            <div className="mb-2">
              <span className="text-5xl font-bold text-white tabular-nums">
                {breakdown.pricePerMin.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-xl text-gray-400 ml-1">€/min</span>
            </div>
            <p className="text-2xl font-semibold text-emerald-400 tabular-nums mb-6">
              = {fmtEur(breakdown.total)}<span className="text-base text-gray-400 font-normal"> /mois</span>
            </p>

            {/* Breakdown */}
            <div className="border-t border-gray-800 pt-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">D&eacute;tail</p>
              <div className="space-y-3">
                {[
                  { icon: Server, label: 'STT + Infrastructure',                         value: breakdown.baseCost },
                  { icon: Cpu,    label: `LLM ${LLM_OPTIONS[llm].label}`,                value: breakdown.llmCost },
                  { icon: Mic2,   label: `TTS ElevenLabs ${VOICE_OPTIONS[voice].label}`,  value: breakdown.voiceCost },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-sm text-gray-400">
                      <row.icon className="w-4 h-4 text-gray-600" />
                      {row.label}
                    </div>
                    <span className="text-sm text-gray-300 tabular-nums font-medium">{fmtEur(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* vs Retell */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-gray-500">vs Retell.ai</p>
                </div>
                <p className="text-sm text-gray-300 tabular-nums">{fmtUsd(breakdown.retellUsd)}/mois</p>
                <p className="text-[11px] text-gray-500 tabular-nums mb-1">soit ~{fmtEur(breakdown.retellEur)} au taux actuel</p>
                <p className="text-emerald-400 text-sm font-semibold tabular-nums">
                  &minus;{breakdown.retellSaving}% avec VoixIA
                </p>
              </div>
              {/* vs Fonio */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-gray-500">vs Fonio.ai</p>
                </div>
                <p className="text-sm text-gray-300 tabular-nums mb-1">{fmtEur(breakdown.fonioEur)}/mois</p>
                <p className="text-emerald-400 text-sm font-semibold tabular-nums">
                  {breakdown.fonioSaving > 0 ? <>&minus;{breakdown.fonioSaving}% avec VoixIA</> : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-colors text-base"
        >
          Commencer gratuitement
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
