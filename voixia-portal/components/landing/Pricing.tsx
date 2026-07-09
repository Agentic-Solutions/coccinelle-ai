import Link from "next/link";
import { Check } from "lucide-react";

const PLANS = [
  { key: "eco", name: "Éco", price: "0,08 €", tagline: "Gros volumes, l'essentiel.", desc: "Mistral souverain, voix française standard.", highlight: false },
  { key: "standard", name: "Standard", price: "0,12 €", tagline: "Le meilleur rapport qualité/prix.", desc: "Modèle avancé, voix premium naturelle.", highlight: true },
  { key: "premium", name: "Premium", price: "0,16 €", tagline: "Qualité maximale, priorité.", desc: "Modèle premium, voix la plus naturelle.", highlight: false },
];

const INCLUDED = ["LLM souverain inclus", "Voix française naturelle", "Voix + SMS", "Facturation à la seconde"];

export function Pricing() {
  return (
    <section id="tarifs" className="mx-auto max-w-[1120px] px-7 py-24">
      <div className="mb-13 text-center">
        <div className="vx-eyebrow mb-3.5">Tarifs</div>
        <h2 className="vx-h2" style={{ fontSize: 40 }}>
          Un prix, tout compris. Pas de surprise.
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className="rounded-[20px] p-8"
            style={
              p.highlight
                ? { border: "1.5px solid var(--accent)", background: "var(--surface)", boxShadow: "0 10px 30px rgba(79,70,229,0.10)" }
                : { border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }
            }
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>{p.name}</span>
              {p.highlight && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
                >
                  Recommandé
                </span>
              )}
            </div>
            <p className="mb-4 text-[13.5px]" style={{ color: "var(--muted-3)" }}>{p.tagline}</p>
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="text-[42px] font-bold" style={{ color: "var(--text)", letterSpacing: "-0.03em" }}>{p.price}</span>
              <span className="text-[15px]" style={{ color: "var(--muted-2)" }}>/ min</span>
            </div>
            <p className="mb-6 text-[14px]" style={{ color: "var(--muted-2)" }}>Tout compris — {p.desc}</p>
            <div className="mb-7 flex flex-col gap-2.5">
              {INCLUDED.map((i) => (
                <div key={i} className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--muted)" }}>
                  <Check size={15} style={{ color: "var(--accent-text)" }} />
                  {i}
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className={p.highlight ? "vx-btn-primary w-full px-4 py-3 text-sm" : "vx-btn-secondary w-full px-4 py-3 text-sm"}
            >
              Créer un compte
            </Link>
          </div>
        ))}
      </div>

      {/* Numéro dédié + Business */}
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.4fr]">
        <div className="vx-card flex items-center justify-between p-6">
          <div>
            <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Numéro dédié</div>
            <div className="text-[13.5px]" style={{ color: "var(--muted-2)" }}>Un numéro français par agent</div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>5 €</span>
            <span className="text-[13px]" style={{ color: "var(--muted-2)" }}>/ mois</span>
          </div>
        </div>

        <div className="vx-card flex flex-col justify-between p-6" style={{ background: "var(--bg-alt)" }}>
          <div>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>Business</span>
              <span className="text-[15px]" style={{ color: "var(--muted-2)" }}>— sur devis</span>
            </div>
            <p className="text-[14px]" style={{ color: "var(--muted-2)", lineHeight: 1.55 }}>
              Tarif dégressif au volume, portail en marque blanche, support dédié.
            </p>
          </div>
          <a
            href="mailto:contact@voixia.io?subject=Offre%20Business%20VoixIA"
            className="vx-btn-secondary mt-4 self-start px-5 py-2.5 text-sm"
          >
            Contacter l'équipe
          </a>
        </div>
      </div>
    </section>
  );
}
