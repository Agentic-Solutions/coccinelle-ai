"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Où sont hébergées les données ?",
    a: "Toute l'infrastructure — modèle Mistral, traitement vocal, journaux d'appels — est hébergée dans l'Union Européenne. Aucun transfert hors UE, conformité RGPD native, aucune dépendance à un cloud extra-européen.",
  },
  {
    q: "Qu'est-ce qui est inclus dans le prix par minute ?",
    a: "Tout : le modèle de langage, la synthèse et la reconnaissance vocale, ainsi que la téléphonie. Facturation à la seconde, sans abonnement caché. Le prix affiché est le prix payé.",
  },
  {
    q: "Quels canaux sont supportés ?",
    a: "La voix (appels entrants et sortants) et le SMS sont actifs et partagent la même conversation. WhatsApp Business arrive prochainement.",
  },
  {
    q: "Puis-je revendre sous ma propre marque ?",
    a: "Oui. L'offre Business inclut un portail en marque blanche pour proposer des agents vocaux à vos clients, avec la marge de votre choix. Écrivez-nous pour un accès.",
  },
  {
    q: "Combien coûte un numéro de téléphone ?",
    a: "5 €/mois par numéro français dédié, attribué à un agent. Vous pouvez en acheter directement depuis le portail, en un clic.",
  },
  {
    q: "Comment je démarre ?",
    a: "Créez un compte, configurez un premier agent (voix, secteur, comportement), attribuez-lui un numéro — et il répond au téléphone. Quelques minutes suffisent.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className="mx-auto max-w-[820px] px-7 pb-24 pt-10">
      <h2 className="vx-h2 mb-10 text-center" style={{ fontSize: 36 }}>
        Questions fréquentes
      </h2>
      <div className="flex flex-col gap-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="overflow-hidden rounded-[14px]"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 2px rgba(15,23,42,0.03)" }}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[16.5px] font-semibold"
                style={{ color: "var(--text)", letterSpacing: "-0.01em", background: "transparent", border: "none", cursor: "pointer" }}
              >
                {item.q}
                <span className="shrink-0 text-[22px] font-normal" style={{ color: "var(--accent-text)" }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-[15px]" style={{ lineHeight: 1.65, color: "var(--muted-2)" }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
