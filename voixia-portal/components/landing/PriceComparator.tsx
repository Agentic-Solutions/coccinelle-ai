"use client";

import { useState } from "react";

type VariantKey = "eco" | "standard" | "premium";

interface Row {
  name: string;
  // valeur numérique pour la largeur de barre (concurrents = borne basse)
  value: number;
  label: string; // texte affiché (avec devise / fourchette)
  color: string; // couleur de la barre
  strong?: boolean;
}

const VARIANTS: Record<VariantKey, { label: string; rows: Row[] }> = {
  eco: {
    label: "Éco",
    rows: [
      { name: "VoixIA", value: 0.08, label: "0,08 €/min", color: "var(--accent)", strong: true },
      { name: "Retell", value: 0.11, label: "~0,11 $/min", color: "var(--bar-2)" },
      { name: "Vapi", value: 0.13, label: "~0,13 $/min", color: "var(--bar-3)" },
    ],
  },
  standard: {
    label: "Standard",
    rows: [
      { name: "VoixIA", value: 0.12, label: "0,12 €/min", color: "var(--accent)", strong: true },
      { name: "Retell", value: 0.15, label: "0,15–0,18 $/min", color: "var(--bar-2)" },
      { name: "Vapi", value: 0.18, label: "0,18–0,23 $/min", color: "var(--bar-3)" },
    ],
  },
  premium: {
    label: "Premium",
    rows: [
      { name: "VoixIA", value: 0.16, label: "0,16 €/min", color: "var(--accent)", strong: true },
      { name: "Retell", value: 0.22, label: "0,22–0,31 $/min", color: "var(--bar-2)" },
      { name: "Vapi", value: 0.25, label: "0,25–0,36 $/min", color: "var(--bar-3)" },
    ],
  },
};

const ORDER: VariantKey[] = ["eco", "standard", "premium"];

export function PriceComparator() {
  const [variant, setVariant] = useState<VariantKey>("standard");
  const rows = VARIANTS[variant].rows;
  const max = Math.max(...rows.map((r) => r.value));

  return (
    <section
      id="comparateur"
      className="px-7 py-24"
      style={{ background: "var(--bg-alt)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[900px]">
        <div className="mb-11 text-center">
          <div className="vx-eyebrow mb-3.5">Comparateur</div>
          <h2 className="vx-h2 mb-3" style={{ fontSize: 40 }}>
            Le prix affiché = le prix payé
          </h2>
          <p className="text-base" style={{ color: "var(--muted-2)" }}>
            Comparez, à qualité équivalente, le coût réel tout compris.
          </p>
        </div>

        {/* Sélecteur de variante (segmented control) */}
        <div
          className="mx-auto mb-9 flex w-full max-w-md rounded-[12px] p-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border-2)" }}
        >
          {ORDER.map((k) => {
            const active = k === variant;
            return (
              <button
                key={k}
                onClick={() => setVariant(k)}
                className="flex-1 rounded-[9px] py-2 text-sm font-medium transition"
                style={
                  active
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "transparent", color: "var(--muted)" }
                }
              >
                {VARIANTS[k].label}
              </button>
            );
          })}
        </div>

        {/* Barres */}
        <div className="vx-card p-8" style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.05)" }}>
          <div className="flex flex-col gap-5">
            {rows.map((r) => (
              <div key={r.name}>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-[15.5px] font-semibold"
                    style={{ color: r.strong ? "var(--text)" : "var(--muted-2)" }}
                  >
                    {r.name}
                  </span>
                  <span
                    className="text-[17px] font-bold"
                    style={{ color: r.strong ? "var(--accent-text)" : "var(--muted-2)", letterSpacing: "-0.01em" }}
                  >
                    {r.label}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--track)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(r.value / max) * 100}%`,
                      background: r.color,
                      borderRadius: 999,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t pt-6 text-[14.5px]" style={{ borderColor: "var(--border)", color: "var(--muted-2)", lineHeight: 1.6 }}>
            Les prix « à partir de » affichés par <span style={{ color: "var(--text)", fontWeight: 600 }}>Retell (0,07 $)</span> et{" "}
            <span style={{ color: "var(--text)", fontWeight: 600 }}>Vapi (0,05 $)</span> excluent le LLM, la voix et la téléphonie —
            facturés en supplément. Chez <span style={{ color: "var(--accent-text)", fontWeight: 600 }}>VoixIA</span>, le prix affiché est{" "}
            <span style={{ color: "var(--text)", fontWeight: 600 }}>tout compris</span>.
          </div>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--muted-3)" }}>
          Tarifs illustratifs à titre de comparaison. Barres concurrents sur la borne basse des fourchettes publiques.
        </p>
      </div>
    </section>
  );
}
