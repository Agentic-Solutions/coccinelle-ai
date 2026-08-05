'use client';

import { useCallback, useEffect, useState } from 'react';
import { buildApiUrl } from '@/lib/config';
import type { UiMode } from '@/lib/navigation';

/**
 * Préférence d'affichage sidebar (Chantier CX 1, migration 0083).
 *
 * SOURCE DE VÉRITÉ = la DB (`users.ui_mode`, lu via /auth/me).
 * localStorage ne sert QUE d'indice anti-clignotement au premier rendu : sans
 * lui, un utilisateur en mode Avancé verrait la sidebar simplifiée pendant
 * l'aller-retour réseau. Il est réécrit à chaque réponse de /auth/me et purgé
 * à la déconnexion.
 */

const CACHE_KEY = 'ui_mode_hint';

// L'ACCÈS au stockage peut lever, pas seulement l'écriture : en navigation
// privée stricte ou avec le stockage du site bloqué, un simple getItem jette
// une SecurityError. Non protégée, l'exception remontait depuis l'effet et
// cassait le hook — donc la sidebar.
function readHint(): UiMode {
  if (typeof window === 'undefined') return 'simple';
  try {
    return window.localStorage.getItem(CACHE_KEY) === 'advanced' ? 'advanced' : 'simple';
  } catch {
    return 'simple';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export function useUiMode() {
  const [mode, setModeState] = useState<UiMode>('simple');
  const [loading, setLoading] = useState(true);

  // Le hint n'est lu qu'après le montage : le rendu serveur et le premier rendu
  // client doivent produire le même HTML (sinon erreur d'hydratation Next).
  useEffect(() => {
    setModeState(readHint());
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch(buildApiUrl('/api/v1/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const serverMode: UiMode = data?.user?.ui_mode === 'advanced' ? 'advanced' : 'simple';
        setModeState(serverMode);
        try {
          localStorage.setItem(CACHE_KEY, serverMode);
        } catch { /* quota / mode privé : le hint est optionnel */ }
      })
      .catch(() => { /* on garde le hint local */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const setMode = useCallback(async (next: UiMode) => {
    const previous = mode;
    // Bascule optimiste : le toggle doit être instantané.
    setModeState(next);
    try {
      localStorage.setItem(CACHE_KEY, next);
    } catch { /* hint optionnel */ }

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(buildApiUrl('/api/v1/settings/ui-mode'), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ui_mode: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Échec de persistance : on revient en arrière plutôt que de laisser
      // croire que le choix est enregistré (il ne survivrait pas au logout).
      setModeState(previous);
      try {
        localStorage.setItem(CACHE_KEY, previous);
      } catch { /* hint optionnel */ }
    }
  }, [mode]);

  const toggle = useCallback(() => {
    setMode(mode === 'simple' ? 'advanced' : 'simple');
  }, [mode, setMode]);

  return { mode, setMode, toggle, loading };
}

/** À appeler à la déconnexion : le hint ne doit pas fuiter d'un compte à l'autre. */
export function clearUiModeHint(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}
