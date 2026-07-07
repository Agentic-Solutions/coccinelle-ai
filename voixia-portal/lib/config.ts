// Configuration API du portail VoixIA.
// Le portail est un CLIENT du backend Workers partagé (coccinelle-api).
// Clés localStorage préfixées "vx_" pour une isolation totale.

// URL réelle du backend (appels réseau). Fixée via NEXT_PUBLIC_API_URL au build.
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://coccinelle-api.youssef-amrouche.workers.dev"
).replace(/\/$/, "");

// URL affichée dans la documentation/exemples (brandée VoixIA, jamais l'hôte interne).
export const API_DOC_BASE = (
  process.env.NEXT_PUBLIC_API_DOC_URL || "https://api.voixia.io"
).replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export const STORAGE = {
  token: "vx_token",
  user: "vx_user",
  tenant: "vx_tenant",
} as const;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE.token);
}

export function setSession(token: string, user: unknown, tenant: unknown): void {
  localStorage.setItem(STORAGE.token, token);
  localStorage.setItem(STORAGE.user, JSON.stringify(user ?? null));
  localStorage.setItem(STORAGE.tenant, JSON.stringify(tenant ?? null));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE.token);
  localStorage.removeItem(STORAGE.user);
  localStorage.removeItem(STORAGE.tenant);
}
