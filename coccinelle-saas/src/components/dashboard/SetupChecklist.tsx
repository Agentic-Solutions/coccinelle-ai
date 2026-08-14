'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { buildApiUrl } from '@/lib/config';

/**
 * Checklist de démarrage — 5 étapes (Chantier CX 1, 28/07/2026).
 *
 * États calculés côté serveur DEPUIS LA DB (GET /api/v1/onboarding/checklist).
 * Aucun état de progression en localStorage : le masquage lui-même est persisté
 * en base (`users.checklist_dismissed_at`), sinon la checklist réapparaît dès
 * qu'on change de navigateur.
 *
 * Rafraîchissement : au retour sur l'onglet (focus + visibilitychange). Un
 * utilisateur qui part vérifier son numéro puis revient voit l'étape cochée
 * sans avoir à recharger la page.
 */

interface Step {
  id: string;
  title: string;
  hint?: string;
  completed: boolean;
  href: string | null;
}

interface ChecklistData {
  steps: Step[];
  completed: number;
  total: number;
  progress_percent: number;
  setup_completed: boolean;
  dismissed: boolean;
}

// try/catch : un getItem peut lever (navigation privée stricte, stockage bloqué).
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/** Préférence d'affichage, par appareil. */
const CLE_REPLI = 'checklist_repliee';

export default function SetupChecklist() {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Repli persisté (14/08/2026). L'état existait déjà mais se perdait à chaque
   * navigation : le bloc se rouvrait en pleine hauteur en tête du tableau de
   * bord, à chaque visite. Et le bouton « masquer définitivement » n'apparaît
   * qu'aux 5 étapes faites — un compte à 4/5 restait donc coincé avec le bloc
   * ouvert, sans aucun moyen de le réduire durablement.
   *
   * localStorage et non la base : c'est une préférence d'AFFICHAGE, propre à
   * l'appareil. Le masquage définitif, lui, reste en base
   * (`users.checklist_dismissed_at`) — sinon il ne suivrait pas le client d'un
   * poste à l'autre, ce qui est tout l'inverse du besoin.
   */
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(localStorage.getItem(CLE_REPLI) !== '1');
  }, []);

  const basculerRepli = useCallback(() => {
    setExpanded((ouvert) => {
      const suivant = !ouvert;
      try {
        if (suivant) localStorage.removeItem(CLE_REPLI);
        else localStorage.setItem(CLE_REPLI, '1');
      } catch { /* navigation privée : le repli vaut pour la session */ }
      return suivant;
    });
  }, []);
  const [hidden, setHidden] = useState(false);

  const fetchChecklist = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/checklist'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.checklist) {
        setChecklist(data.checklist);
      }
    } catch {
      // Silencieux : la checklist est un accompagnement, pas une fonction
      // critique. Une panne réseau ne doit pas polluer le dashboard.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Rafraîchit au retour sur l'onglet — c'est ce qui coche l'étape « sans F5 ».
  useEffect(() => {
    const onFocus = () => fetchChecklist();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchChecklist();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchChecklist]);

  const handleDismiss = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setHidden(true); // masquage optimiste
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/checklist/dismiss'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) setHidden(false);
    } catch {
      setHidden(false);
    }
  }, []);

  if (loading || hidden || !checklist) return null;
  if (checklist.dismissed) return null;

  const { steps, completed, total, progress_percent, setup_completed } = checklist;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* En-tête + progression */}
      <div className={expanded ? 'p-4 border-b border-gray-100' : 'px-4 py-2.5'}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-sm">Bien démarrer</h2>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                {completed}/{total}
              </span>
            </div>
            {/* Repliée, la checklist tient sur UNE ligne : titre + compteur.
                Garder la phrase et la barre de progression aurait laissé un
                bloc de trois lignes en tête de page — le repli n'aurait rien
                rendu. */}
            {expanded && (
              <>
                <p className="text-xs text-gray-500 mt-0.5">
                  {setup_completed
                    ? 'Tout est prêt. Votre assistant est opérationnel.'
                    : 'Quelques minutes pour que votre assistant réponde comme vous le souhaitez.'}
                </p>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress_percent}%` }}
                    role="progressbar"
                    aria-valuenow={completed}
                    aria-valuemin={0}
                    aria-valuemax={total}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={basculerRepli}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              aria-label={expanded ? 'Réduire' : 'Développer'}
            >
              {expanded
                ? <ChevronUp className="w-4 h-4 text-gray-500" />
                : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {/* Masquage possible uniquement une fois les 5 étapes terminées */}
            {setup_completed && (
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                aria-label="Masquer définitivement"
                title="Masquer définitivement"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Étapes */}
      {expanded && (
        <ol className="p-4 space-y-1.5">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg ${
                step.completed ? 'bg-gray-50' : 'bg-white hover:bg-gray-50 transition-colors'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                  step.completed
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-300 text-gray-400'
                }`}
                aria-hidden="true"
              >
                {step.completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${step.completed ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
                  {step.title}
                </p>
                {step.hint && !step.completed && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.hint}</p>
                )}
              </div>
              {!step.completed && step.href && (
                <Link
                  href={step.href}
                  className="text-xs font-medium text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  Compléter
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
