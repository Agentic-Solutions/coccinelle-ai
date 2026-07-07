"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiUrl, setSession } from "@/lib/config";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company_name: company.trim(),
          email: email.trim(),
          password,
          cgu_accepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.token) {
        const msg = Array.isArray(data.errors)
          ? data.errors.join(" · ")
          : data.error || "Inscription impossible.";
        setError(msg);
        return;
      }
      setSession(data.token, data.user, data.tenant);
      window.location.href = "/agents";
    } catch {
      setError("Inscription impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const label = "mb-1 block text-sm font-medium";
  const labelStyle = { color: "var(--muted)" };

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "var(--bg)" }}>
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Brand size="lg" />
          </div>
          <div className="vx-card p-8">
            <h1 className="vx-h2 mb-1 text-lg">Créer un compte</h1>
            <p className="mb-6 text-sm" style={{ color: "var(--muted-2)" }}>
              Lancez votre premier agent vocal en quelques minutes.
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
                <label className={label} style={labelStyle}>Votre nom</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="vx-input" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className={label} style={labelStyle}>Société</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} className="vx-input" placeholder="Mon Entreprise" />
              </div>
              <div>
                <label className={label} style={labelStyle}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="vx-input" placeholder="vous@entreprise.fr" />
              </div>
              <div>
                <label className={label} style={labelStyle}>Mot de passe</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="vx-input" placeholder="8 caractères, 1 majuscule, 1 chiffre" />
              </div>
              <button type="submit" disabled={loading} className="vx-btn-primary w-full px-4 py-2.5 text-sm">
                {loading && <Loader2 className="animate-spin" size={16} />}
                Créer mon compte
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-2)" }}>
            Déjà inscrit ?{" "}
            <Link href="/login" style={{ color: "var(--accent-text)", fontWeight: 500 }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
