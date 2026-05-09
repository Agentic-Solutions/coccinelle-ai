'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, Minus, ChevronDown } from 'lucide-react';
import LandingNav from '@/components/LandingNav';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

// ─── Plan data ─────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Essentiel',
    desc: 'Pour demarrer',
    monthly: 79,
    annual: 63,
    cta: 'Essayer gratuitement',
    ctaHref: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    desc: 'Pour les equipes',
    monthly: 199,
    annual: 159,
    cta: 'Essayer gratuitement',
    ctaHref: '/signup',
    highlighted: true,
  },
  {
    name: 'Business',
    desc: 'Fort volume',
    monthly: null,
    annual: null,
    cta: 'Nous consulter',
    ctaHref: 'mailto:contact@coccinelle.ai',
    highlighted: false,
  },
];

type FeatureValue = boolean | string;

interface FeatureRow {
  label: string;
  essentiel: FeatureValue;
  pro: FeatureValue;
  business: FeatureValue;
}

const features: { category: string; rows: FeatureRow[] }[] = [
  {
    category: 'Agent vocal',
    rows: [
      { label: 'Minutes vocales incluses', essentiel: '500 min', pro: '1 000 min', business: 'Sur mesure' },
      { label: 'Co\u00FBt/min suppl\u00E9mentaire', essentiel: '0,08 \u20AC', pro: '0,07 \u20AC', business: 'N\u00E9gociable' },
      { label: 'Nombre d\u2019agents vocaux', essentiel: '1', pro: '3', business: 'Illimit\u00E9' },
      { label: 'Voix personnalis\u00E9e', essentiel: false, pro: false, business: true },
    ],
  },
  {
    category: 'Canaux',
    rows: [
      { label: 'SMS inclus', essentiel: '50', pro: '250', business: 'Sur mesure' },
      { label: 'Email', essentiel: true, pro: true, business: true },
      { label: 'WhatsApp', essentiel: false, pro: true, business: true },
    ],
  },
  {
    category: 'Intelligence',
    rows: [
      { label: 'Base de connaissances', essentiel: true, pro: true, business: true },
      { label: 'Agenda & RDV', essentiel: true, pro: true, business: true },
      { label: 'CRM contacts', essentiel: true, pro: true, business: true },
      { label: 'Catalogue produits', essentiel: false, pro: true, business: true },
      { label: 'Insights basiques', essentiel: true, pro: true, business: true },
      { label: 'Insights complets', essentiel: false, pro: true, business: true },
    ],
  },
  {
    category: 'Collaboration',
    rows: [
      { label: 'Multi-agents', essentiel: false, pro: true, business: true },
      { label: 'R\u00F4les et permissions', essentiel: false, pro: true, business: true },
      { label: 'Acc\u00E8s API', essentiel: false, pro: false, business: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Support email', essentiel: '48h', pro: '24h', business: '4h' },
      { label: 'Support prioritaire', essentiel: false, pro: true, business: true },
      { label: 'Account manager d\u00E9di\u00E9', essentiel: false, pro: false, business: true },
      { label: 'SLA garanti', essentiel: false, pro: false, business: true },
    ],
  },
];

const faqs = [
  {
    q: 'Que se passe-t-il apr\u00E8s les 14 jours ?',
    a: 'Vous choisissez un plan ou vos donn\u00E9es sont conserv\u00E9es 30 jours. Aucun pr\u00E9l\u00E8vement automatique \u2014 vous d\u00E9cidez.',
  },
  {
    q: 'Puis-je changer de plan \u00E0 tout moment ?',
    a: 'Oui. Passage d\u2019Essentiel \u00E0 Pro (ou inversement) instantan\u00E9, facturation ajust\u00E9e au prorata.',
  },
  {
    q: 'Comment fonctionne la facturation des minutes suppl\u00E9mentaires ?',
    a: 'Les minutes au-del\u00E0 de votre forfait sont factur\u00E9es au tarif de d\u00E9passement de votre plan. Vous \u00EAtes pr\u00E9venu par email \u00E0 80% et 100% de votre quota.',
  },
  {
    q: 'Y a-t-il un engagement ?',
    a: 'Non. Pas de contrat, pas d\u2019engagement minimum. Annulation \u00E0 tout moment en un clic.',
  },
  {
    q: 'Acceptez-vous les paiements par virement ?',
    a: 'Oui, pour les plans Business. Contactez-nous pour mettre en place le virement SEPA.',
  },
  {
    q: 'Proposez-vous des tarifs pour les associations/ONG ?',
    a: 'Oui. Contactez-nous \u00E0 contact@coccinelle.ai pour un tarif adapt\u00E9.',
  },
];

// ─── Feature cell ──────────────────────────────────────────────────────────────

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="w-5 h-5 text-gray-900 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
  return <span className="text-sm text-gray-700">{value}</span>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* ──────────── HERO ──────────── */}
      <section className="pt-20 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Simple. Transparent. Sans surprise.
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            14 jours gratuits &middot; Sans carte bancaire
          </p>

          {/* Toggle mensuel / annuel */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                !annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                annual ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              Annuel
              <span className="ml-1.5 text-xs font-semibold text-green-600">-20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ──────────── PLAN CARDS ──────────── */}
      <section className="pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const price = annual ? plan.annual : plan.monthly;
              return (
                <div
                  key={plan.name}
                  className={`rounded-xl p-8 flex flex-col ${
                    plan.highlighted
                      ? 'bg-gray-900 text-white relative md:scale-105 shadow-xl'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-900 text-white border border-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                        Populaire
                      </span>
                    </div>
                  )}
                  <h3 className={`text-xl font-bold mb-1 ${plan.highlighted ? '' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-sm mb-6 ${plan.highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
                  <div className="mb-8">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-bold">{price}&#8239;&#8364;</span>
                        <span className={plan.highlighted ? 'text-gray-400' : 'text-gray-500'}>/mois HT</span>
                      </>
                    ) : (
                      <span className={`text-2xl font-bold ${plan.highlighted ? '' : 'text-gray-900'}`}>Sur mesure</span>
                    )}
                  </div>
                  {plan.ctaHref.startsWith('mailto:') ? (
                    <a
                      href={plan.ctaHref}
                      className={`block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg transition-colors mt-auto ${
                        plan.highlighted
                          ? 'bg-white text-gray-900 hover:bg-gray-100'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <Link
                      href={plan.ctaHref}
                      className={`block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg transition-colors mt-auto ${
                        plan.highlighted
                          ? 'bg-white text-gray-900 hover:bg-gray-100'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── COMPARISON TABLE ──────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Comparatif d&eacute;taill&eacute;
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 pr-4 text-sm font-medium text-gray-500 w-1/3" />
                  <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center w-[22%]">Essentiel</th>
                  <th className="py-4 px-4 text-sm font-semibold text-white text-center w-[22%]">
                    <span className="bg-gray-900 px-3 py-1 rounded-full">Pro</span>
                  </th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center w-[22%]">Business</th>
                </tr>
              </thead>
              <tbody>
                {features.map((group) => (
                  <>
                    <tr key={`cat-${group.category}`}>
                      <td colSpan={4} className="pt-8 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {group.category}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.label} className="border-b border-gray-100">
                        <td className="py-3.5 pr-4 text-sm text-gray-700">{row.label}</td>
                        <td className="py-3.5 px-4 text-center"><FeatureCell value={row.essentiel} /></td>
                        <td className="py-3.5 px-4 text-center"><FeatureCell value={row.pro} /></td>
                        <td className="py-3.5 px-4 text-center"><FeatureCell value={row.business} /></td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile comparison (cards) */}
          <div className="md:hidden space-y-8">
            {plans.map((plan) => {
              const planKey = plan.name.toLowerCase() as 'essentiel' | 'pro' | 'business';
              return (
                <div key={plan.name} className={`rounded-xl p-6 ${plan.highlighted ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${plan.highlighted ? '' : 'text-gray-900'}`}>{plan.name}</h3>
                  {features.map((group) => (
                    <div key={group.category} className="mb-4">
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${plan.highlighted ? 'text-gray-400' : 'text-gray-400'}`}>
                        {group.category}
                      </p>
                      <div className="space-y-2">
                        {group.rows.map((row) => {
                          const val = row[planKey];
                          return (
                            <div key={row.label} className="flex items-center justify-between text-sm">
                              <span className={plan.highlighted ? 'text-gray-300' : 'text-gray-600'}>{row.label}</span>
                              <span>
                                {val === true ? <Check className={`w-4 h-4 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`} /> :
                                 val === false ? <X className="w-4 h-4 text-gray-400" /> :
                                 <span className={plan.highlighted ? 'font-medium' : 'font-medium text-gray-900'}>{val}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── PLANS DIGITAL ──────────── */}
      <section id="digital" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-sm font-medium text-gray-500 whitespace-nowrap text-center">
              Vous communiquez d&eacute;j&agrave; par SMS et Email ?
            </p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <p className="text-center text-sm text-gray-400 mb-10">
            D&eacute;couvrez nos plans Digital &mdash; sans agent vocal
          </p>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Plans Digital &mdash; Sans agent vocal</h3>
              <p className="text-sm text-gray-500">SMS, Email et WhatsApp uniquement</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Digital SMS */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">SMS</h4>
                <p className="text-xs text-gray-500 mb-4">L&apos;essentiel</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">39&#8239;&#8364;</span>
                  <span className="text-gray-500 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">50 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Support email</span></li>
                  <li className="flex items-center gap-2"><Minus className="w-4 h-4 text-gray-300 flex-shrink-0" /><span className="text-gray-400">Email</span></li>
                  <li className="flex items-center gap-2"><Minus className="w-4 h-4 text-gray-300 flex-shrink-0" /><span className="text-gray-400">WhatsApp</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-del&agrave;</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>

              {/* Digital Pro */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">Digital Pro</h4>
                <p className="text-xs text-gray-500 mb-4">SMS + Email</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">69&#8239;&#8364;</span>
                  <span className="text-gray-500 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">100 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Email inclus</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Insights basiques</span></li>
                  <li className="flex items-center gap-2"><Minus className="w-4 h-4 text-gray-300 flex-shrink-0" /><span className="text-gray-400">WhatsApp</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-del&agrave;</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>

              {/* Digital Omnicanal */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                <h4 className="text-base font-bold text-gray-900 mb-1">Digital Omnicanal</h4>
                <p className="text-xs text-gray-500 mb-4">Tous canaux</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">129&#8239;&#8364;</span>
                  <span className="text-gray-500 text-sm">/mois HT</span>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">300 SMS/mois</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Email inclus</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">WhatsApp</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Base de connaissances</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Agenda & RDV</span></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-gray-900 flex-shrink-0" /><span className="text-gray-700">Insights complets</span></li>
                </ul>
                <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-del&agrave; &middot; WhatsApp bient&ocirc;t disponible</p>
                <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Commencer
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-6">
              Tous nos plans incluent un essai gratuit de 14 jours. Sans carte bancaire. Sans engagement.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────── FAQ ──────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Questions fr&eacute;quentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── CTA FINAL ──────────── */}
      <section className="py-20 bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Pr&ecirc;t &agrave; d&eacute;marrer ?
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Configurez votre agent en 10 minutes. Sans carte bancaire.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Essayer gratuitement
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            14 jours d&apos;essai gratuit &middot; Annulation &agrave; tout moment
          </p>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
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
              <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions legales</Link>
              <Link href="/legal/politique-confidentialite" className="hover:text-white transition-colors">Confidentialite</Link>
              <Link href="/legal/politique-cookies" className="hover:text-white transition-colors">Cookies</Link>
              <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/legal/cgv" className="hover:text-white transition-colors">CGV</Link>
              <a href="mailto:contact@coccinelle.ai" className="hover:text-white transition-colors">Contact</a>
            </nav>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">&copy; 2026 Agentic Solutions SASU &middot; SIREN 944 504 679</p>
            <p className="text-sm text-gray-500">Heberge en France &middot; Donnees en Europe</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

