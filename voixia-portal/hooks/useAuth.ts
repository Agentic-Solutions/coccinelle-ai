"use client";

import { useEffect, useState } from "react";
import { STORAGE, clearSession } from "@/lib/config";

interface SessionUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}
interface SessionTenant {
  id?: string;
  name?: string;
  email?: string;
}

// Garde client-side : si pas de token → redirige vers /login.
// (Le static export n'exécute pas de middleware serveur : le hook est le vrai garde.)
export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenant, setTenant] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE.token);
    if (!token) {
      window.location.href = "/login";
      return;
    }
    try {
      setUser(JSON.parse(localStorage.getItem(STORAGE.user) || "null"));
      setTenant(JSON.parse(localStorage.getItem(STORAGE.tenant) || "null"));
    } catch {
      /* ignore parse errors */
    }
    setReady(true);
  }, []);

  const logout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return { user, tenant, ready, logout };
}
