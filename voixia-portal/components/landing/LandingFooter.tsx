import { Brand } from "@/components/Brand";

export function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)" }} className="px-7 py-11">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Brand size="sm" />
          <span className="vx-mono text-xs" style={{ color: "var(--muted-3)" }}>
            api.voixia.io
          </span>
        </div>
        <div className="flex gap-6 text-sm">
          <a href="/mentions-legales" style={{ color: "var(--muted-2)" }}>Mentions légales</a>
          <a href="/rgpd" style={{ color: "var(--muted-2)" }}>RGPD</a>
          <a href="mailto:contact@voixia.io" style={{ color: "var(--muted-2)" }}>Contact</a>
        </div>
        <span className="text-[13px]" style={{ color: "var(--muted-3)" }}>
          © 2026 VoixIA — Agentic Solutions · Hébergé en Europe
        </span>
      </div>
    </footer>
  );
}
