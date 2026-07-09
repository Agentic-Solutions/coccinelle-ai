import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/Brand";
import { LandingFooter } from "@/components/landing/LandingFooter";

// Coquille minimale pour les pages légales (mentions, RGPD).
export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-[760px] px-7 py-14">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 text-sm"
          style={{ color: "var(--muted-2)" }}
        >
          <ArrowLeft size={16} />
          Retour à l'accueil
        </Link>

        <h1 className="vx-h1 mb-8 mt-6" style={{ fontSize: 34 }}>
          {title}
        </h1>

        <div
          className="flex flex-col gap-5 text-[15px]"
          style={{ color: "var(--muted-2)", lineHeight: 1.7 }}
        >
          {children}
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}
