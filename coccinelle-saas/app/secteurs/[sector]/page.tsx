import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, ArrowLeft, Check, Phone, Calendar, FileText,
  HelpCircle, AlertCircle, Scissors, Bell, XCircle,
  Wrench, ClipboardList, UtensilsCrossed, BookOpen, Clock,
  type LucideIcon,
} from 'lucide-react';
import LandingNav from '@/components/LandingNav';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

// ─── Sector data ────────────────────────────────────────────────────────────────

interface UseCase {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface SectorData {
  slug: string;
  name: string;
  h1: string;
  subtitle: string;
  problem: string;
  stat: string;
  useCases: UseCase[];
  testimonial: {
    quote: string;
    author: string;
    role: string;
    city: string;
    initials: string;
  };
  metaTitle: string;
  metaDescription: string;
}

const SECTORS: Record<string, SectorData> = {
  immobilier: {
    slug: 'immobilier',
    name: 'Immobilier',
    h1: 'Agent vocal IA pour les agences immobili\u00e8res',
    subtitle: 'Ne ratez plus jamais un prospect qui appelle le week-end',
    problem:
      'Vos prospects appellent le week-end. Sans r\u00e9ponse en moins de 5 minutes, ils appellent le concurrent. Chaque appel manqu\u00e9 repr\u00e9sente un mandat potentiel perdu.',
    stat: '62% des appels en immobilier arrivent en dehors des heures de bureau',
    useCases: [
      {
        icon: Phone,
        title: 'Qualification prospect',
        description:
          'Votre agent identifie le type de bien recherch\u00e9, le budget et la zone g\u00e9ographique souhait\u00e9e avant m\u00eame que vous ne rappeliez.',
      },
      {
        icon: Calendar,
        title: 'Prise de RDV visite',
        description:
          'Le prospect choisit un cr\u00e9neau de visite directement avec l\u2019agent. Le rendez-vous appara\u00eet dans votre agenda.',
      },
      {
        icon: FileText,
        title: 'Estimation de bien',
        description:
          'L\u2019agent recueille les informations du bien (surface, localisation, \u00e9tat) et vous pr\u00e9pare un dossier complet.',
      },
    ],
    testimonial: {
      quote:
        'Depuis que j\u2019ai Coccinelle, je ne rate plus un seul prospect le week-end. Mon agent r\u00e9pond, qualifie et prend les RDV de visite automatiquement.',
      author: 'Marie D.',
      role: 'Agent immobilier',
      city: 'Toulouse',
      initials: 'MD',
    },
    metaTitle: 'Agent vocal IA pour agences immobili\u00e8res | Coccinelle.ai',
    metaDescription:
      'Ne ratez plus un prospect le week-end. Votre agent vocal IA qualifie les appels, prend les RDV de visite et alimente votre CRM 24h/24.',
  },
  sante: {
    slug: 'sante',
    name: 'Sant\u00e9',
    h1: 'Agent vocal IA pour les cabinets m\u00e9dicaux',
    subtitle: 'Vos patients prennent rendez-vous 24h/24, sans attente',
    problem:
      'Votre secr\u00e9tariat est d\u00e9bord\u00e9. Les patients rappellent 3 fois avant d\u2019avoir quelqu\u2019un. R\u00e9sultat : frustration, annulations et cr\u00e9neaux vides.',
    stat: '45% des patients qui n\u2019obtiennent pas de r\u00e9ponse changent de m\u00e9decin',
    useCases: [
      {
        icon: Calendar,
        title: 'Prise de RDV',
        description:
          'Vos patients r\u00e9servent un cr\u00e9neau \u00e0 toute heure. L\u2019agent v\u00e9rifie les disponibilit\u00e9s et confirme par SMS.',
      },
      {
        icon: HelpCircle,
        title: 'Questions fr\u00e9quentes',
        description:
          'Horaires, documents \u00e0 apporter, pr\u00e9paration aux examens : l\u2019agent r\u00e9pond aux questions courantes sans mobiliser votre \u00e9quipe.',
      },
      {
        icon: AlertCircle,
        title: 'Orientation urgences',
        description:
          'En cas d\u2019urgence, l\u2019agent oriente le patient vers le bon service ou transfert directement vers le praticien de garde.',
      },
    ],
    testimonial: {
      quote:
        'Mes patients peuvent prendre rendez-vous \u00e0 n\u2019importe quelle heure. L\u2019agent r\u00e9pond en 2 secondes, c\u2019est bluffant.',
      author: 'Dr. Martin',
      role: 'M\u00e9decin g\u00e9n\u00e9raliste',
      city: 'Lyon',
      initials: 'DM',
    },
    metaTitle: 'Agent vocal IA pour cabinets m\u00e9dicaux | Coccinelle.ai',
    metaDescription:
      'Vos patients prennent RDV 24h/24 sans attente. Agent vocal IA pour cabinets m\u00e9dicaux : prise de RDV, FAQ, orientation urgences.',
  },
  beaute: {
    slug: 'beaute',
    name: 'Beaut\u00e9',
    h1: 'Agent vocal IA pour les salons de beaut\u00e9',
    subtitle: 'Chaque appel rat\u00e9 pendant un soin, c\u2019est un rendez-vous perdu',
    problem:
      'Impossible de d\u00e9crocher quand vous \u00eates en plein soin. Chaque appel rat\u00e9, c\u2019est un RDV perdu et un client qui va voir ailleurs.',
    stat: '8 appels manqu\u00e9s par jour en moyenne dans un salon de coiffure',
    useCases: [
      {
        icon: Scissors,
        title: 'R\u00e9servation praticien',
        description:
          'Vos clients r\u00e9servent avec le praticien de leur choix. L\u2019agent conna\u00eet les sp\u00e9cialit\u00e9s et disponibilit\u00e9s de chacun.',
      },
      {
        icon: Bell,
        title: 'Rappel J-1',
        description:
          'Un SMS de rappel automatique la veille du rendez-vous r\u00e9duit les no-shows de 40%.',
      },
      {
        icon: XCircle,
        title: 'Gestion annulations',
        description:
          'En cas d\u2019annulation, l\u2019agent propose le cr\u00e9neau lib\u00e9r\u00e9 aux clients en liste d\u2019attente.',
      },
    ],
    testimonial: {
      quote:
        'Je suis coiffeuse, les mains dans les cheveux toute la journ\u00e9e. Mon agent g\u00e8re les r\u00e9servations et les rappels. Plus aucun RDV oubli\u00e9.',
      author: 'Sophie L.',
      role: 'G\u00e9rante de salon',
      city: 'Paris',
      initials: 'SL',
    },
    metaTitle: 'Agent vocal IA pour salons de beaut\u00e9 | Coccinelle.ai',
    metaDescription:
      'Ne ratez plus un RDV pendant un soin. Agent vocal IA pour salons de beaut\u00e9 : r\u00e9servation, rappels J-1, gestion des annulations.',
  },
  automobile: {
    slug: 'automobile',
    name: 'Automobile',
    h1: 'Agent vocal IA pour les garages et concessions',
    subtitle: 'Votre standard ne sonne plus dans le vide',
    problem:
      'Votre standard sonne dans le vide quand vos techniciens sont sous les voitures. Les clients raccrocheront et iront chez le concurrent qui d\u00e9croche.',
    stat: '5 appels manqu\u00e9s par jour dans un garage ind\u00e9pendant',
    useCases: [
      {
        icon: Wrench,
        title: 'RDV entretien',
        description:
          'Vidange, r\u00e9vision, contr\u00f4le technique : l\u2019agent planifie l\u2019intervention et envoie un SMS de confirmation avec la date et l\u2019heure.',
      },
      {
        icon: ClipboardList,
        title: 'Suivi r\u00e9paration',
        description:
          'Vos clients appellent pour savoir o\u00f9 en est leur v\u00e9hicule. L\u2019agent consulte le statut et r\u00e9pond sans d\u00e9ranger vos m\u00e9caniciens.',
      },
      {
        icon: Bell,
        title: 'Notification v\u00e9hicule pr\u00eat',
        description:
          'D\u00e8s que le v\u00e9hicule est pr\u00eat, l\u2019agent pr\u00e9vient le client par SMS ou appel sortant automatiquement.',
      },
    ],
    testimonial: {
      quote:
        'Avant, on ratait la moiti\u00e9 des appels. Maintenant l\u2019agent prend les RDV d\u2019entretien et pr\u00e9vient les clients quand leur v\u00e9hicule est pr\u00eat.',
      author: 'Pascal M.',
      role: 'G\u00e9rant de garage',
      city: 'Bordeaux',
      initials: 'PM',
    },
    metaTitle: 'Agent vocal IA pour garages et concessions | Coccinelle.ai',
    metaDescription:
      'Votre standard ne sonne plus dans le vide. Agent vocal IA pour garages : RDV entretien, suivi r\u00e9paration, notification v\u00e9hicule pr\u00eat.',
  },
  juridique: {
    slug: 'juridique',
    name: 'Juridique',
    h1: 'Agent vocal IA pour les cabinets juridiques',
    subtitle: 'Chaque appel sans r\u00e9ponse entame la confiance de vos clients',
    problem:
      'Vos clients appellent en urgence. Chaque appel sans r\u00e9ponse entame leur confiance. Et un client qui doute change d\u2019avocat.',
    stat: '73% des clients choisissent un cabinet qui r\u00e9pond imm\u00e9diatement',
    useCases: [
      {
        icon: FileText,
        title: 'Qualification dossier',
        description:
          'L\u2019agent recueille les premi\u00e8res informations du dossier : type de litige, urgence, pi\u00e8ces disponibles.',
      },
      {
        icon: Calendar,
        title: 'RDV consultation',
        description:
          'Le client r\u00e9serve un cr\u00e9neau de consultation directement. L\u2019agent g\u00e8re votre agenda sans intervention.',
      },
      {
        icon: HelpCircle,
        title: 'Questions fr\u00e9quentes',
        description:
          'Tarifs des consultations, documents \u00e0 fournir, d\u00e9lais de proc\u00e9dure : l\u2019agent r\u00e9pond aux questions les plus courantes.',
      },
    ],
    testimonial: {
      quote:
        'Mes clients appellent souvent stress\u00e9s. L\u2019agent les accueille calmement, qualifie le dossier et prend le rendez-vous. Un vrai gain de s\u00e9r\u00e9nit\u00e9.',
      author: 'Me. Dubois',
      role: 'Avocate',
      city: 'Paris',
      initials: 'AD',
    },
    metaTitle: 'Agent vocal IA pour cabinets juridiques | Coccinelle.ai',
    metaDescription:
      'Ne perdez plus la confiance de vos clients. Agent vocal IA pour cabinets juridiques : qualification dossier, RDV consultation, FAQ.',
  },
  restaurant: {
    slug: 'restaurant',
    name: 'Restaurant',
    h1: 'Agent vocal IA pour les restaurants',
    subtitle:
      'Le t\u00e9l\u00e9phone sonne pendant le service. Vous ne pouvez pas d\u00e9crocher.',
    problem:
      'Le t\u00e9l\u00e9phone sonne pendant le service. Vous ne pouvez pas d\u00e9crocher. La r\u00e9servation part ailleurs.',
    stat: '40 appels par soir en moyenne pour un restaurant de 60 couverts',
    useCases: [
      {
        icon: UtensilsCrossed,
        title: 'R\u00e9servation table',
        description:
          'L\u2019agent g\u00e8re les r\u00e9servations : nombre de couverts, date, heure, demandes sp\u00e9ciales. Confirmation SMS automatique.',
      },
      {
        icon: BookOpen,
        title: 'Menu du jour',
        description:
          'Vos clients demandent le menu ? L\u2019agent conna\u00eet votre carte et les suggestions du chef.',
      },
      {
        icon: Clock,
        title: 'Allerg\u00e8nes et horaires',
        description:
          'Informations sur les allerg\u00e8nes, horaires d\u2019ouverture, acc\u00e8s PMR : l\u2019agent r\u00e9pond instantan\u00e9ment.',
      },
    ],
    testimonial: {
      quote:
        'On re\u00e7oit 40 appels par soir pour des r\u00e9servations. L\u2019agent g\u00e8re tout, je me concentre sur la cuisine.',
      author: 'Thomas R.',
      role: 'Restaurateur',
      city: 'Marseille',
      initials: 'TR',
    },
    metaTitle: 'Agent vocal IA pour restaurants | Coccinelle.ai',
    metaDescription:
      'Ne perdez plus de r\u00e9servations pendant le service. Agent vocal IA pour restaurants : r\u00e9servation table, menu du jour, allerg\u00e8nes.',
  },
};

// ─── Static params for SSG ──────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(SECTORS).map((sector) => ({ sector }));
}

// ─── Dynamic metadata ───────────────────────────────────────────────────────────

export function generateMetadata({
  params,
}: {
  params: { sector: string };
}): Metadata {
  const data = SECTORS[params.sector];
  if (!data) {
    return {
      title: 'Secteur introuvable | Coccinelle.ai',
      description: 'Cette page de secteur n\u2019existe pas.',
    };
  }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: `https://coccinelle.ai/secteurs/${data.slug}`,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `https://coccinelle.ai/secteurs/${data.slug}`,
      siteName: 'Coccinelle.ai',
      locale: 'fr_FR',
      type: 'website',
    },
  };
}

// ─── Page component ─────────────────────────────────────────────────────────────

export default function SectorPage({
  params,
}: {
  params: { sector: string };
}) {
  const data = SECTORS[params.sector];

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Secteur introuvable
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: data.metaTitle,
            description: data.metaDescription,
            url: `https://coccinelle.ai/secteurs/${data.slug}`,
            provider: {
              '@type': 'Organization',
              name: 'Agentic Solutions SASU',
              url: 'https://coccinelle.ai',
            },
            about: {
              '@type': 'Service',
              name: `Agent vocal IA pour ${data.name}`,
              description: data.metaDescription,
              provider: {
                '@type': 'Organization',
                name: 'Coccinelle.ai',
              },
            },
          }),
        }}
      />

      <LandingNav />

      {/* ──────────── HERO ──────────── */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour a l&apos;accueil
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
            {data.h1}
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            {data.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-700 transition-colors"
            >
              Essayer gratuitement
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-lg text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────── PROBLEME ──────────── */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-6">
            Le probl\u00e8me
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            {data.problem}
          </p>
          <div className="inline-block bg-white border border-gray-200 rounded-xl px-8 py-5">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Le saviez-vous ?
            </p>
            <p className="text-lg font-semibold text-gray-900">{data.stat}</p>
          </div>
        </div>
      </section>

      {/* ──────────── SOLUTION — USE CASES ──────────── */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center mb-4">
            Ce que fait votre agent vocal
          </h2>
          <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Configur\u00e9 pour votre m\u00e9tier, op\u00e9rationnel en 10 minutes
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {data.useCases.map((uc) => {
              const Icon = uc.icon;
              return (
                <div
                  key={uc.title}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {uc.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── FONCTIONNEMENT ──────────── */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Comment ca marche
          </h2>
          <div className="space-y-6">
            {[
              {
                num: '1',
                title: 'Votre client appelle',
                desc: 'L\u2019agent d\u00e9croche en 2 secondes avec une voix naturelle. Pas de SVI, pas d\u2019attente.',
              },
              {
                num: '2',
                title: 'Il pose sa question ou veut un rendez-vous',
                desc: 'L\u2019agent consulte votre base de connaissances et votre agenda pour r\u00e9pondre pr\u00e9cis\u00e9ment.',
              },
              {
                num: '3',
                title: 'Tout est enregistr\u00e9',
                desc: 'Contact dans le CRM, RDV dans l\u2019agenda, confirmation SMS et r\u00e9sum\u00e9 dans votre dashboard.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-6"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white text-sm font-bold flex-shrink-0">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── TEMOIGNAGE ──────────── */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 sm:p-10">
            <div className="text-5xl text-gray-200 leading-none mb-4 font-serif">
              &ldquo;
            </div>
            <blockquote className="text-lg sm:text-xl text-gray-700 leading-relaxed italic mb-8">
              {data.testimonial.quote}
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                {data.testimonial.initials}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {data.testimonial.author}
                </div>
                <div className="text-sm text-gray-500">
                  {data.testimonial.role}, {data.testimonial.city}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── AVANTAGES ──────────── */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-center mb-12">
            Pourquoi choisir Coccinelle.ai
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'R\u00e9ponse en 2 secondes, 24h/24, 7 jours sur 7',
              'Voix naturelle fran\u00e7aise, pas un SVI robotique',
              'Prise de RDV automatique dans votre agenda',
              'Confirmation SMS envoy\u00e9e au client',
              'Chaque appel cr\u00e9e un contact dans le CRM',
              'Base de connaissances personnalis\u00e9e pour votre m\u00e9tier',
              'Configuration en 10 minutes, sans comp\u00e9tence technique',
              'H\u00e9berg\u00e9 en France, donn\u00e9es en Europe',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4"
              >
                <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── CTA FINAL ──────────── */}
      <section className="py-16 lg:py-20 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Pr\u00eat a ne plus rater un seul appel ?
          </h2>
          <p className="text-lg text-gray-400 mb-10">
            Configurez votre agent vocal en 10 minutes
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Essayer gratuitement
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            14 jours gratuits &middot; Sans carte bancaire
          </p>
        </div>
      </section>

      {/* ──────────── AUTRES SECTEURS ──────────── */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 text-center mb-8">
            Autres secteurs
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {Object.values(SECTORS)
              .filter((s) => s.slug !== data.slug)
              .map((s) => (
                <Link
                  key={s.slug}
                  href={`/secteurs/${s.slug}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {s.name}
                </Link>
              ))}
          </div>
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
              <Link
                href="/legal/mentions-legales"
                className="hover:text-white transition-colors"
              >
                Mentions legales
              </Link>
              <Link
                href="/legal/politique-confidentialite"
                className="hover:text-white transition-colors"
              >
                Confidentialite
              </Link>
              <Link
                href="/legal/politique-cookies"
                className="hover:text-white transition-colors"
              >
                Cookies
              </Link>
              <Link
                href="/legal/cgu"
                className="hover:text-white transition-colors"
              >
                CGU
              </Link>
              <Link
                href="/legal/cgv"
                className="hover:text-white transition-colors"
              >
                CGV
              </Link>
              <a
                href="mailto:contact@coccinelle.ai"
                className="hover:text-white transition-colors"
              >
                Contact
              </a>
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
