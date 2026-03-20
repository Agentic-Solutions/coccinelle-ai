'use client';

import Link from 'next/link';
import { Check, ArrowRight, Shield, Phone, Calendar, MessageSquare } from 'lucide-react';

const sectors = [
  { emoji: '✂️', title: 'Coiffure & Beauté', pain: 'Vous coiffez, les appels tombent dans le vide' },
  { emoji: '🔧', title: 'Artisans & Services', pain: 'Sur chantier toute la journée, injoignable' },
  { emoji: '🏠', title: 'Immobilier', pain: 'En visite, vos prospects appellent la concurrence' },
  { emoji: '🏋️', title: 'Sport & Fitness', pain: 'En cours, personne ne renseigne vos prospects' },
  { emoji: '🦷', title: 'Santé & Médical', pain: 'Secrétariat débordé, no-shows répétés' },
  { emoji: '🏗️', title: 'Marchand de biens', pain: 'Une opportunité non qualifiée = une marge perdue' },
];

const stats = [
  { value: '38%', label: 'des appels décrochés dans les TPE' },
  { value: '85%', label: 'des appelants ne rappellent jamais' },
  { value: '62%', label: 'appellent un concurrent en 5 min' },
];

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="ml-2 text-lg font-bold text-gray-900">coccinelle.ai</span>
            </Link>
            <a
              href="https://bit.ly/4cZRjlt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-[#D85A30] hover:bg-[#993C1D] transition"
            >
              Participer à l&apos;étude
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-[#D85A30] px-4 py-2 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-[#D85A30] rounded-full animate-pulse"></span>
            Accès bêta — places limitées
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Vous perdez des clients<br />
            <span className="text-[#D85A30]">chaque fois que vous travaillez.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Coccinelle est le premier assistant omnicanal IA pour les professionnels.
            Sara répond à vos appels, qualifie vos prospects et prend vos rendez-vous —
            même quand vous avez les mains occupées.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://bit.ly/4cZRjlt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#D85A30] hover:bg-[#993C1D] shadow-lg transition-all"
            >
              Participer à l&apos;étude terrain
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href="mailto:contact@coccinelle.ai"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 text-base font-semibold rounded-lg text-gray-700 hover:border-gray-400 transition-all"
            >
              Être contacté en avant-première
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            2 minutes · Anonyme · Aucun but commercial
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.value} className="text-center">
                <div className="text-5xl font-bold text-[#D85A30] mb-2">{stat.value}</div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ce que fait Sara */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Sara, votre assistante vocale IA
            </h2>
            <p className="text-lg text-gray-600">
              Elle répond, qualifie et planifie — vous vous concentrez sur votre métier
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Répond 24h/24</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Zéro appel manqué, même pendant vos heures de travail, le soir et le week-end.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Prend vos RDV</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Réserve, confirme et rappelle vos clients automatiquement. Agenda toujours à jour.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">SMS & WhatsApp</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Confirmations, rappels et suivi client sur tous les canaux depuis une seule interface.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Secteurs */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Votre secteur est concerné
            </h2>
            <p className="text-lg text-gray-600">
              Le même problème, des conséquences différentes
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sectors.map((sector) => (
              <div key={sector.title} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">{sector.emoji}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{sector.title}</h3>
                <p className="text-gray-500 text-sm italic">&ldquo;{sector.pain}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA étude */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Aidez-nous à construire la bonne solution
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Nous menons une étude terrain auprès de professionnels pour comprendre
            l&apos;impact réel des appels manqués. 2 minutes, anonyme, aucun but commercial.
          </p>
          <a
            href="https://bit.ly/4cZRjlt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-10 py-5 border border-transparent text-lg font-semibold rounded-xl text-gray-900 bg-white hover:bg-gray-50 shadow-xl transition-all"
          >
            Participer à l&apos;étude — 2 min
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-10 text-sm text-gray-300">
            <div className="flex items-center gap-2"><Check className="w-4 h-4" /> Anonyme</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4" /> Aucun but commercial</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4" /> 2 minutes</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="ml-2 text-white font-bold">coccinelle.ai</span>
          </div>
          <p className="text-sm">&copy; 2025 coccinelle.ai — Agentic Solutions SASU, Toulouse</p>
          <div className="flex gap-6 text-sm">
            <Link href="/confidentialite" className="hover:text-white transition">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-white transition">CGU</Link>
            <a href="mailto:contact@coccinelle.ai" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
