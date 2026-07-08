"use client";

import { useState } from "react";
import { X, Loader2, Search, Phone, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Found {
  phone_number: string;
  locality?: string | null;
  region?: string | null;
  monthly_price?: number | null;
  currency?: string;
}

function priceLabel(n: Found) {
  if (n.monthly_price == null) return "";
  return `${n.monthly_price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${n.currency || ""}/mois`;
}

// Modale d'achat self-service : recherche → achat (admin only) → pool.
export function BuyNumberModal({
  onClose,
  onPurchased,
}: {
  onClose: () => void;
  onPurchased: () => void;
}) {
  const [contains, setContains] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    setSearching(true);
    setError(null);
    setSearched(true);
    const q = new URLSearchParams({ country: "FR", limit: "10" });
    if (contains.trim()) q.set("contains", contains.trim());
    const { ok, status, data } = await apiFetch<{ success: boolean; available: Found[]; error?: string }>(
      `/api/v1/reseller/numbers/search?${q.toString()}`
    );
    if (ok && data.success) setResults(data.available || []);
    else {
      setResults([]);
      setError(status === 403 ? "Achat réservé à l'administrateur." : data.error || "Recherche impossible.");
    }
    setSearching(false);
  }

  async function buy(n: Found) {
    const label = priceLabel(n);
    if (!confirm(`Acheter ${n.phone_number}${label ? ` (${label})` : ""} ?\nCet achat est facturé sur votre compte.`)) return;
    setBuying(n.phone_number);
    setError(null);
    const { ok, data } = await apiFetch<{ success: boolean; error?: string }>(
      "/api/v1/reseller/numbers/purchase",
      { method: "POST", body: JSON.stringify({ phone_number: n.phone_number }) }
    );
    if (ok && data.success) {
      onPurchased();
    } else {
      setError(data.error || "Achat impossible.");
      setBuying(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div className="vx-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <h2 className="vx-h2 text-lg">Acheter un numéro</h2>
          <button onClick={onClose} style={{ color: "var(--muted-3)" }} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <p className="mb-5 text-sm" style={{ color: "var(--muted-2)" }}>
          Numéros français (voix). L'achat est facturé sur votre compte et le numéro est configuré automatiquement.
        </p>

        <div className="mb-4 flex gap-2">
          <input
            value={contains}
            onChange={(e) => setContains(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="vx-input"
            placeholder="Chiffres à contenir (ex. 162) — optionnel"
          />
          <button onClick={search} disabled={searching} className="vx-btn-primary px-4 py-2.5 text-sm">
            {searching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Rechercher
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-[10px] px-3 py-2 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
            {error}
          </div>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {searched && !searching && results.length === 0 && !error && (
            <div className="rounded-[10px] px-4 py-6 text-center text-sm" style={{ background: "var(--bg-alt)", color: "var(--muted-2)" }}>
              Aucun numéro trouvé pour ce critère.
            </div>
          )}
          {results.map((n) => (
            <div
              key={n.phone_number}
              className="flex items-center justify-between rounded-[10px] px-4 py-3"
              style={{ border: "1px solid var(--border-2)" }}
            >
              <div className="flex items-center gap-3">
                <Phone size={16} style={{ color: "var(--muted-3)" }} />
                <div>
                  <div className="vx-mono text-sm" style={{ color: "var(--text)" }}>{n.phone_number}</div>
                  <div className="text-xs" style={{ color: "var(--muted-3)" }}>
                    {[n.locality, priceLabel(n)].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => buy(n)}
                disabled={buying !== null}
                className="vx-btn-secondary px-3 py-1.5 text-xs"
              >
                {buying === n.phone_number ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
                Acheter
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
