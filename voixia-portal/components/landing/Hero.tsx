import Link from "next/link";

const RESELLER_MAILTO =
  "mailto:contact@voixia.io?subject=Devenir%20revendeur%20VoixIA&body=Bonjour%2C%20je%20souhaite%20devenir%20revendeur%20VoixIA.";

export function Hero() {
  return (
    <header
      className="mx-auto grid max-w-[1180px] items-center gap-14 px-7 py-20 lg:grid-cols-[1.04fr_0.96fr] lg:py-24"
    >
      <div>
        <div
          className="mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]"
          style={{ border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--muted)" }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ok)" }} />
          Hébergé en Europe · LLM Mistral souverain
        </div>

        <h1 className="vx-h1 mb-5" style={{ fontSize: 54, lineHeight: 1.05 }}>
          L'API d'agents vocaux IA,{" "}
          <span style={{ color: "var(--accent-text)" }}>souveraine et française</span>
        </h1>

        <p className="mb-8 max-w-[480px] text-[19px]" style={{ lineHeight: 1.55, color: "var(--muted-2)" }}>
          Déployez des agents qui répondent au téléphone, en SMS et par email. Voix
          françaises naturelles, latence FR, RGPD natif —{" "}
          <span style={{ color: "var(--text)", fontWeight: 600 }}>le prix affiché = le prix payé.</span>
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="vx-btn-primary px-6 py-3.5 text-[15px]">
            Créer un compte →
          </Link>
          <a href={RESELLER_MAILTO} className="vx-btn-secondary px-6 py-3.5 text-[15px]">
            Devenir revendeur
          </a>
        </div>
      </div>

      {/* Visuel : bloc de code illustratif */}
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--code-bg)",
          boxShadow: "var(--shadow-code)",
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "var(--code-header)", borderBottom: "1px solid var(--border)" }}
        >
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--border-2)" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--border-2)" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--border-2)" }} />
          <span className="vx-mono ml-2 text-xs" style={{ color: "var(--muted-3)" }}>
            creer-agent.sh
          </span>
        </div>
        <pre
          className="vx-mono overflow-x-auto px-5 py-5 text-[12.5px]"
          style={{ margin: 0, lineHeight: 1.9, color: "var(--code-text)", whiteSpace: "pre" }}
        >
{`# Un agent vocal en quelques lignes
curl https://api.voixia.io/v1/agents \\
  -H "Authorization: Bearer $VOIXIA_KEY" \\
  -d '{
    "voix": "fr-lea-naturelle",
    "llm": "mistral-large-eu",
    "canaux": ["voix","sms"]
  }'
→ agent prêt · numéro FR attribué`}
        </pre>
      </div>
    </header>
  );
}
