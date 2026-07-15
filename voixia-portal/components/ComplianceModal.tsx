"use client";

import { X } from "lucide-react";
import { ComplianceForm } from "@/components/ComplianceForm";
import type { AgentCompliance } from "@/components/ComplianceBadge";

// Modale du dossier de conformité d'un agent (vue depuis la page /compliance).
// Coquille modale fine autour de <ComplianceForm> (corps réutilisable).
export function ComplianceModal({
  agent,
  onClose,
  onChanged,
}: {
  agent: AgentCompliance;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div className="vx-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <h2 className="vx-h2 text-lg">Dossier de conformité</h2>
          <button onClick={onClose} style={{ color: "var(--muted-3)" }} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <ComplianceForm
          agentId={agent.tenant_id}
          displayName={agent.company_name || agent.name}
          onChanged={onChanged}
        />
      </div>
    </div>
  );
}
