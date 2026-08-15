'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { buildApiUrl } from '@/lib/config';

/**
 * Étapes de démarrage — données et liste, partagées (chantier CHECKLIST, 15/08/2026).
 *
 * Extrait de `SetupChecklist` pour que DEUX surfaces montrent la même liste sans
 * la dupliquer :
 *   — la carte pas-à-pas de « Mon activité » (une étape à la fois, dépliable) ;
 *   — le bloc d'Aide, qui reste le seul endroit où retrouver l'ensemble quand la
 *     carte a été masquée définitivement. C'est ce que promet la confirmation :
 *     la promesse et l'endroit sont livrés ensemble, jamais l'une sans l'autre.
 *
 * Le serveur continue de calculer les étapes après masquage (`dismissed` ne
 * gouverne que l'affichage de la carte) — c'est ce qui rend le bloc d'Aide
 * possible sans une seule ligne de logique nouvelle.
 */

export interface EtapeDemarrage {
  id: string;
  title: string;
  /** Une ligne, pour la liste dépliée. */
  hint?: string;
  /** Deux ou trois lignes, pour la carte pas-à-pas. Absent = ancien backend. */
  explication?: string;
  completed: boolean;
  href: string | null;
}

export interface DonneesChecklist {
  steps: EtapeDemarrage[];
  completed: number;
  total: number;
  progress_percent: number;
  setup_completed: boolean;
  dismissed: boolean;
}

// try/catch : un getItem peut lever (navigation privée stricte, stockage bloqué).
function lireJeton(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * Rang (1-based) de l'étape à faire maintenant : la première non faite dans
 * l'ordre du serveur. Vaut `null` quand tout est fait — la carte n'a alors plus
 * d'étape courante à mettre en avant.
 */
export function rangEtapeCourante(steps: EtapeDemarrage[]): number | null {
  const i = steps.findIndex((s) => !s.completed);
  return i === -1 ? null : i + 1;
}

/**
 * Charge les étapes et les recharge au retour sur l'onglet (focus +
 * visibilitychange) : c'est ce qui coche l'étape « sans F5 » quand on part
 * vérifier son numéro puis qu'on revient.
 */
export function useEtapesDemarrage() {
  const [checklist, setChecklist] = useState<DonneesChecklist | null>(null);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    const jeton = lireJeton();
    if (!jeton) {
      setChargement(false);
      return;
    }
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/checklist'), {
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.checklist) setChecklist(data.checklist);
    } catch {
      // Silencieux : l'accompagnement n'est pas une fonction critique. Une panne
      // réseau ne doit pas polluer le tableau de bord.
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    recharger();
  }, [recharger]);

  useEffect(() => {
    const auFocus = () => recharger();
    const auRetour = () => {
      if (document.visibilityState === 'visible') recharger();
    };
    window.addEventListener('focus', auFocus);
    document.addEventListener('visibilitychange', auRetour);
    return () => {
      window.removeEventListener('focus', auFocus);
      document.removeEventListener('visibilitychange', auRetour);
    };
  }, [recharger]);

  return { checklist, chargement, recharger };
}

/**
 * Les cinq étapes, en clair.
 *
 * Toute étape non faite est un LIEN vers sa page — c'est ce qui rend l'ordre
 * libre possible : un artisan bloqué sur l'étape du moment doit pouvoir en faire
 * une autre. La maquette libellait ces lignes « Plus tard » ; un lien qui
 * navigue ne peut pas dire « plus tard », d'où « Le faire ».
 */
export function ListeEtapes({ steps }: { steps: EtapeDemarrage[] }) {
  const rangCourant = rangEtapeCourante(steps);

  return (
    <ol className="border border-[#ebebe7] rounded-xl overflow-hidden">
      {steps.map((step, index) => {
        const courante = index + 1 === rangCourant;
        return (
          <li
            key={step.id}
            className={`grid grid-cols-[24px_1fr_auto] items-center gap-3.5 px-4 py-3.5 ${
              index === steps.length - 1 ? '' : 'border-b border-[#f2f2ee]'
            } ${courante ? 'bg-[#fafaf9]' : 'bg-white'}`}
          >
            <span
              aria-hidden="true"
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] ${
                step.completed
                  ? 'bg-[#1a1a19] text-white border border-[#1a1a19]'
                  : courante
                    ? 'bg-white text-[#1a1a19] border-2 border-[#1a1a19]'
                    : 'bg-white text-[#c2c1ba] border border-[#e2e2de]'
              }`}
            >
              {step.completed ? <Check className="w-3 h-3" strokeWidth={2.5} /> : index + 1}
            </span>

            <span className="flex flex-col gap-0.5 min-w-0">
              <span
                className={`text-[14.5px] ${
                  step.completed
                    ? 'text-[#8a8a83] line-through'
                    : courante
                      ? 'text-[#1a1a19] font-semibold'
                      : 'text-[#1a1a19]'
                }`}
              >
                {step.title}
              </span>
              {step.hint && (
                <span className="text-[13px] text-[#a3a39c]">{step.hint}</span>
              )}
            </span>

            {step.completed ? (
              <span className="text-[13px] text-[#a3a39c] whitespace-nowrap">Fait</span>
            ) : step.href ? (
              <Link
                href={step.href}
                className={`text-[13px] whitespace-nowrap underline underline-offset-[3px] ${
                  courante
                    ? 'text-[#1a1a19] font-medium'
                    : 'text-[#8a8a83] hover:text-[#1a1a19]'
                }`}
              >
                {courante ? 'Continuer' : 'Le faire'}
              </Link>
            ) : (
              <span className="text-[13px] text-[#a3a39c] whitespace-nowrap">À faire</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
