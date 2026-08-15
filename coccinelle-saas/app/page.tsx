import Link from 'next/link';
import {
  Mic, BookOpen, Package, Calendar, MessageSquare, Users,
  Phone, HelpCircle, ShoppingBag, BarChart3, Check, ArrowRight,
  Building2, Heart, UtensilsCrossed, Car, Scissors, Scale, Calculator, Stethoscope,
  Flag, Shield,
} from 'lucide-react';
import LandingNav from '@/components/LandingNav';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';
import DigitalPlans from '@/components/landing/DigitalPlans';
import HeroAnimation from '@/components/HeroAnimation';
import DemoButton from '@/components/DemoButton';

const steps = [
  { icon: Phone, num: '1', title: 'Votre client appelle', desc: 'Réponse en 2 secondes, voix française naturelle' },
  { icon: HelpCircle, num: '2', title: 'Votre client pose une question', desc: "L'agent consulte votre base de connaissances" },
  { icon: ShoppingBag, num: '3', title: 'Votre client veut un produit', desc: "L'agent connaît votre catalogue et vos prix" },
  { icon: Calendar, num: '4', title: 'Votre client veut un RDV', desc: 'Réservation en direct dans votre agenda' },
  { icon: MessageSquare, num: '5', title: 'Il raccroche', desc: 'Confirmation SMS ou WhatsApp automatique' },
  { icon: BarChart3, num: '6', title: 'Vous recevez tout', desc: "Prospect dans le CRM, RDV dans l'agenda, résumé dans le dashboard" },
];

const modules = [
  { icon: Mic, title: 'Agent vocal IA', desc: 'Répond 24h/24, voix française naturelle' },
  { icon: BookOpen, title: 'Base de connaissances', desc: 'Répond précisément à toutes vos questions clients' },
  { icon: Package, title: 'Catalogue produits', desc: 'Présente vos offres, prix et disponibilités' },
  { icon: Calendar, title: 'Agenda & RDV', desc: 'Prend et confirme les rendez-vous en direct' },
  { icon: MessageSquare, title: 'Multicanal', desc: 'Voix, SMS, WhatsApp — tout en un' },
  { icon: Users, title: 'CRM intégré', desc: 'Chaque appel crée un contact et un historique' },
];

const sectors = [
  { icon: Building2, label: 'Immobilier', href: '/secteurs/immobilier' },
  { icon: Heart, label: 'Sant\u00e9', href: '/secteurs/sante' },
  { icon: UtensilsCrossed, label: 'Restaurant', href: '/secteurs/restaurant' },
  { icon: Car, label: 'Automobile', href: '/secteurs/automobile' },
  { icon: Scissors, label: 'Beaut\u00e9', href: '/secteurs/beaute' },
  { icon: Scale, label: 'Juridique', href: '/secteurs/juridique' },
  { icon: Calculator, label: 'Comptable', href: undefined },
  { icon: Stethoscope, label: 'V\u00e9t\u00e9rinaire', href: undefined },
];

const partners = [
  {
    icon: Building2,
    title: 'Nubbo Toulouse',
    subtitle: 'En pré-incubation (FEDER)',
  },
  {
    icon: Flag,
    title: 'Hébergé en France',
    subtitle: 'Infrastructure souveraine 100% européenne',
  },
  {
    icon: Shield,
    title: 'RGPD natif',
    subtitle: 'Conformité par conception, dès le premier appel',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Coccinelle.ai",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Agent vocal IA omnicanal pour PME françaises",
            "url": "https://coccinelle.ai",
            "offers": {
              "@type": "Offer",
              "price": "79",
              "priceCurrency": "EUR",
              "priceValidUntil": "2027-12-31"
            },
            "provider": {
              "@type": "Organization",
              "name": "Agentic Solutions SASU",
              "url": "https://coccinelle.ai"
            }
          })
        }}
      />
      <LandingNav />

      {/* ──────────── SECTION 1 — HERO ──────────── */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                La relation client des grands groupes, accessible à toutes les PME
              </h1>
              <p className="mt-4 text-xl sm:text-2xl font-semibold text-gray-900">
                Réponse immédiate. Voix française naturelle. Dès 79&#8239;€/mois.
              </p>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                Votre agent vocal répond 24h/24, connaît votre métier,
                prend les rendez-vous et confirme par SMS — pendant que vous travaillez.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-700 transition-colors"
                >
                  Essayer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <DemoButton />
              </div>
            </div>

            {/* Animated call scenarios */}
            <HeroAnimation />
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 2 — PROBLEME ──────────── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center mb-16">
            Vous aussi vous perdez des clients chaque soir ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-3">5-15</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">appels manqués par jour</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Pour une PME de 5 à 20 salariés. Plus encore en période de rush. Source&nbsp;: XCALLY, 2026
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-3">85%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">ne rappellent jamais</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Et 62% contactent immédiatement un concurrent. Pas de message vocal. Pas de seconde chance. Sources&nbsp;: BT Business / NewVoiceMedia
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-3">240&#8239;€</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">perdus par appel manqué</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                En moyenne en France. Si vous recevez 8 appels/jour, c&apos;est jusqu&apos;à 7&nbsp;200&#8239;€/mois qui s&apos;envolent. Source&nbsp;: Cube Communication, 2024
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 3 — SOLUTION (parcours client) ──────────── */}
      <section id="demo" className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Le parcours client parfait, automatiquement
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              De l&apos;appel entrant au compte rendu dans votre dashboard, tout est géré.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white text-sm font-bold">
                      {step.num}
                    </span>
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 4 — MODULES ──────────── */}
      <section id="fonctionnalites" className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Tout ce dont votre PME a besoin
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Six modules intégrés. Zéro intégration à faire.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div key={mod.title} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{mod.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 5 — SECTEURS ──────────── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center mb-16">
            Pour toutes les PME françaises
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {sectors.map((s) => {
              const Icon = s.icon;
              const content = (
                <>
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{s.label}</span>
                </>
              );
              if (s.href) {
                return (
                  <Link key={s.label} href={s.href} className="flex flex-col items-center gap-3 p-4 group">
                    {content}
                  </Link>
                );
              }
              return (
                <div key={s.label} className="flex flex-col items-center gap-3 p-4 group">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 5b — PARTENAIRES ──────────── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Ils nous accompagnent
            </h2>
            <p className="text-lg text-gray-600">
              Coccinelle.ai s&apos;appuie sur des partenaires français de confiance
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {partners.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-7 h-7 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-600">{p.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 6 — TARIFS ──────────── */}
      <section id="tarifs" className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Simple. Transparent. Sans surprise.
            </h2>
            <p className="text-lg text-gray-600">
              14 jours d&apos;essai gratuit (60 min, 20 SMS) — sans carte bancaire.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Essentiel */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Essentiel</h3>
              <p className="text-sm text-gray-500 mb-6">Pour démarrer</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-gray-900">79&#8239;euros</span>
                <span className="text-gray-500">/mois HT</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '300 minutes vocales IA',
                  '50 SMS inclus (confirmations automatiques)',
                  '1 agent vocal',
                  'Base de connaissances',
                  'Agenda & rendez-vous',
                  'CRM contacts',
                  'Support email (48h)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mb-4">Dépassement : 0,10&#8239;euros/min &middot; 0,10&#8239;euros/SMS</p>
              <Link
                href="/signup"
                className="block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Essayer gratuitement
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gray-900 rounded-xl p-8 text-white flex flex-col relative md:scale-105 shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gray-900 text-white border border-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                  Populaire
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1">Pro</h3>
              <p className="text-sm text-gray-400 mb-6">Pour les équipes</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">199&#8239;euros</span>
                <span className="text-gray-400">/mois HT</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '1 000 minutes vocales IA',
                  '250 SMS inclus',
                  'Tout Essentiel +',
                  
                  'CRM complet + export',
                  'Catalogue produits',
                  'Analytics avancés',
                  'Rôles et permissions',
                  'Support prioritaire (24h)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mb-4">Dépassement : 0,07&#8239;euros/min &middot; 0,10&#8239;euros/SMS</p>
              <Link
                href="/signup"
                className="block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Essayer gratuitement
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-1">Business</h3>
              <p className="text-sm text-gray-500 mb-6">Fort volume</p>
              <div className="mb-8">
                <span className="text-2xl font-bold text-gray-900">Sur mesure</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Minutes personnalisées',
                  'Utilisateurs illimités',
                  'Tout Pro +',
                  'Voix personnalisée',
                  'SLA garanti',
                  'Account manager dédié (4h)',
                  'API et intégrations sur mesure',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:contact@coccinelle.ai"
                className="block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Nous consulter
              </a>
            </div>
          </div>

          {/* ── Plans Digitaux (repliable) ── */}
          <DigitalPlans />

          {/* FAQ Tarifs */}
          <div className="max-w-3xl mx-auto mt-16">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-8">Questions fréquentes</h3>
            <div className="space-y-6">
              <div>
                <p className="font-medium text-gray-900 text-sm">Que se passe-t-il si je dépasse mon forfait de minutes ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Les minutes supplémentaires sont facturées au tarif de dépassement de votre plan (0,10&#8239;euros/min Essentiel, 0,07&#8239;euros/min Pro). Vous êtes prévenu par email à 80% et 100% de votre quota.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Puis-je changer de plan à tout moment ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Oui, vous pouvez passer d&apos;Essentiel à Pro (ou inversement) à tout moment. La facturation est ajustée au prorata.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">L&apos;essai gratuit est-il vraiment sans engagement ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Oui. 14 jours, 60 minutes vocales et 20 SMS inclus, sans carte bancaire. Vos données sont conservées 30 jours après expiration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 7 — MESSAGE FONDATEUR ──────────── */}
      <section id="a-propos" className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-6xl text-gray-200 font-serif leading-none mb-8 text-center">&ldquo;</div>
          <blockquote className="text-xl text-gray-700 leading-relaxed italic border-l-4 border-gray-900 pl-8">
            <p className="mb-6">
              J&apos;ai passé 25 ans à observer ce qui se passe quand un appel ne décroche pas.
            </p>
            <p className="mb-6">
              Le locataire avec sa fuite d&apos;eau rappelle 4 fois. Le propriétaire en colère laisse
              un avis négatif. Le patient qui ne peut pas joindre son médecin va aux urgences.
            </p>
            <p>
              Ce n&apos;est pas une perte de chiffre d&apos;affaires. C&apos;est une promesse non tenue.
            </p>
          </blockquote>
          <p className="text-sm text-gray-500 mt-6 not-italic text-center">
            — Youssef Amrouche, Fondateur<br />
            Agentic Solutions SASU &middot; Toulouse
          </p>
        </div>
      </section>

      {/* ──────────── SECTION 8 — CTA FINAL ──────────── */}
      <section className="py-20 lg:py-24 bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Votre agent vous attend.
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Configurez-le en 10 minutes. Sans carte bancaire.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Essayer gratuitement
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            14 jours d&apos;essai gratuit &middot; Annulation à tout moment
          </p>
        </div>
      </section>

      {/* ──────────── SECTION 9 — FOOTER ──────────── */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <CoccinelleIcon size={18} color="white" />
              </div>
              <span className="text-lg font-bold text-white">Coccinelle.ai</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
              <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link href="/legal/politique-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link href="/legal/politique-cookies" className="hover:text-white transition-colors">Cookies</Link>
              <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/legal/cgv" className="hover:text-white transition-colors">CGV</Link>
              <a href="mailto:contact@coccinelle.ai" className="hover:text-white transition-colors">Contact</a>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; 2026 Agentic Solutions SASU &middot; SIREN 944 504 679
            </p>
            <p className="text-sm text-gray-500">
              Hébergé en France &middot; Données en Europe
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
