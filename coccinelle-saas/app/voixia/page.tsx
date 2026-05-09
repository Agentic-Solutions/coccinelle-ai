'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mic, Zap, Globe, Shield, ArrowRight, Check, X } from 'lucide-react';

// ─── Donnees comparatif ──────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { label: 'Voix FR natives',      voixia: '20',          retell: '~5',         vapi: '~3' },
  { label: 'Latence',              voixia: '<500ms',      retell: '<800ms',     vapi: '<1s' },
  { label: 'Telephonie SIP',       voixia: 'Inclus',      retell: 'Supplement', vapi: 'Supplement' },
  { label: 'CRM integre',          voixia: 'Oui',         retell: 'Non',        vapi: 'Non' },
  { label: 'Base de connaissances', voixia: 'Inclus',     retell: 'Non',        vapi: 'Basique' },
  { label: 'Prix / minute',        voixia: '0.08 \u20ac', retell: '~0.12 $',   vapi: '~0.15 $' },
  { label: 'Hebergement',          voixia: 'EU (France)', retell: 'US',         vapi: 'US' },
  { label: 'Support francais',     voixia: 'Oui',         retell: 'Non',        vapi: 'Non' },
  { label: 'RGPD natif',           voixia: 'Oui',         retell: 'Partiel',    vapi: 'Partiel' },
];

// ─── Page principale ─────────────────────────────────────────────────────────

export default function VoixIAPage() {
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ═══ NAV ═══════════════════════════════════════════════════════════ */}
      <nav className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/voixia" className="text-xl font-bold">
            Voix<span className="text-emerald-400">IA</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#compare" className="hover:text-white transition-colors">Comparatif</a>
            <a href="#partners" className="hover:text-white transition-colors">Partenaires</a>
            <Link href="/" className="hover:text-white transition-colors">Coccinelle.ai</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-sm text-gray-400 hover:text-white transition-colors">
              Connexion
            </Link>
            <button
              onClick={() => setShowPartnerForm(true)}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors text-sm font-medium"
            >
              Devenir partenaire
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium mb-6">
            <Zap className="w-3 h-3" />
            API REST + SIP + WebSocket
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            L&apos;infrastructure vocale IA
            <br />
            <span className="text-emerald-400">pour les professionnels.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            20 voix francaises natives, latence sub-500ms, telephonie SIP integree.
            Deployez un agent vocal IA conversationnel en 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors font-medium flex items-center gap-2"
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:border-gray-500 hover:text-white transition-colors font-medium"
            >
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═════════════════════════════════════════════════════ */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '20',     label: 'Voix FR natives',     icon: Mic },
              { value: '<500ms', label: 'Latence moyenne',     icon: Zap },
              { value: 'FR',     label: 'Hebergement Europe',  icon: Globe },
              { value: '99.9%',  label: 'SLA disponibilite',   icon: Shield },
            ].map((stat, i) => (
              <div key={i}>
                <stat.icon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING PAY-AS-YOU-GO ═════════════════════════════════════════ */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Tarifs pay-as-you-go</h2>
            <p className="text-gray-400">Payez uniquement ce que vous consommez. Sans engagement.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1">Starter</h3>
              <p className="text-sm text-gray-500 mb-4">Pour tester et prototyper</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">Gratuit</span>
                <p className="text-xs text-gray-500 mt-1">100 minutes incluses</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-400">
                {[
                  '0.12 \u20ac/min apres 100 min',
                  '0.07 \u20ac/SMS',
                  '2 voix simultanees',
                  '20 voix FR disponibles',
                  'API REST + WebSocket',
                  'Retention 30 jours',
                  'Support email',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:border-emerald-500 hover:text-emerald-400 transition-colors font-medium text-sm"
              >
                Commencer
              </Link>
            </div>

            {/* Pro — populaire */}
            <div className="bg-gray-900 border-2 border-emerald-500/50 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-xs font-medium rounded-full">
                Populaire
              </div>
              <h3 className="text-lg font-semibold mb-1">Pro</h3>
              <p className="text-sm text-gray-500 mb-4">Pour les integrateurs</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">0.08</span>
                <span className="text-gray-500 text-sm"> \u20ac/min</span>
                <p className="text-xs text-gray-500 mt-1">500 minutes incluses/mois</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-400">
                {[
                  '0.08 \u20ac/min (tarif volume)',
                  '0.05 \u20ac/SMS',
                  '10 voix simultanees',
                  'Toutes les voix FR',
                  'API + SIP + WebSocket',
                  'Retention 90 jours',
                  'Support prioritaire',
                  'SLA 99.9%',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors font-medium text-sm"
              >
                Commencer
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
              <p className="text-sm text-gray-500 mb-4">Infrastructure dediee</p>
              <div className="mb-6">
                <span className="text-3xl font-bold">Sur mesure</span>
                <p className="text-xs text-gray-500 mt-1">Tarifs volume negocies</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-gray-400">
                {[
                  'Tarifs volume sur mesure',
                  'SMS illimites',
                  'Voix simultanees illimitees',
                  'Voix custom (clone)',
                  'Infra dediee EU',
                  'Retention illimitee',
                  'Account manager dedie',
                  'SLA 99.99%',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowPartnerForm(true)}
                className="block w-full text-center px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg hover:border-emerald-500 hover:text-emerald-400 transition-colors font-medium text-sm"
              >
                Nous contacter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMPARATIF VoixIA vs Retell vs VAPI ═══════════════════════════ */}
      <section id="compare" className="py-20 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">VoixIA vs la concurrence</h2>
            <p className="text-gray-400">Comparaison objective des plateformes vocales IA</p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 pr-4 text-gray-500 font-medium w-1/4" />
                  <th className="py-4 px-4 text-center">
                    <span className="text-emerald-400 font-bold">VoixIA</span>
                  </th>
                  <th className="py-4 px-4 text-center text-gray-400">Retell</th>
                  <th className="py-4 px-4 text-center text-gray-400">VAPI</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-3 pr-4 text-gray-400">{row.label}</td>
                    <td className="py-3 px-4 text-center font-medium text-white">{row.voixia}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.retell}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.vapi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {COMPARE_ROWS.map((row, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">{row.label}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="text-emerald-400 font-medium">{row.voixia}</p>
                    <p className="text-[10px] text-gray-600">VoixIA</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">{row.retell}</p>
                    <p className="text-[10px] text-gray-600">Retell</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400">{row.vapi}</p>
                    <p className="text-[10px] text-gray-600">VAPI</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROGRAMME PARTENAIRE ══════════════════════════════════════════ */}
      <section id="partners" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Programme partenaire</h2>
            <p className="text-gray-400">Integrez VoixIA dans votre offre et developpez votre activite</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                tier: 'Silver',
                subtitle: 'Revendeur',
                color: 'text-gray-400',
                border: 'border-gray-700',
                commission: '10%',
                features: [
                  'Acces API complet',
                  'Commission 10% recurrente',
                  'Support technique email',
                  'Documentation complete',
                  'Dashboard partenaire',
                ],
              },
              {
                tier: 'Gold',
                subtitle: 'Integrateur',
                color: 'text-amber-400',
                border: 'border-amber-500/30',
                commission: '20%',
                features: [
                  'Tout Silver +',
                  'Commission 20% recurrente',
                  'White-label disponible',
                  'Support prioritaire',
                  'Co-marketing',
                  'Formation technique',
                ],
              },
              {
                tier: 'Platinum',
                subtitle: 'Partenaire strategique',
                color: 'text-emerald-400',
                border: 'border-emerald-500/30',
                commission: '30%',
                features: [
                  'Tout Gold +',
                  'Commission 30% recurrente',
                  'Infrastructure dediee',
                  'Account manager dedie',
                  'Acces roadmap produit',
                  'SLA garanti 99.99%',
                ],
              },
            ].map((plan, i) => (
              <div key={i} className={`bg-gray-900 border ${plan.border} rounded-xl p-6`}>
                <div className="mb-4">
                  <h3 className={`text-lg font-bold ${plan.color}`}>{plan.tier}</h3>
                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                </div>
                <p className="text-3xl font-bold mb-6">
                  {plan.commission}
                  <span className="text-sm text-gray-500 font-normal"> commission</span>
                </p>
                <ul className="space-y-3 mb-6 text-sm text-gray-400">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowPartnerForm(true)}
                  className={`block w-full text-center px-4 py-2.5 border ${plan.border} text-gray-300 rounded-lg hover:border-emerald-500 hover:text-emerald-400 transition-colors font-medium text-sm`}
                >
                  Postuler
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═════════════════════════════════════════════════════ */}
      <section className="py-16 border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Pret a integrer la voix IA ?
          </h2>
          <p className="text-gray-400 mb-8">
            Creez votre compte gratuitement. 100 minutes offertes, sans carte bancaire.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors font-medium flex items-center gap-2"
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowPartnerForm(true)}
              className="px-6 py-3 border border-gray-700 text-gray-300 rounded-lg hover:border-gray-500 hover:text-white transition-colors font-medium"
            >
              Devenir partenaire
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Voix<span className="text-emerald-400">IA</span></span>
            <span>par <Link href="/" className="text-gray-400 hover:text-white transition-colors">Coccinelle.ai</Link></span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions legales</Link>
            <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/legal/politique-confidentialite" className="hover:text-white transition-colors">Confidentialite</Link>
          </div>
        </div>
      </footer>

      {/* ═══ MODALE — Devenir partenaire ═══════════════════════════════════ */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h3 className="font-semibold text-white">Devenir partenaire</h3>
                <p className="text-xs text-gray-500">Nous vous recontactons sous 24h</p>
              </div>
              <button
                onClick={() => { setShowPartnerForm(false); setFormSubmitted(false); }}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {formSubmitted ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="font-semibold text-white mb-2">Demande envoyee</h4>
                <p className="text-sm text-gray-400">Notre equipe vous recontactera sous 24h.</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 space-y-4">
                  {[
                    { id: 'name',    label: 'Nom complet',         type: 'text',  placeholder: 'Jean Dupont' },
                    { id: 'email',   label: 'Email professionnel', type: 'email', placeholder: 'jean@entreprise.fr' },
                    { id: 'company', label: 'Entreprise',          type: 'text',  placeholder: 'Nom de votre entreprise' },
                    { id: 'phone',   label: 'Telephone',           type: 'tel',   placeholder: '+33 6 ...' },
                  ].map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-400 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={formData[field.id as keyof typeof formData]}
                        onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Message (optionnel)</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      placeholder="Decrivez votre projet..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
                  <button
                    onClick={() => setShowPartnerForm(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setFormSubmitted(true)}
                    disabled={!formData.name || !formData.email}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors text-sm font-medium disabled:opacity-50 disabled:hover:bg-emerald-500"
                  >
                    Envoyer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
