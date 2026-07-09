const STEPS = [
  {
    n: "1",
    title: "Créez un agent",
    desc: "Choisissez une voix française, un secteur et un comportement. Modèle Mistral souverain par défaut. Prêt en une minute.",
  },
  {
    n: "2",
    title: "Attribuez un numéro",
    desc: "Achetez un numéro français depuis le portail ou attribuez-en un de votre pool. Voix et SMS activés instantanément.",
  },
  {
    n: "3",
    title: "Il répond 24/7",
    desc: "Votre agent décroche, qualifie, prend les rendez-vous et transmet. Suivez chaque appel et la consommation en temps réel.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment" className="mx-auto max-w-[1120px] px-7 py-24">
      <div className="mb-14 text-center">
        <div className="vx-eyebrow mb-3.5">Comment ça marche</div>
        <h2 className="vx-h2" style={{ fontSize: 40 }}>
          De zéro à la production en 3 étapes
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="vx-card p-8">
            <div
              className="mb-5 flex h-8 w-8 items-center justify-center rounded-[9px] text-sm font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
            >
              {s.n}
            </div>
            <h3 className="mb-2.5 text-xl font-semibold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>
              {s.title}
            </h3>
            <p className="text-[14.5px]" style={{ lineHeight: 1.6, color: "var(--muted-2)" }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
