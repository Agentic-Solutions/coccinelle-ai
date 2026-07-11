import { ShieldCheck, ShieldAlert, Clock, ShieldX } from "lucide-react";

export interface AgentCompliance {
  tenant_id: string;
  name: string;
  company_name?: string | null;
  siret?: string | null;
  insee_status?: string | null;
  legal_name?: string | null;
  bundle_status?: string | null;
  kyc_status?: string | null;
  rejection_reason?: string | null;
  phone_number?: string | null;
}

// Badge de statut du dossier de conformité (source = bundle_status).
export function ComplianceBadge({ status }: { status?: string | null }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: typeof ShieldCheck }> = {
    approved: { label: "Approuvé", color: "var(--ok)", bg: "rgba(22,163,74,0.10)", Icon: ShieldCheck },
    "pending-review": { label: "En revue", color: "#b45309", bg: "rgba(217,119,6,0.10)", Icon: Clock },
    rejected: { label: "Refusé", color: "#dc2626", bg: "rgba(220,38,38,0.10)", Icon: ShieldX },
  };
  const s = map[status || ""] || { label: "À compléter", color: "var(--muted-2)", bg: "var(--accent-soft)", Icon: ShieldAlert };
  const { label, color, bg, Icon } = s;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ color, background: bg }}>
      <Icon size={13} />
      {label}
    </span>
  );
}
