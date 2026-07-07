"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { apiFetch } from "@/lib/api";
import { VOICE_OPTIONS } from "@/lib/voices";
import { SECTORS, LLM_OPTIONS, buildStarterPrompt } from "@/lib/sectors";

export default function NewAgentPage() {
  const router = useRouter();

  const [agentName, setAgentName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState(SECTORS[0].key);
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id);
  const [llmIndex, setLlmIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [promptTouched, setPromptTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const femaleVoices = useMemo(() => VOICE_OPTIONS.filter((v) => v.gender === "Féminin"), []);
  const maleVoices = useMemo(() => VOICE_OPTIONS.filter((v) => v.gender === "Masculin"), []);

  // Génère le prompt de démarrage tant que l'utilisateur ne l'a pas édité.
  const effectivePrompt =
    promptTouched && prompt ? prompt : buildStarterPrompt(sector, agentName, companyName);

  function regenerate() {
    setPrompt(buildStarterPrompt(sector, agentName, companyName));
    setPromptTouched(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (agentName.trim().length < 2) {
      setError("Le nom de l'agent est requis (min 2 caractères).");
      return;
    }
    setSaving(true);
    try {
      const llm = LLM_OPTIONS[llmIndex];
      const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
        "/api/v1/reseller/agents",
        {
          method: "POST",
          body: JSON.stringify({
            agent_name: agentName.trim(),
            company_name: (companyName || agentName).trim(),
            sector,
            voice_id: voiceId,
            llm_provider: llm.provider,
            llm_model: llm.model,
            system_prompt: effectivePrompt, // déjà substitué, 0 variable {}
          }),
        }
      );
      if (!ok || !data.success) {
        setError(data.error || "Création impossible.");
        return;
      }
      router.push("/agents");
    } catch {
      setError("Création impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "mb-1 block text-sm font-medium";
  const labelStyle = { color: "var(--muted)" };

  return (
    <PortalShell active="/agents">
      <Link
        href="/agents"
        className="mb-6 inline-flex items-center gap-1.5 text-sm"
        style={{ color: "var(--muted-2)" }}
      >
        <ArrowLeft size={16} />
        Retour aux agents
      </Link>

      <h1 className="vx-h2 mb-1 text-2xl">Nouvel agent</h1>
      <p className="mb-8 text-sm" style={{ color: "var(--muted-2)" }}>
        Configurez l'identité, la voix et le comportement de votre agent vocal.
      </p>

      {error && (
        <div className="mb-6 rounded-[10px] px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="vx-card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelCls} style={labelStyle}>Nom de l'agent</label>
              <input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="vx-input" placeholder="Léa" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Société représentée</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="vx-input" placeholder="Cabinet Durand" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Secteur</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="vx-input">
                {SECTORS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Moteur IA</label>
              <select value={llmIndex} onChange={(e) => setLlmIndex(Number(e.target.value))} className="vx-input">
                {LLM_OPTIONS.map((l, i) => (
                  <option key={l.model} value={i}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} style={labelStyle}>Voix</label>
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="vx-input">
                <optgroup label="Voix féminines">
                  {femaleVoices.map((v) => (
                    <option key={v.id} value={v.id}>{v.label} — {v.style}</option>
                  ))}
                </optgroup>
                <optgroup label="Voix masculines">
                  {maleVoices.map((v) => (
                    <option key={v.id} value={v.id}>{v.label} — {v.style}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        <div className="vx-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              Instructions de l'agent
            </label>
            <button
              type="button"
              onClick={regenerate}
              className="inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--accent-text)" }}
            >
              <Sparkles size={14} />
              Régénérer depuis le secteur
            </button>
          </div>
          <textarea
            value={effectivePrompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setPromptTouched(true);
            }}
            rows={14}
            className="vx-input vx-mono"
            style={{ fontSize: 12, lineHeight: 1.7, resize: "vertical" }}
          />
          <p className="mt-2 text-xs" style={{ color: "var(--muted-3)" }}>
            Le prompt est pré-rempli selon le secteur. Vous pouvez l'ajuster librement.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/agents" className="vx-btn-secondary px-4 py-2.5 text-sm">
            Annuler
          </Link>
          <button type="submit" disabled={saving} className="vx-btn-primary px-5 py-2.5 text-sm">
            {saving && <Loader2 className="animate-spin" size={16} />}
            Créer l'agent
          </button>
        </div>
      </form>
    </PortalShell>
  );
}
