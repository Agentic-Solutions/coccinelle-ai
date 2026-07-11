"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Bot } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { ComplianceModal } from "@/components/ComplianceModal";
import { ComplianceBadge, type AgentCompliance } from "@/components/ComplianceBadge";
import { apiFetch } from "@/lib/api";

export default function CompliancePage() {
  const [agents, setAgents] = useState<AgentCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AgentCompliance | null>(null);

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch<{ success: boolean; agents: AgentCompliance[]; error?: string }>(
      "/api/v1/compliance/agents"
    );
    if (ok && data.success) setAgents(data.agents || []);
    else setError(data.error || "Chargement impossible.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PortalShell active="/compliance">
      <div className="mb-8">
        <h1 className="vx-h2 text-2xl">Conformité</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
          Chaque numéro géographique est rattaché à l'identité de son bénéficiaire (SIRET, adresse,
          pièce d'identité du dirigeant). Un dossier doit être <strong>approuvé</strong> avant d'attribuer un numéro.
        </p>
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
        <p className="text-sm" style={{ color: "var(--muted-3)" }}>
          Aucun agent. Créez d'abord un agent, puis complétez son dossier de conformité ici.
        </p>
      ) : (
        <div className="grid gap-2">
          {agents.map((a) => (
            <button
              key={a.tenant_id}
              onClick={() => setSelected(a)}
              className="vx-card flex items-center justify-between p-4 text-left transition hover:opacity-90"
            >
              <span className="flex items-center gap-3">
                <Bot size={16} style={{ color: "var(--muted-3)" }} />
                <span>
                  <span className="block text-sm font-medium" style={{ color: "var(--text)" }}>
                    {a.company_name || a.name}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--muted-3)" }}>
                    {a.siret ? `SIRET ${a.siret}` : "SIRET non renseigné"}
                    {a.phone_number ? ` · ${a.phone_number}` : ""}
                  </span>
                </span>
              </span>
              <ComplianceBadge status={a.bundle_status} />
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ComplianceModal
          agent={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
          }}
        />
      )}
    </PortalShell>
  );
}
