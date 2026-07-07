"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Plus, Phone, Loader2, Mic } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { apiFetch } from "@/lib/api";
import { VOICE_OPTIONS } from "@/lib/voices";
import { SECTORS } from "@/lib/sectors";

interface Agent {
  id: string;
  name: string;
  company_name?: string;
  sector?: string;
  status?: string;
  voice_id?: string;
  llm_provider?: string;
  phone_number?: string | null;
  created_at?: string;
}

function voiceLabel(id?: string) {
  return VOICE_OPTIONS.find((v) => v.id === id)?.label || "Voix par défaut";
}
function sectorLabel(key?: string) {
  return SECTORS.find((s) => s.key === key)?.label || key || "Général";
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch<{ success: boolean; agents: Agent[]; error?: string }>(
        "/api/v1/reseller/agents"
      );
      if (ok && data.success) setAgents(data.agents || []);
      else setError(data.error || "Chargement impossible.");
      setLoading(false);
    })();
  }, []);

  return (
    <PortalShell active="/agents">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vx-h2 text-2xl">Mes agents</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
            Vos agents vocaux IA et leur configuration.
          </p>
        </div>
        <Link href="/agents/new" className="vx-btn-primary px-4 py-2.5 text-sm">
          <Plus size={18} />
          Nouvel agent
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={26} style={{ color: "var(--accent)" }} />
        </div>
      ) : error ? (
        <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
          {error}
        </div>
      ) : agents.length === 0 ? (
        <div
          className="py-16 text-center"
          style={{ border: "1px dashed var(--border-2)", borderRadius: 20, background: "var(--surface)" }}
        >
          <Bot className="mx-auto mb-4" size={40} style={{ color: "var(--muted-3)" }} />
          <p className="mb-1 font-medium" style={{ color: "var(--text)" }}>Aucun agent pour l'instant</p>
          <p className="mb-6 text-sm" style={{ color: "var(--muted-2)" }}>
            Créez votre premier agent vocal en une minute.
          </p>
          <Link href="/agents/new" className="vx-btn-primary px-4 py-2.5 text-sm">
            <Plus size={18} />
            Créer un agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((a) => (
            <div key={a.id} className="vx-card p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center rounded-[9px] p-2"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                  >
                    <Bot size={20} />
                  </span>
                  <div>
                    <div className="font-semibold" style={{ color: "var(--text)" }}>{a.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted-2)" }}>{sectorLabel(a.sector)}</div>
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
                >
                  {a.status === "active" ? "Actif" : a.status || "Actif"}
                </span>
              </div>
              <div className="space-y-1.5 text-sm" style={{ color: "var(--muted)" }}>
                <div className="flex items-center gap-2">
                  <Mic size={14} style={{ color: "var(--muted-3)" }} />
                  {voiceLabel(a.voice_id)}
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} style={{ color: "var(--muted-3)" }} />
                  {a.phone_number || "Aucun numéro attribué"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
