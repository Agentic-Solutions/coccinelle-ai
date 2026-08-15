'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { buildApiUrl } from '@/lib/config';
import {
  ListeEtapes,
  rangEtapeCourante,
  useEtapesDemarrage,
} from './EtapesDemarrage';

/**
 * Carte « Bien démarrer » — motif pas-à-pas (chantier CHECKLIST, 15/08/2026).
 *
 * UNE étape à la fois : son titre, deux ou trois lignes qui disent pourquoi, un
 * seul bouton. La liste des cinq étapes n'a pas disparu, elle est repliée
 * derrière « Voir toutes les étapes ».
 *
 * CE QUI CHANGE : la présentation, et elle seule. Les états des cinq étapes, le
 * calcul de l'avancement, le « Passer » persisté en base
 * (`users.checklist_dismissed_at`) et le rechargement au retour sur l'onglet
 * sont ceux d'avant — le chargement est simplement passé dans
 * `useEtapesDemarrage`, partagé avec le bloc d'Aide.
 *
 * CE QUI DISPARAÎT : la barre de progression (remplacée par les pastilles) et le
 * repli de la carte entière. Ce repli existait parce que la carte occupait trois
 * lignes plus cinq étapes en tête du tableau de bord ; elle en fait maintenant
 * le tiers. Sa clé `checklist_repliee` n'est plus lue : ce qui se replie
 * désormais, c'est la liste, sous sa propre clé.
 *
 * CE QUI N'EST PAS ÉCRIT : la maquette annonçait « Deux minutes environ » sous le
 * bouton. Une durée n'est pas un fait mesuré ; on ne la promet pas.
 */

/** Liste dépliée ou non — préférence d'affichage, donc par appareil. */
const CLE_LISTE = 'checklist_etapes_ouvertes';

export default function SetupChecklist() {
  const { checklist, chargement } = useEtapesDemarrage();
  const [masquee, setMasquee] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [listeOuverte, setListeOuverte] = useState(false);

  useEffect(() => {
    try {
      setListeOuverte(localStorage.getItem(CLE_LISTE) === '1');
    } catch { /* stockage bloqué : la liste s'ouvre à la demande, sans mémoire */ }
  }, []);

  const basculerListe = useCallback(() => {
    setListeOuverte((ouverte) => {
      const suivant = !ouverte;
      try {
        if (suivant) localStorage.setItem(CLE_LISTE, '1');
        else localStorage.removeItem(CLE_LISTE);
      } catch { /* navigation privée : l'état vaut pour la session */ }
      return suivant;
    });
  }, []);

  /**
   * Masquage définitif, possible à tout moment (garde serveur retirée le
   * 14/08/2026 : un compte bloqué à 4/5 gardait la carte pour toujours).
   * Persisté en base et non en localStorage — il doit suivre le client d'un
   * appareil à l'autre.
   */
  const masquer = useCallback(async () => {
    const jeton = (() => {
      try {
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      } catch {
        return null;
      }
    })();
    if (!jeton) return;
    setMasquee(true); // masquage optimiste
    try {
      const res = await fetch(buildApiUrl('/api/v1/onboarding/checklist/dismiss'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}` },
      });
      if (!res.ok) setMasquee(false);
    } catch {
      setMasquee(false);
    }
  }, []);

  if (chargement || masquee || !checklist) return null;
  if (checklist.dismissed) return null;

  const { steps, completed, total, setup_completed } = checklist;
  const rangCourant = rangEtapeCourante(steps);
  const etapeCourante = rangCourant === null ? null : steps[rangCourant - 1];
  const restantes = total - completed;

  return (
    <section className="bg-white border border-[#e2e2de] rounded-[14px] px-6 py-6 sm:px-7 mb-6">
      {/* ── L'étape du moment ── */}
      <div className="flex items-start justify-between gap-7 flex-wrap">
        <div className="flex flex-col gap-2.5 max-w-[520px]">
          <span className="text-[11.5px] font-medium tracking-[0.08em] uppercase text-[#a3a39c]">
            {etapeCourante
              ? `Bien démarrer · étape ${rangCourant} sur ${total}`
              : 'Bien démarrer · terminé'}
          </span>
          <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.01em] text-[#1a1a19]">
            {etapeCourante ? etapeCourante.title : 'Tout est prêt'}
          </h2>
          <p className="text-[15px] text-[#3a3a37] leading-[1.6]">
            {etapeCourante
              // `explication` peut manquer si le backend est plus ancien que
              // cette page : on retombe sur le `hint`, jamais sur du vide.
              ? (etapeCourante.explication || etapeCourante.hint || '')
              : 'Votre assistant est configuré, il sait quoi répondre et il décroche. Vous pouvez ranger cette carte.'}
          </p>
        </div>

        {/* Un seul bouton d'action. */}
        {etapeCourante && etapeCourante.href ? (
          <Link
            href={etapeCourante.href}
            className="px-6 py-3.5 rounded-[10px] bg-[#1a1a19] text-white text-[15px] font-medium whitespace-nowrap hover:bg-[#3a3a37] transition-colors"
          >
            {etapeCourante.title}
          </Link>
        ) : !etapeCourante ? (
          <button
            type="button"
            onClick={masquer}
            className="px-6 py-3.5 rounded-[10px] bg-[#1a1a19] text-white text-[15px] font-medium whitespace-nowrap hover:bg-[#3a3a37] transition-colors"
          >
            Masquer cette carte
          </button>
        ) : null}
      </div>

      {/* ── Pastilles, dépli, Passer ── */}
      <div className="mt-6 border-t border-[#f2f2ee] pt-4 flex items-center justify-between gap-5 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Les pastilles sont décoratives : le compte est dit en clair juste
              après, et le rang de l'étape courante en tête de carte. */}
          <span className="flex items-center gap-2" aria-hidden="true">
            {steps.map((step, index) => {
              const courante = index + 1 === rangCourant;
              return (
                <span
                  key={step.id}
                  className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12.5px] font-medium ${
                    step.completed
                      ? 'bg-[#1a1a19] text-white border border-[#1a1a19]'
                      : courante
                        ? 'bg-white text-[#1a1a19] border-2 border-[#1a1a19]'
                        : 'bg-white text-[#c2c1ba] border border-[#e2e2de]'
                  }`}
                >
                  {step.completed ? <Check className="w-3 h-3" strokeWidth={2.5} /> : index + 1}
                </span>
              );
            })}
          </span>
          <span className="ml-1.5 text-[13px] text-[#8a8a83]">
            {restantes === 0
              ? `${total} étapes faites`
              : `${completed} faite${completed > 1 ? 's' : ''}, ${restantes} restante${restantes > 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="flex items-center gap-[18px]">
          {/* Le dépli porte son libellé en clair, pas un chevron seul : c'est lui
              qui rend l'ordre libre trouvable. */}
          <button
            type="button"
            onClick={basculerListe}
            aria-expanded={listeOuverte}
            className="flex items-center gap-[7px] text-[13.5px] font-medium text-[#3a3a37] hover:text-[#1a1a19] transition-colors"
          >
            Voir toutes les étapes
            {listeOuverte
              ? <ChevronUp className="w-[13px] h-[13px]" strokeWidth={2} />
              : <ChevronDown className="w-[13px] h-[13px]" strokeWidth={2} />}
          </button>
          {/* Aux cinq étapes faites, « Passer » n'a plus de sens et la
              confirmation n'a plus rien à protéger : le bouton principal est
              déjà « Masquer cette carte ». Le laisser ici produirait un clic
              sans effet visible. */}
          {!confirmation && !setup_completed && (
            <button
              type="button"
              onClick={() => setConfirmation(true)}
              className="text-[13px] text-[#8a8a83] hover:text-[#1a1a19] underline underline-offset-[3px] transition-colors"
            >
              Passer
            </button>
          )}
        </div>
      </div>

      {/* ── Liste dépliée ── */}
      {listeOuverte && (
        <>
          {/* La phrase ne s'affiche que s'il reste quelque chose à faire : aux
              cinq étapes faites, elle inviterait à choisir dans une liste vide. */}
          {!setup_completed && (
            <p className="mt-3 text-[13px] text-[#8a8a83]">
              Vous pouvez les faire dans l&apos;ordre que vous voulez.
            </p>
          )}
          <div className="mt-3">
            <ListeEtapes steps={steps} />
          </div>
        </>
      )}

      {/* ── Confirmation ──
          Le masquage est irréversible depuis l'interface, et la carte porte des
          étapes non faites : on demande, une fois, et on dit où les retrouver.
          L'endroit existe : le bloc « Bien démarrer » en tête d'Aide. */}
      {confirmation && !setup_completed && (
        <div className="mt-4 border-t border-[#f2f2ee] pt-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[13.5px] text-[#6b6b66] leading-[1.5]">
            Masquer définitivement cette carte ? Vous retrouverez ces étapes dans Aide.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={masquer}
              className="px-4 py-2.5 rounded-[9px] border border-[#1a1a19] bg-white text-[13.5px] font-medium text-[#1a1a19] hover:bg-[#1a1a19] hover:text-white transition-colors"
            >
              Masquer
            </button>
            <button
              type="button"
              onClick={() => setConfirmation(false)}
              className="px-4 py-2.5 rounded-[9px] border border-[#e2e2de] text-[13.5px] font-medium text-[#6b6b66] hover:bg-[#fafaf9] transition-colors"
            >
              Garder
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
