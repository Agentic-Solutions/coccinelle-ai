"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "#comment", label: "Comment ça marche" },
  { href: "#comparateur", label: "Comparateur" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#souverainete", label: "Souveraineté" },
];

export function LandingNav() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-7 py-3.5"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: "var(--nav-bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Link href="/">
        <Brand />
      </Link>

      <div className="hidden items-center gap-7 text-sm md:flex">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} style={{ color: "var(--muted)" }}>
            {l.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/login" className="hidden text-sm sm:inline" style={{ color: "var(--text)" }}>
          Se connecter
        </Link>
        <Link href="/signup" className="vx-btn-primary px-4 py-2 text-sm">
          Créer un compte
        </Link>
      </div>
    </nav>
  );
}
