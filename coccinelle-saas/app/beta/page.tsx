'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Check, ArrowRight, Shield, Mail } from 'lucide-react';
import AnimatedAppPreview from '@/components/landing/AnimatedAppPreview';
import HeroSectionBeta from '@/components/landing/HeroSectionBeta';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ComparisonSection from '@/components/landing/ComparisonSection';
import SavingsCalculator from '@/components/landing/SavingsCalculator';
import ProductTourModal from '@/components/ProductTourModal';
import {
  ScissorsIcon,
  HeartPulseIcon,
  BuildingIcon,
  UtensilsIcon,
  DumbbellIcon,
  BriefcaseIcon,
} from '@/components/landing/icons';

const sectors = [
  {
    icon: ScissorsIcon,
    title: 'Coiffure et beauté',
    description: 'Vos clientes réservent en ligne pendant que vous coiffez. Rappels automatiques, zéro appel à gérer.',
  },
  {
    icon: HeartPulseIcon,
    title: 'Santé et médical',
    description: 'Vos patients prennent RDV sans attendre au téléphone. L\'assistant gère les demandes de renouvellement et les urgences.',
  },
  {
    icon: BuildingIcon,
    title: 'Immobilier',
    description: 'Ne perdez plus de prospects pendant vos visites. L\'assistant qualifie les demandes et planifie les rendez-vous pour vous.',
  },
  {
    icon: UtensilsIcon,
    title: 'Restauration',
    description: 'Réservation de tables par téléphone et en ligne, même à minuit. Confirmations automatiques, annulations gérées.',
  },
  {
    icon: DumbbellIcon,
    title: 'Fitness et sport',
    description: 'Réservation de cours et de créneaux en self-service. Vos adhérents gèrent tout depuis leur téléphone.',
  },
  {
    icon: BriefcaseIcon,
    title: 'Services et conseil',
    description: 'Prise de RDV, qualification des demandes et suivi client. Concentrez-vous sur votre expertise.',
  },
];

export default function LandingPage() {
  const [tourOpen, setTourOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">coccinelle.ai</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#fonctionnalites" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Fonctionnalités</a>
              <a href="#secteurs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Secteurs</a>
              <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Démo</a>
              <a
                href="https://formulaire-validation.youssef-amrouche.workers.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-700 transition"
              >
                Participer à l&apos;étude
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* 1. Hero */}
      <HeroSectionBeta onOpenTour={() => setTourOpen(true)} />

      {/* 2. Fonctionnalités */}
      <FeaturesSection />

      {/* 3. Pourquoi Coccinelle */}
      <ComparisonSection />

      {/* 4. Calculez vos économies */}
      <SavingsCalculator />

      {/* 5. Découvrez la plateforme */}
      <section id="demo" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Découvrez la plateforme
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une interface intuitive qui gère tous vos appels, rendez-vous et clients en une seule plateforme
            </p>
          </div>

          <AnimatedAppPreview />
        </div>
      </section>

      {/* 5. Démo interactive */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Regardez comme c&apos;est facile
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez en 2 minutes comment Coccinelle simplifie votre quotidien
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={() => setTourOpen(true)}
              className="inline-flex items-center gap-3 bg-[#D85A30] text-white px-10 py-5 rounded-xl text-lg font-bold hover:bg-[#993C1D] transition-all shadow-xl hover:shadow-2xl"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Lancer la démonstration
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Durée : 2 minutes — 10 modules essentiels
            </p>
          </div>
        </div>
      </section>

      {/* 6. Secteurs */}
      <section id="secteurs" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pour tous types de secteurs
            </h2>
            <p className="text-lg text-gray-600">
              Coccinelle s&apos;adapte à votre métier
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {sectors.map((sector) => {
              const Icon = sector.icon;
              return (
                <div key={sector.title} className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{sector.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {sector.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Témoignages */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ce qu’ils en pensent
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                &quot;Avec Coccinelle, 95% de nos appels clients sont maintenant traités immédiatement. La satisfaction client a explosé et nos équipes peuvent se concentrer sur les cas complexes.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">ML</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Marie Legrand</div>
                  <div className="text-sm text-gray-600">Directrice Relation Client</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                &quot;Depuis que j&apos;utilise Coccinelle, je ne rate plus aucun appel. Mes clientes réservent en ligne et je reçois un récapitulatif chaque matin. Un vrai gain de temps.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">TD</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Thomas Dupont</div>
                  <div className="text-sm text-gray-600">Gérant de salon</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                &quot;Installation en 5 minutes, interface claire. Mon équipe traite maintenant 3 fois plus de demandes sans effort. Les clients apprécient les réponses instantanées.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">SB</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sophie Bernard</div>
                  <div className="text-sm text-gray-600">Responsable Support Client</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Sécurité et conformité */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Sécurité et conformité
            </h2>
            <p className="text-lg text-gray-600">
              Vos données sont protégées et conformes aux normes les plus strictes
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">RGPD</h3>
              <p className="text-sm text-gray-600">100% conforme RGPD</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Stack souveraine</h3>
              <p className="text-sm text-gray-600">Infrastructure 100 % française</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Hébergement EU</h3>
              <p className="text-sm text-gray-600">Données en France</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Chiffrement</h3>
              <p className="text-sm text-gray-600">SSL/TLS 256-bit</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CTA final */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre quotidien ?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Rejoignez les professionnels qui gèrent leurs clients, rendez-vous et appels avec coccinelle.ai.
            <br />
            Participer à l'étude de 14 jours, sans engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://formulaire-validation.youssef-amrouche.workers.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-gray-900 bg-white hover:bg-gray-50 shadow-lg transition-all"
            >
              Participer à l’étude terrain
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="https://formulaire-validation.youssef-amrouche.workers.dev/waitlist"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-base font-semibold rounded-lg text-white hover:bg-gray-800 transition-all"
            >
              Être contacté(e) en avant-première
            </a>
            <button
              onClick={() => setTourOpen(true)}
              className="inline-flex items-center justify-center px-8 py-4 border border-white border-opacity-40 text-sm font-medium rounded-lg text-gray-400 hover:bg-gray-800 transition-all"
            >
              Voir la démo
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-10 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              2 mois gratuits pour les bêta-testeurs
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Sans engagement
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Annulation à tout moment
            </div>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <span className="ml-3 text-xl font-bold text-white">coccinelle.ai</span>
              </div>
              <p className="text-sm text-gray-400">
                La plateforme tout-en-un qui gère vos clients, rendez-vous et appels 24/7.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-white transition">Tarifs</a></li>
                <li><a href="#demo" className="hover:text-white transition">Démo</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white transition">À propos</a></li>
                <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
                <li><a href="mailto:contact@coccinelle.ai" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/confidentialite" className="hover:text-white transition">Confidentialité</Link></li>
                <li><Link href="/cgu" className="hover:text-white transition">CGU</Link></li>
                <li><Link href="/mentions-legales" className="hover:text-white transition">Mentions légales</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-400">
                &copy; 2026 coccinelle.ai — Agentic Solutions SASU
              </p>
              <div className="flex items-center gap-6">
                <a href="mailto:contact@coccinelle.ai" className="text-gray-400 hover:text-white transition">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Product Tour Modal */}
      <ProductTourModal isOpen={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
