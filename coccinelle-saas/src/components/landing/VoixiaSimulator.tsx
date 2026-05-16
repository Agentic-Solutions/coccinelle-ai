'use client';

import { useState, useMemo } from 'react';
import { Calculator, Cpu, Mic2, Radio, Server, TrendingDown } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

type LlmOption = 'mistral_small' | 'mistral_large' | 'claude_haiku';
type VoiceOption = 'standard' | 'premium';

interface LlmConfig {
  label: string;
  costPerMin: number;
  provider: string;
}

// ─── Constantes tarification ────────────────────────────────────────────────────

const PRICE_PER_MIN = 0.10;
const STT_PER_MIN = 0.007;
const INFRA_PER_MIN = 0.003;
const RETELL_PER_MIN_USD = 0.165;
const USD_TO_EUR = 0.92;
const SECRETAIRE_MONTHLY = 1500;

const LLM_OPTIONS: Record<LlmOption, LlmConfig> = {
  mistral_small:  { label: 'Mistral Small',  costPerMin: 0.045, provider: 'Mistral' },
  mistral_large:  { label: 'Mistral Large',  costPerMin: 0.055, provider: 'Mistral' },
  claude_haiku:   { label: 'Claude Haiku',   costPerMin: 0.050, provider: 'Anthropic' },
};

const VOICE_OPTIONS: Record<VoiceOption, { label: string; costPerMin: number }> = {
  standard: { label: 'Standard',  costPerMin: 0.000 },
  premium:  { label: 'Premium',   costPerMin: 0.005 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtEur(n: number): string {
  if (n >= 10000) return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '\u202F\u20AC';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '\u202F\u20AC';
}

// ─── Slider ticks ───────────────────────────────────────────────────────────────

const SLIDER_TICKS = [100, 500, 1000, 2000, 5000, 10000, 25000, 50000];

function volumeFromSlider(v: number): number {
  const idx = Math.floor(v);
  const frac = v - idx;
  if (idx >= SLIDER_TICKS.length - 1) return SLIDER_TICKS[SLIDER_TICKS.length - 1];
  return Math.round(SLIDER_TICKS[idx] + frac * (SLIDER_TICKS[idx + 1] - SLIDER_TICKS[idx]));
}

// ─── Composant ──────────────────────────────────────────────────────────────────

export default function VoixiaSimulator() {
  const [sliderVal, setSliderVal] = useState(2); // index 2 = 1000 min
  const [llm, setLlm] = useState<LlmOption>('mistral_small');
  const [voice, setVoice] = useState<VoiceOption>('standard');

  const volume = volumeFromSlider(sliderVal);

  const breakdown = useMemo(() => {
    const stt = volume * STT_PER_MIN;
    const llmCost = volume * LLM_OPTIONS[llm].costPerMin;
    const tts = volume * VOICE_OPTIONS[voice].costPerMin;
    const infra = volume * INFRA_PER_MIN;
    const total = volume * PRICE_PER_MIN;
    const margin = total - stt - llmCost - tts - infra;
    const retell = volume * RETELL_PER_MIN_USD * USD_TO_EUR;
    const retellSaving = total > 0 ? Math.round((1 - total / retell) * 100) : 0;
    const secretaireSaving = total > 0 ? Math.round((1 - total / SECRETAIRE_MONTHLY) * 100) : 0;
    return { stt, llmCost, tts, infra, total, margin, retell, retellSaving, secretaireSaving };
  }, [volume, llm, voice]);

  return (
    <section id="simulator" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-4">
            <Calculator className="w-3 h-3" />
            Simulateur interactif
          </div>
          <h2 className="text-3xl font-bold mb-3">Estimez votre co&ucirc;t</h2>
          <p className="text-gray-400">Ajustez les param&egrave;tres pour voir votre tarif en temps r&eacute;el</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

          {/* ─── Parametres ─────────────────────────────────────── */}
          <div className="p-6 sm:p-8 space-y-8">

            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-3">
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
                  <span key={t}>{t >= 1000 ? `${t / 1000}k` : t}</span>
                ))}
              </div>
            </div>

            {/* LLM + Voice */}
            <div className="grid sm:grid-cols-2 gap-6">

              {/* LLM */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">
                  Mod&egrave;le LLM
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LLM_OPTIONS) as LlmOption[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setLlm(key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        llm === key
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      {LLM_OPTIONS[key].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">
                  Qualit&eacute; voix
                </label>
                <div className="flex gap-2">
                  {(Object.keys(VOICE_OPTIONS) as VoiceOption[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setVoice(key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        voice === key
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      {VOICE_OPTIONS[key].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Resultat ───────────────────────────────────────── */}
          <div className="bg-emerald-950/60 border-t border-emerald-900/40 p-6 sm:p-8">

            {/* Total */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-sm text-emerald-400/70 mb-1">Co&ucirc;t mensuel estim&eacute;</p>
                <p className="text-4xl font-bold text-white tabular-nums">
                  {fmtEur(breakdown.total)}
                  <span className="text-lg text-gray-400 font-normal">/mois</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  soit {(PRICE_PER_MIN).toFixed(2).replace('.', ',')}&thinsp;&euro;/min &mdash; tarif fixe toutes options
                </p>
              </div>
            </div>

            {/* Comparaisons */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-gray-400">vs Retell.ai</p>
                </div>
                <p className="text-lg font-bold text-white tabular-nums">
                  {fmtEur(breakdown.retell)}
                  <span className="text-sm text-gray-500 font-normal">/mois</span>
                </p>
                <p className="text-emerald-400 text-sm font-semibold mt-1">
                  &minus;{breakdown.retellSaving}% avec VoixIA
                </p>
              </div>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-gray-400">vs Secr&eacute;taire</p>
                </div>
                <p className="text-lg font-bold text-white tabular-nums">
                  {fmtEur(SECRETAIRE_MONTHLY)}
                  <span className="text-sm text-gray-500 font-normal">/mois</span>
                </p>
                <p className="text-emerald-400 text-sm font-semibold mt-1">
                  &minus;{breakdown.secretaireSaving}% avec VoixIA
                </p>
              </div>
            </div>

            {/* Detail ventilation */}
            <div>
              <p className="text-sm text-gray-400 mb-3">D&eacute;tail de la ventilation</p>
              <div className="space-y-2">
                {[
                  { icon: Radio,  label: 'STT (Deepgram)',                           value: breakdown.stt },
                  { icon: Cpu,    label: `LLM (${LLM_OPTIONS[llm].provider})`,        value: breakdown.llmCost },
                  { icon: Mic2,   label: `TTS (ElevenLabs ${VOICE_OPTIONS[voice].label})`, value: breakdown.tts },
                  { icon: Server, label: 'Infrastructure',                            value: breakdown.infra },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <row.icon className="w-3.5 h-3.5 text-gray-600" />
                      {row.label}
                    </div>
                    <span className="text-sm text-gray-300 tabular-nums font-medium">{fmtEur(row.value)}</span>
                  </div>
                ))}
                <div className="border-t border-emerald-900/40 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-sm text-emerald-400">Marge Coccinelle</span>
                  <span className="text-sm text-emerald-400 tabular-nums font-semibold">{fmtEur(breakdown.margin)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
