import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PriceComparator } from "@/components/landing/PriceComparator";
import { Pricing } from "@/components/landing/Pricing";
import { Sovereignty } from "@/components/landing/Sovereignty";
import { Omnichannel } from "@/components/landing/Omnichannel";
import { Faq } from "@/components/landing/Faq";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "VoixIA — L'API d'agents vocaux IA souveraine et française",
  description:
    "Déployez des agents vocaux IA qui répondent au téléphone, en SMS et par email. Hébergé en Europe, LLM Mistral souverain, RGPD natif. Le prix affiché = le prix payé.",
};

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", overflowX: "hidden" }}>
      <LandingNav />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <PriceComparator />
      <Pricing />
      <Sovereignty />
      <Omnichannel />
      <Faq />

      {/* CTA final */}
      <section className="mx-auto mb-24 max-w-[1120px] px-7">
        <div
          className="rounded-[24px] px-10 py-15 text-center"
          style={{ border: "1px solid var(--border)", background: "var(--bg-alt)" }}
        >
          <h2 className="vx-h2 mb-3.5" style={{ fontSize: 36 }}>
            Prêt à déployer votre premier agent ?
          </h2>
          <p className="mb-7 text-[16.5px]" style={{ color: "var(--muted-2)" }}>
            Compte créé en quelques minutes. Numéro français attribué en un clic.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="vx-btn-primary px-7 py-3.5 text-[15px]">
              Créer un compte →
            </Link>
            <a
              href="mailto:contact@voixia.io?subject=Devenir%20revendeur%20VoixIA"
              className="vx-btn-secondary px-7 py-3.5 text-[15px]"
            >
              Devenir revendeur
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
