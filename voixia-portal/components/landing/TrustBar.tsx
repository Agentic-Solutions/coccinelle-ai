const ITEMS = ["Hébergé en Europe", "LLM Mistral souverain", "RGPD natif", "Latence française"];

export function TrustBar() {
  return (
    <section
      className="px-7 py-8"
      style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-alt)" }}
    >
      <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {ITEMS.map((it) => (
          <span
            key={it}
            className="text-[15px] font-semibold"
            style={{ color: "var(--muted-2)", letterSpacing: "-0.01em" }}
          >
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}
