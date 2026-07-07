"use client";

import Link from "next/link";
import { Bot, KeyRound, LogOut, Loader2 } from "lucide-react";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/settings/api-key", label: "Clé API", icon: KeyRound },
];

// Coquille authentifiée : sidebar VoixIA + zone de contenu.
export function PortalShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { tenant, ready, logout } = useAuth();

  if (!ready) {
    return (
      <div
        style={{ minHeight: "100vh", background: "var(--bg)" }}
        className="flex items-center justify-center"
      >
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <aside
        className="flex w-60 flex-col"
        style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Brand />
          <ThemeToggle />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition"
                style={
                  isActive
                    ? { background: "var(--accent-soft)", color: "var(--accent-text)" }
                    : { color: "var(--muted)" }
                }
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mb-2 px-2 text-xs" style={{ color: "var(--muted-3)" }}>
            {tenant?.name || "Mon compte"}
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition"
            style={{ color: "var(--muted)" }}
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
