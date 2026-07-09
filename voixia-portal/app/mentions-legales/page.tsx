import type { Metadata } from "next";
import { LegalShell } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "Mentions légales — VoixIA",
  description: "Mentions légales du service VoixIA, édité par Agentic Solutions.",
};

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-[17px] font-semibold" style={{ color: "var(--text)" }}>{heading}</h2>
      <p style={{ margin: 0 }}>{children}</p>
    </section>
  );
}

export default function MentionsLegales() {
  return (
    <LegalShell title="Mentions légales">
      <Block heading="Éditeur">
        VoixIA est un service édité par <strong style={{ color: "var(--text)" }}>Agentic Solutions</strong> (SASU).
        Contact : <a href="mailto:contact@voixia.io" style={{ color: "var(--accent-text)" }}>contact@voixia.io</a>.
      </Block>
      <Block heading="Hébergement">
        L'infrastructure applicative et de traitement (modèle de langage, traitement vocal, données d'appels)
        est hébergée au sein de l'Union Européenne.
      </Block>
      <Block heading="Propriété intellectuelle">
        L'ensemble des contenus, marques et éléments graphiques présents sur ce site sont la propriété
        d'Agentic Solutions, sauf mention contraire.
      </Block>
      <Block heading="Responsabilité">
        Agentic Solutions s'efforce d'assurer l'exactitude des informations diffusées sur ce site, sans
        garantie d'exhaustivité. Les tarifs affichés à des fins comparatives sont donnés à titre indicatif.
      </Block>
      <p className="text-[13px]" style={{ color: "var(--muted-3)" }}>
        Coordonnées légales complètes (SIREN, RCS, TVA, adresse du siège) communiquées sur demande à
        contact@voixia.io — mises à jour à venir.
      </p>
    </LegalShell>
  );
}
