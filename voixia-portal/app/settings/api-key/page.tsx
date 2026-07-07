"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { apiFetch } from "@/lib/api";
import { API_DOC_BASE } from "@/lib/config";

export default function ApiKeyPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch<{ success: boolean; api_key: string; error?: string }>(
        "/api/v1/tenant/api-key"
      );
      if (ok && data.success) setApiKey(data.api_key);
      else setError(data.error || "Clé indisponible.");
      setLoading(false);
    })();
  }, []);

  async function copy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const masked = apiKey
    ? apiKey.slice(0, 6) + "•".repeat(Math.max(apiKey.length - 10, 4)) + apiKey.slice(-4)
    : "";

  const dot = { width: 10, height: 10, borderRadius: "50%", background: "var(--border-2)" };

  return (
    <PortalShell active="/settings/api-key">
      <div className="mb-8 flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center rounded-[9px] p-2"
          style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
        >
          <KeyRound size={22} />
        </span>
        <div>
          <h1 className="vx-h2 text-2xl">Clé API</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
            Authentifiez vos intégrations à l'API VoixIA.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={26} style={{ color: "var(--accent)" }} />
        </div>
      ) : error ? (
        <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="vx-card p-6">
            <label className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
              Votre clé secrète
            </label>
            <div className="flex items-center gap-2">
              <code
                className="vx-mono flex-1 overflow-x-auto rounded-[10px] px-4 py-3 text-sm"
                style={{ background: "var(--bg-alt)", color: "var(--text)" }}
              >
                {revealed ? apiKey : masked}
              </code>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="rounded-[10px] p-2.5"
                style={{ border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--muted)" }}
                title={revealed ? "Masquer" : "Afficher"}
              >
                {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button onClick={copy} className="vx-btn-primary px-4 py-2.5 text-sm">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
            <p className="mt-3 text-xs" style={{ color: "var(--muted-3)" }}>
              Gardez cette clé secrète. Ne la partagez pas publiquement.
            </p>
          </div>

          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--code-bg)",
              boxShadow: "var(--shadow-code)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: "var(--code-header)", borderBottom: "1px solid var(--border)" }}
            >
              <span style={dot} />
              <span style={dot} />
              <span style={dot} />
              <span className="vx-mono ml-2 text-xs" style={{ color: "var(--muted-3)" }}>
                exemple.sh
              </span>
            </div>
            <pre
              className="vx-mono overflow-x-auto px-5 py-4 text-xs"
              style={{ margin: 0, lineHeight: 1.9, color: "var(--code-text)" }}
            >
{`curl "${API_DOC_BASE}/api/v1/..." \\
  -H "X-VoixIA-Key: VOTRE_CLE" \\
  -H "X-VoixIA-Tenant: VOTRE_TENANT"`}
            </pre>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
