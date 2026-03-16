import {
  MicIcon,
  FileTextIcon,
  ClockIcon,
  InboxIcon,
  SettingsIcon,
  SwitchIcon,
  UsersIcon,
  CalendarIcon,
  GlobeIcon,
  ShoppingBagIcon,
  BookOpenIcon,
  BarChartIcon,
} from './icons';

interface FeatureCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface FeatureGroup {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  iconBg: string;
  cards: FeatureCard[];
}

const featureGroups: FeatureGroup[] = [
  {
    label: 'Votre assistant vocal IA',
    color: 'text-[#D85A30]',
    borderColor: 'border-l-[#D85A30]',
    bgColor: 'bg-orange-50',
    iconBg: 'bg-orange-100 text-[#D85A30]',
    cards: [
      {
        icon: MicIcon,
        title: 'Assistant vocal IA',
        description:
          'Repond aux appels 24/7, qualifie les prospects, prend les RDV et envoie des confirmations en temps reel.',
      },
      {
        icon: FileTextIcon,
        title: 'Historique des appels',
        description:
          'Chaque appel transcrit, resume et analyse (sentiment, duree, resultat).',
      },
      {
        icon: ClockIcon,
        title: 'Horaires intelligents',
        description:
          "L'assistant adapte son discours : prise de RDV en heures ouvrees, collecte de coordonnees hors horaires.",
      },
    ],
  },
  {
    label: 'Tous vos canaux, une seule boite',
    color: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-600',
    cards: [
      {
        icon: InboxIcon,
        title: 'Inbox omnicanal',
        description:
          'Appels, SMS, email et WhatsApp regroupes dans un fil unique par contact.',
      },
      {
        icon: SettingsIcon,
        title: 'Canaux configurables',
        description:
          'Activez telephone, SMS, email Gmail/Outlook, WhatsApp en quelques clics.',
      },
      {
        icon: SwitchIcon,
        title: 'Channel switching',
        description:
          "L'assistant peut envoyer un SMS ou email pendant un appel vocal.",
      },
    ],
  },
  {
    label: 'Gestion commerciale automatisee',
    color: 'text-[#0F6E56]',
    borderColor: 'border-l-[#0F6E56]',
    bgColor: 'bg-emerald-50',
    iconBg: 'bg-emerald-100 text-[#0F6E56]',
    cards: [
      {
        icon: UsersIcon,
        title: 'CRM et prospects',
        description:
          'Deduplication automatique, scoring IA, conversion prospect vers client en 1 clic.',
      },
      {
        icon: CalendarIcon,
        title: 'Rendez-vous',
        description:
          'Calendrier, types de RDV avec durees, rappels automatiques, confirmations unifiees.',
      },
      {
        icon: GlobeIcon,
        title: 'Page de reservation publique',
        description:
          'Vos clients prennent RDV en ligne 24h/24, lien partageable type Calendly.',
      },
    ],
  },
  {
    label: 'Tout pour piloter votre activite',
    color: 'text-violet-600',
    borderColor: 'border-l-violet-500',
    bgColor: 'bg-violet-50',
    iconBg: 'bg-violet-100 text-violet-600',
    cards: [
      {
        icon: ShoppingBagIcon,
        title: 'Produits et services',
        description:
          "Catalogue avec durees et prix, utilise par l'assistant pour repondre.",
      },
      {
        icon: BookOpenIcon,
        title: 'Base de connaissances',
        description:
          'Crawl automatique de votre site, import PDF, FAQ sur mesure.',
      },
      {
        icon: BarChartIcon,
        title: 'Analytics et rapports',
        description:
          'Tableaux de bord, tendances, export CSV, email recap hebdomadaire.',
      },
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-lg sm:text-xl text-gray-600">
            Une plateforme complete pour gerer votre relation client
          </p>
        </div>

        <div className="space-y-12">
          {featureGroups.map((group) => (
            <div key={group.label}>
              <div className={`flex items-center gap-3 mb-6`}>
                <div className={`w-1 h-8 rounded-full ${group.borderColor} border-l-4`} />
                <h3 className={`text-xl font-bold ${group.color}`}>
                  {group.label}
                </h3>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {group.cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className={`rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-shadow ${group.bgColor}/30`}
                    >
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${group.iconBg}`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {card.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
