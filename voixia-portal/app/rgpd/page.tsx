import type { Metadata } from "next";
import { LegalShell } from "@/components/landing/LegalShell";

export const metadata: Metadata = {
  title: "RGPD & données personnelles — VoixIA",
  description: "Politique de protection des données personnelles de VoixIA (données hébergées en UE).",
};

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-[17px] font-semibold" style={{ color: "var(--text)" }}>{heading}</h2>
      <p style={{ margin: 0 }}>{children}</p>
    </section>
  );
}

export default function Rgpd() {
  return (
    <LegalShell title="RGPD & données personnelles">
      <Block heading="Localisation des données">
        L'ensemble des traitements — modèle de langage souverain, synthèse et reconnaissance vocale,
        journaux d'appels — est réalisé et stocké au sein de l'<strong style={{ color: "var(--text)" }}>Union Européenne</strong>.
        Aucun transfert hors UE.
      </Block>
      <Block heading="Base légale et finalités">
        Les données sont traitées pour fournir le service d'agents vocaux (traitement des appels, suivi de
        la consommation, gestion du compte), sur la base de l'exécution du contrat.
      </Block>
      <Block heading="Vos droits">
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation
        et de portabilité de vos données. Exercez-les à
        {" "}<a href="mailto:contact@voixia.io" style={{ color: "var(--accent-text)" }}>contact@voixia.io</a>.
      </Block>
      <Block heading="Conservation">
        Les données sont conservées pour la durée nécessaire aux finalités ci-dessus, puis supprimées ou
        anonymisées. Les paramètres de rétention peuvent être ajustés à votre demande.
      </Block>
      <p className="text-[13px]" style={{ color: "var(--muted-3)" }}>
        Politique complète (sous-traitants, mesures de sécurité, DPO) communiquée sur demande — mises à jour à venir.
      </p>
    </LegalShell>
  );
}
