import Link from 'next/link';
import {
  Mic, BookOpen, Package, Calendar, MessageSquare, Users,
  Phone, HelpCircle, ShoppingBag, BarChart3, Check, ArrowRight,
  Building2, Heart, UtensilsCrossed, Car, Scissors, Scale, Calculator, Stethoscope,
  Star, Minus,
} from 'lucide-react';
import LandingNav from '@/components/LandingNav';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

const steps = [
  { icon: Phone, num: '1', title: 'Il appelle', desc: 'Reponse en 2 secondes, voix naturelle, sans SVI' },
  { icon: HelpCircle, num: '2', title: 'Il pose une question', desc: "L'agent consulte votre base de connaissances" },
  { icon: ShoppingBag, num: '3', title: 'Il veut un produit', desc: "L'agent connait votre catalogue et vos prix" },
  { icon: Calendar, num: '4', title: 'Il veut un RDV', desc: 'Reservation en direct dans votre agenda' },
  { icon: MessageSquare, num: '5', title: 'Il raccroche', desc: 'Confirmation SMS, WhatsApp ou email automatique' },
  { icon: BarChart3, num: '6', title: 'Vous', desc: "Prospect dans le CRM, RDV dans l'agenda, resume dans le dashboard" },
];

const modules = [
  { icon: Mic, title: 'Agent vocal IA', desc: 'Repond 24h/24, voix naturelle, sans SVI' },
  { icon: BookOpen, title: 'Base de connaissances', desc: 'Repond precisement a toutes vos questions clients' },
  { icon: Package, title: 'Catalogue produits', desc: 'Presente vos offres, prix et disponibilites' },
  { icon: Calendar, title: 'Agenda & RDV', desc: 'Prend et confirme les rendez-vous en direct' },
  { icon: MessageSquare, title: 'Multicanal', desc: 'Voix, SMS, WhatsApp, Email — tout en un' },
  { icon: Users, title: 'CRM integre', desc: 'Chaque appel cree un contact et un historique' },
];

const sectors = [
  { icon: Building2, label: 'Immobilier' },
  { icon: Heart, label: 'Sante' },
  { icon: UtensilsCrossed, label: 'Restaurant' },
  { icon: Car, label: 'Automobile' },
  { icon: Scissors, label: 'Beaute' },
  { icon: Scale, label: 'Notaire' },
  { icon: Calculator, label: 'Comptable' },
  { icon: Stethoscope, label: 'Veterinaire' },
];

const testimonials = [
  {
    quote: "Depuis que j'utilise VoixIA, je ne rate plus aucun appel le week-end. Mon agent repond, qualifie les prospects et prend les rendez-vous de visite automatiquement.",
    name: 'Marie D.',
    role: 'Agence immobiliere, Lyon',
    initials: 'MD',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    quote: "Mes patients peuvent prendre rendez-vous a n'importe quelle heure. La secretaire IA repond en 2 secondes, c'est bluffant.",
    name: 'Dr. Philippe M.',
    role: 'Medecin generaliste, Toulouse',
    initials: 'PM',
    color: 'bg-green-100 text-green-700',
  },
  {
    quote: "On recoit 40 appels par soir pour des reservations. L'agent gere tout, je me concentre sur la cuisine.",
    name: 'Karim B.',
    role: 'Restaurant, Paris',
    initials: 'KB',
    color: 'bg-amber-100 text-amber-700',
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
            "description": "Agent vocal IA omnicanal pour PME francaises",
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
                La relation client des grands groupes
              </h1>
              <p className="mt-4 text-xl sm:text-2xl font-semibold text-gray-900">
                Sans SVI. Multicanal. Des 79&#8239;euros/mois.
              </p>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                Votre agent vocal repond 24h/24, connait vos services,
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
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Voir la demo
                </a>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="ml-3 text-xs text-gray-400">coccinelle.ai</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Appel en cours</div>
                      <div className="text-xs text-gray-500">Marie Lambert — 06 12 34 56 78</div>
                    </div>
                    <div className="ml-auto text-xs font-mono text-gray-400">1:23</div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="bg-gray-100 rounded-xl px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-gray-700">Bonjour, est-ce que je peux prendre rendez-vous pour vendredi ?</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl px-4 py-3 max-w-[85%] ml-auto">
                      <p className="text-sm text-white">Bien sur ! J&apos;ai un creneau disponible vendredi a 14h. Je vous le reserve ?</p>
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-600">RDV reserve — Vendredi 14h00</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-600">SMS de confirmation envoye</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-600">Contact ajoute au CRM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <div className="text-5xl font-bold text-gray-900 mb-3">7</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">appels manques par jour</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                En moyenne, hors horaires d&apos;ouverture. Autant de clients qui appellent un concurrent.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-3">68%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">raccrochent sur un SVI</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                &laquo;&nbsp;Tapez 1, tapez 2, tapez 3...&nbsp;&raquo; Vos clients meritent mieux qu&apos;un robot des annees 90.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-900 mb-3">3 ans</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">de CA envoles</div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Un client perdu, c&apos;est 3 ans de chiffre d&apos;affaires qui partent chez un concurrent.
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
              De l&apos;appel entrant au compte-rendu dans votre dashboard, tout est gere.
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
              Six modules integres. Zero integration a faire.
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
            Pour toutes les PME francaises
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {sectors.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col items-center gap-3 p-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 5b — TEMOIGNAGES ──────────── */}
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Ils ont choisi Coccinelle.ai
            </h2>
            <p className="text-lg text-gray-600">
              Des PME francaises qui ne ratent plus un appel
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col">
                {/* Quote icon */}
                <div className="text-4xl text-gray-200 leading-none mb-3 font-serif">&ldquo;</div>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">
                  {t.quote}
                </p>
                {/* Stars */}
                <div className="flex gap-0.5 mt-4 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
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
              <p className="text-sm text-gray-500 mb-6">Pour demarrer</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-gray-900">79&#8239;euros</span>
                <span className="text-gray-500">/mois HT</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '500 minutes vocales IA',
                  '1 agent vocal',
                  'Base de connaissances',
                  'Agenda & rendez-vous',
                  'CRM contacts',
                  'Confirmations SMS',
                  'Support email (48h)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mb-4">Depassement : 0,08 euros/min</p>
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
              <p className="text-sm text-gray-400 mb-6">Pour les equipes</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">199&#8239;euros</span>
                <span className="text-gray-400">/mois HT</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  '1 000 minutes vocales IA',
                  '250 SMS inclus',
                  'Tout Essentiel +',
                  'WhatsApp (bientot) + Email',
                  'CRM complet + export',
                  'Catalogue produits',
                  'Analytics avances',
                  'Roles et permissions',
                  'Support prioritaire (24h)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mb-4">Depassement : 0,07 euros/min &middot; 0,10 euros/SMS</p>
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
                  'Minutes personnalisees',
                  'Utilisateurs illimites',
                  'Tout Pro +',
                  'Voix personnalisee',
                  'SLA garanti',
                  'Account manager dedie (4h)',
                  'API et integrations sur mesure',
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

          {/* ── Plans Digital ── */}
          <div className="mt-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gray-200" />
              <p className="text-sm font-medium text-gray-500 whitespace-nowrap">
                Vous n&apos;avez pas besoin de voix ?
              </p>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Plans Digital — Sans agent vocal</h3>
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
                  <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-dela</p>
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
                  <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-dela</p>
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
                  <p className="text-xs text-gray-400 mb-3">0,15&#8239;&#8364;/SMS au-dela &middot; WhatsApp bientot disponible</p>
                  <Link href="/signup" className="block w-full text-center px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                    Commencer
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Tarifs */}
          <div className="max-w-3xl mx-auto mt-16">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-8">Questions frequentes</h3>
            <div className="space-y-6">
              <div>
                <p className="font-medium text-gray-900 text-sm">Que se passe-t-il si je depasse mon forfait de minutes ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Les minutes supplementaires sont facturees au tarif de depassement de votre plan (0,08 euros/min Essentiel, 0,07 euros/min Pro). Vous etes prevenu par email a 80% et 100% de votre quota.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Puis-je changer de plan a tout moment ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Oui, vous pouvez passer d&apos;Essentiel a Pro (ou inversement) a tout moment. La facturation est ajustee au prorata.
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">L&apos;essai gratuit est-il vraiment sans engagement ?</p>
                <p className="text-sm text-gray-600 mt-1">
                  Oui. 14 jours, 60 minutes vocales et 20 SMS inclus, sans carte bancaire. Vos donnees sont conservees 30 jours apres expiration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── SECTION 7 — HISTOIRE FONDATEUR ──────────── */}
      <section id="a-propos" className="py-20 lg:py-24 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-10">
            Pourquoi Coccinelle.ai ?
          </h2>
          <blockquote className="text-lg sm:text-xl text-gray-300 leading-relaxed mb-8">
            &laquo;&nbsp;Apres 25 ans dans la relation client, j&apos;ai vu les grands groupes offrir
            des experiences fluides pendant que les PME restaient coincees avec des SVI
            des annees 90. J&apos;ai voulu changer ca. Pas pour quelques grands comptes —
            pour tous. Le plombier a Toulouse, le kine a Bordeaux, l&apos;agence immo a Lyon.
            Coccinelle.ai c&apos;est la democratisation de la relation client.&nbsp;&raquo;
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">YA</span>
            </div>
            <div className="text-left">
              <div className="text-white font-semibold">Youssef Amrouche</div>
              <div className="text-sm text-gray-400">Fondateur</div>
            </div>
          </div>
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
            14 jours d&apos;essai gratuit &middot; Annulation a tout moment
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
              <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions legales</Link>
              <Link href="/legal/politique-confidentialite" className="hover:text-white transition-colors">Confidentialite</Link>
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
              Heberge en France &middot; Donnees en Europe
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
