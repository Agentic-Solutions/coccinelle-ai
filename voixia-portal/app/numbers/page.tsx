"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, Plus, Loader2, Bot, CircleDot } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { BuyNumberModal } from "@/components/BuyNumberModal";
import { apiFetch } from "@/lib/api";

interface PoolNumber {
  phone_number: string;
  label?: string | null;
  country?: string | null;
  agent_name?: string | null;
}

export default function NumbersPage() {
  const [available, setAvailable] = useState<PoolNumber[]>([]);
  const [assigned, setAssigned] = useState<PoolNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);

  const load = useCallback(async () => {
    const { ok, data } = await apiFetch<{ success: boolean; available: PoolNumber[]; assigned: PoolNumber[]; error?: string }>(
      "/api/v1/reseller/numbers"
    );
    if (ok && data.success) {
      setAvailable(data.available || []);
      setAssigned(data.assigned || []);
    } else setError(data.error || "Chargement impossible.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PortalShell active="/numbers">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vx-h2 text-2xl">Numéros</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
            Votre pool de numéros et leur affectation.
          </p>
        </div>
        <button onClick={() => setShowBuy(true)} className="vx-btn-primary px-4 py-2.5 text-sm">
          <Plus size={18} />
          Acheter un numéro
        </button>
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
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
              <CircleDot size={15} style={{ color: "var(--ok)" }} />
              Disponibles ({available.length})
            </div>
            {available.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted-3)" }}>Aucun numéro disponible. Achetez-en un.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {available.map((n) => (
                  <div key={n.phone_number} className="vx-card flex items-center gap-3 p-4">
                    <Phone size={16} style={{ color: "var(--muted-3)" }} />
                    <span className="vx-mono text-sm" style={{ color: "var(--text)" }}>{n.phone_number}</span>
                    {n.label && <span className="text-xs" style={{ color: "var(--muted-3)" }}>{n.label}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
              <Bot size={15} style={{ color: "var(--accent-text)" }} />
              Attribués ({assigned.length})
            </div>
            {assigned.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted-3)" }}>Aucun numéro attribué à un agent.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {assigned.map((n) => (
                  <div key={n.phone_number} className="vx-card flex items-center justify-between p-4">
                    <span className="flex items-center gap-3">
                      <Phone size={16} style={{ color: "var(--muted-3)" }} />
                      <span className="vx-mono text-sm" style={{ color: "var(--text)" }}>{n.phone_number}</span>
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-2)" }}>{n.agent_name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showBuy && (
        <BuyNumberModal
          onClose={() => setShowBuy(false)}
          onPurchased={() => {
            setShowBuy(false);
            load();
          }}
        />
      )}
    </PortalShell>
  );
}
