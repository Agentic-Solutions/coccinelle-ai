import { apiUrl, getToken, clearSession } from "./config";

type Json = Record<string, unknown>;

// Appel authentifié (JWT Bearer). Sur 401 → nettoie la session et renvoie vers /login.
// (Token 30 jours : pas de refresh auto nécessaire pour le périmètre J1-J2.)
export async function apiFetch<T = Json>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }
  return { ok: res.ok, status: res.status, data };
}
