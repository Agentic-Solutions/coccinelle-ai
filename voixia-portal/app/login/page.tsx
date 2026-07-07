"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiUrl, setSession } from "@/lib/config";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.token) {
        setError(data.error || "Identifiants incorrects.");
        return;
      }
      setSession(data.token, data.user, data.tenant);
      window.location.href = "/agents";
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-4" style={{ background: "var(--bg)" }}>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Brand size="lg" />
          </div>
          <div className="vx-card p-8">
            <h1 className="vx-h2 mb-1 text-lg">Connexion</h1>
            <p className="mb-6 text-sm" style={{ color: "var(--muted-2)" }}>
              Accédez à votre console d'agents vocaux.
            </p>

            {error && (
              <div
                className="mb-4 rounded-[10px] px-3 py-2 text-sm"
                style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="vx-input"
                  placeholder="vous@entreprise.fr"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="vx-input"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" disabled={loading} className="vx-btn-primary w-full px-4 py-2.5 text-sm">
                {loading && <Loader2 className="animate-spin" size={16} />}
                Se connecter
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-2)" }}>
            Pas encore de compte ?{" "}
            <Link href="/signup" style={{ color: "var(--accent-text)", fontWeight: 500 }}>
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
