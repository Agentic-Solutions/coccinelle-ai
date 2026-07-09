const CARDS = [
  { tag: "LLM", title: "Mistral hébergé en UE", desc: "Modèle de langage souverain, opéré en Europe. Vos prompts et conversations ne quittent jamais le continent." },
  { tag: "RGPD", title: "Conformité native", desc: "Consentement, rétention et droit à l'effacement gérés par défaut. Documentation prête pour vos audits." },
  { tag: "INFRA", title: "Latence française", desc: "Traitement vocal au plus près des utilisateurs FR — conversations fluides, sans blancs gênants." },
];

export function Sovereignty() {
  return (
    <section
      id="souverainete"
      className="px-7 py-24"
      style={{ background: "var(--bg-alt)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-13 max-w-[620px]">
          <div className="vx-eyebrow mb-3.5">Souveraineté</div>
          <h2 className="vx-h2 mb-4" style={{ fontSize: 40 }}>
            Vos données restent en Europe. Point.
          </h2>
          <p className="text-[16.5px]" style={{ lineHeight: 1.6, color: "var(--muted-2)" }}>
            Pas de transfert hors UE, pas de dépendance à un cloud américain. Un argument
            de conformité qui ferme des deals dans la santé, la finance et le secteur public.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.tag} className="vx-card p-7">
              <div className="vx-mono mb-4 text-[11.5px]" style={{ color: "var(--accent-text)", letterSpacing: "0.04em" }}>
                {c.tag}
              </div>
              <h3 className="mb-2.5 text-lg font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
                {c.title}
              </h3>
              <p className="text-[14px]" style={{ lineHeight: 1.6, color: "var(--muted-2)" }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
