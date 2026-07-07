"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Phone, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PoolNumber {
  phone_number: string;
  label?: string;
  country?: string;
}

// Modale d'attribution d'un numéro du pool à un agent.
export function NumberModal({
  agentId,
  agentName,
  onClose,
  onAssigned,
}: {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [numbers, setNumbers] = useState<PoolNumber[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiFetch<{ success: boolean; available: PoolNumber[]; error?: string }>(
        "/api/v1/reseller/numbers"
      );
      if (ok && data.success) {
        setNumbers(data.available || []);
        setSelected(data.available?.[0]?.phone_number || null);
      } else {
        setError(data.error || "Chargement impossible.");
      }
      setLoading(false);
    })();
  }, []);

  async function assign() {
    if (!selected) return;
    setAssigning(true);
    setError(null);
    const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
      `/api/v1/reseller/agents/${encodeURIComponent(agentId)}/number`,
      { method: "POST", body: JSON.stringify({ phone_number: selected }) }
    );
    if (ok && data.success) {
      onAssigned();
    } else {
      setError(data.error || "Attribution impossible.");
      setAssigning(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="vx-card w-full max-w-md p-6"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between">
          <h2 className="vx-h2 text-lg">Attribuer un numéro</h2>
          <button onClick={onClose} style={{ color: "var(--muted-3)" }} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 text-sm" style={{ color: "var(--muted-2)" }}>
          Choisissez un numéro pour <span style={{ color: "var(--text)", fontWeight: 600 }}>{agentName}</span>.
        </p>

        {error && (
          <div className="mb-4 rounded-[10px] px-3 py-2 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" size={24} style={{ color: "var(--accent)" }} />
          </div>
        ) : numbers.length === 0 ? (
          <div
            className="rounded-[10px] px-4 py-6 text-center text-sm"
            style={{ background: "var(--bg-alt)", color: "var(--muted-2)" }}
          >
            Aucun numéro disponible dans le pool.
            <br />
            Contactez l'administrateur.
          </div>
        ) : (
          <div className="mb-5 space-y-2">
            {numbers.map((n) => {
              const isSel = selected === n.phone_number;
              return (
                <button
                  key={n.phone_number}
                  onClick={() => setSelected(n.phone_number)}
                  className="flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left transition"
                  style={{
                    border: isSel ? "1.5px solid var(--accent)" : "1px solid var(--border-2)",
                    background: isSel ? "var(--accent-soft)" : "var(--surface)",
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Phone size={16} style={{ color: isSel ? "var(--accent-text)" : "var(--muted-3)" }} />
                    <span className="vx-mono text-sm" style={{ color: "var(--text)" }}>{n.phone_number}</span>
                    {n.label && <span className="text-xs" style={{ color: "var(--muted-3)" }}>{n.label}</span>}
                  </span>
                  {isSel && <Check size={16} style={{ color: "var(--accent-text)" }} />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="vx-btn-secondary px-4 py-2.5 text-sm">
            Annuler
          </button>
          <button
            onClick={assign}
            disabled={assigning || !selected || numbers.length === 0}
            className="vx-btn-primary px-5 py-2.5 text-sm"
          >
            {assigning && <Loader2 className="animate-spin" size={16} />}
            Attribuer
          </button>
        </div>
      </div>
    </div>
  );
}
