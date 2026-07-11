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

// Upload multipart authentifié (FormData). On NE fixe PAS le Content-Type :
// le navigateur pose le boundary lui-même. Utilisé pour les pièces de conformité.
// Robuste : timeout (jamais de spinner infini) + ne rejette jamais (renvoie
// toujours { ok, status, data }, y compris sur erreur réseau/CORS/abandon).
export async function apiUpload<T = Json>(
  path: string,
  form: FormData
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });

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
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: { error: aborted ? "Délai dépassé, réessayez." : "Envoi impossible (réseau)." } as T,
    };
  } finally {
    clearTimeout(timer);
  }
}
