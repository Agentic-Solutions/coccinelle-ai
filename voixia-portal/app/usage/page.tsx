"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Clock, PhoneCall, Euro } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { apiFetch } from "@/lib/api";

interface PerAgent {
  tenant_id: string;
  agent_name: string;
  calls: number;
  minutes: number;
}
interface DailyPoint {
  date: string;
  minutes: number;
}
interface Usage {
  period: { month: string; start: string; end: string };
  total: { calls: number; minutes: number; seconds: number; estimated_cost_eur: number };
  per_agent: PerAgent[];
  daily: DailyPoint[];
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function monthLabel(value: string) {
  const [y, m] = value.split("-");
  return `${MONTHS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// Liste des 6 derniers mois (valeurs YYYY-MM), courant en premier.
function recentMonths(): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < 6; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}

function fmtMinutes(min: number) {
  return min.toLocaleString("fr-FR");
}

export default function UsagePage() {
  const months = useMemo(() => recentMonths(), []);
  const [month, setMonth] = useState(months[0]);
  const [data, setData] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mo: string) => {
    setLoading(true);
    setError(null);
    const { ok, data } = await apiFetch<{ success: boolean } & Usage & { error?: string }>(
      `/api/v1/reseller/usage?month=${mo}`
    );
    if (ok && data.success) setData(data);
    else setError(data.error || "Chargement impossible.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.minutes)) : 1;

  return (
    <PortalShell active="/usage">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="vx-h2 text-2xl">Consommation</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
            Minutes d'appel de vos agents ce mois-ci.
          </p>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="vx-input" style={{ width: "auto" }}>
          {months.map((mo) => (
            <option key={mo} value={mo}>{monthLabel(mo)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={26} style={{ color: "var(--accent)" }} />
        </div>
      ) : error ? (
        <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
          {error}
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* 3 chiffres clés */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={<Clock size={18} />} label="Minutes consommées" value={fmtMinutes(data.total.minutes)} unit="min" />
            <StatCard icon={<PhoneCall size={18} />} label="Appels" value={data.total.calls.toLocaleString("fr-FR")} />
            <StatCard icon={<Euro size={18} />} label="Coût estimé" value={data.total.estimated_cost_eur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="€" hint="0,10 €/min" />
          </div>

          {data.total.calls === 0 ? (
            <div
              className="py-16 text-center"
              style={{ border: "1px dashed var(--border-2)", borderRadius: 20, background: "var(--surface)" }}
            >
              <Clock className="mx-auto mb-4" size={40} style={{ color: "var(--muted-3)" }} />
              <p className="font-medium" style={{ color: "var(--text)" }}>Aucun appel ce mois-ci</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
                La consommation apparaîtra dès les premiers appels de vos agents.
              </p>
            </div>
          ) : (
            <>
              {/* Graphe journalier */}
              <div className="vx-card p-6">
                <div className="mb-4 text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Minutes par jour
                </div>
                <div className="flex items-end gap-2" style={{ minHeight: 160 }}>
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2" title={`${d.date} — ${fmtMinutes(d.minutes)} min`}>
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 40,
                          height: `${Math.max((d.minutes / maxDaily) * 130, 4)}px`,
                          background: "var(--accent)",
                          borderRadius: "6px 6px 0 0",
                          transition: "height 0.25s",
                        }}
                      />
                      <span className="text-xs" style={{ color: "var(--muted-3)" }}>
                        {d.date.slice(8, 10)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Répartition par agent */}
              <div className="vx-card p-6">
                <div className="mb-4 text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Répartition par agent
                </div>
                <div className="space-y-3">
                  {data.per_agent.map((a) => (
                    <div key={a.tenant_id} className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: "var(--text)" }}>{a.agent_name}</span>
                      <span className="text-sm" style={{ color: "var(--muted-2)" }}>
                        <span className="vx-mono" style={{ color: "var(--text)" }}>{fmtMinutes(a.minutes)}</span> min
                        <span style={{ color: "var(--muted-3)" }}> · {a.calls} appel{a.calls > 1 ? "s" : ""}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="vx-card p-5">
      <div className="mb-3 flex items-center gap-2" style={{ color: "var(--muted-2)" }}>
        <span style={{ color: "var(--accent-text)" }}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span className="text-sm" style={{ color: "var(--muted-2)" }}>{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs" style={{ color: "var(--muted-3)" }}>{hint}</div>}
    </div>
  );
}
