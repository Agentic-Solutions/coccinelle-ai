import {
  MicIcon,
  FileTextIcon,
  ClockIcon,
  InboxIcon,
  SwitchIcon,
  UsersIcon,
  CalendarIcon,
  GlobeIcon,
  ShoppingBagIcon,
  BookOpenIcon,
  BellIcon,
  UploadIcon,
  MessageCircleIcon,
  SearchIcon,
  HelpCircleIcon,
  MailIcon,
  HomeIcon,
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
    label: 'Gestion de vos contacts',
    color: 'text-[#185FA5]',
    borderColor: 'border-l-[#185FA5]',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100 text-[#185FA5]',
    cards: [
      {
        icon: UsersIcon,
        title: 'Fiches prospects et clients',
        description:
          'Chaque personne qui vous contacte est automatiquement enregistrée avec son nom, téléphone et email. Les doublons sont détectés et fusionnés. Vous retrouvez tout l\'historique en un clic.',
      },
      {
        icon: ClockIcon,
        title: 'Suivi de chaque contact',
        description:
          'Pour chaque prospect, vous voyez la date du dernier échange, le canal utilisé et le prochain rappel prévu. Vous savez exactement où vous en êtes avec chacun.',
      },
      {
        icon: UploadIcon,
        title: 'Import et export',
        description:
          'Importez vos contacts existants depuis un fichier Excel ou CSV. Exportez vos données à tout moment. Vos informations vous appartiennent.',
      },
    ],
  },
  {
    label: 'Rendez-vous et réservation',
    color: 'text-[#0F6E56]',
    borderColor: 'border-l-[#0F6E56]',
    bgColor: 'bg-emerald-50',
    iconBg: 'bg-emerald-100 text-[#0F6E56]',
    cards: [
      {
        icon: CalendarIcon,
        title: 'Agenda intelligent',
        description:
          'Calendrier visuel avec vue jour, semaine et mois. Créez vos types de rendez-vous (consultation, coupe, visite...) avec la durée correspondante.',
      },
      {
        icon: BellIcon,
        title: 'Confirmations et rappels automatiques',
        description:
          'Dès qu\'un RDV est pris, votre client reçoit un SMS de confirmation. Un rappel est envoyé la veille et 1 heure avant. Les SMS sont inclus dans votre abonnement.',
      },
      {
        icon: GlobeIcon,
        title: 'Page de réservation en ligne',
        description:
          'Vos clients prennent RDV directement depuis un lien personnalisé, 24h/24, sans vous appeler. Partagez ce lien sur votre site, Google ou Instagram.',
      },
    ],
  },
  {
    label: 'Tous vos messages au même endroit',
    color: 'text-[#534AB7]',
    borderColor: 'border-l-[#534AB7]',
    bgColor: 'bg-violet-50',
    iconBg: 'bg-violet-100 text-[#534AB7]',
    cards: [
      {
        icon: InboxIcon,
        title: 'Boîte de réception unifiée',
        description:
          'Retrouvez tous vos échanges avec un client dans un seul fil : appels, SMS, emails, WhatsApp. Plus besoin de chercher dans 5 applications différentes.',
      },
      {
        icon: MessageCircleIcon,
        title: '6 canaux intégrés',
        description:
          'Téléphone, SMS, Email (Gmail, Outlook), WhatsApp. Activez chaque canal en quelques clics. Vos clients vous contactent comme ils préfèrent.',
      },
      {
        icon: BellIcon,
        title: 'Notifications en temps réel',
        description:
          'Nouveau message, RDV confirmé, appel manqué : vous êtes prévenu instantanément.',
      },
    ],
  },
  {
    label: 'Votre catalogue de produits et services',
    color: 'text-[#854F0B]',
    borderColor: 'border-l-[#854F0B]',
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100 text-[#854F0B]',
    cards: [
      {
        icon: ShoppingBagIcon,
        title: 'Gérez votre offre',
        description:
          'Ajoutez vos services (coupe, coloration, consultation...) avec leur durée et leur prix. Organisez-les par catégorie. Modifiez à tout moment.',
      },
      {
        icon: MicIcon,
        title: 'Votre assistant connaît votre catalogue',
        description:
          'Quand un client demande "Combien coûte une coloration ?", l\'assistant répond avec le bon tarif et peut proposer un créneau adapté à la durée du service.',
      },
      {
        icon: UploadIcon,
        title: 'Plusieurs méthodes d\'ajout',
        description:
          'Importez un fichier, laissez l\'outil analyser votre site web automatiquement, ou saisissez vos services à la main. Comme vous préférez.',
      },
    ],
  },
  {
    label: 'Assistant vocal intelligent',
    color: 'text-[#D85A30]',
    borderColor: 'border-l-[#D85A30]',
    bgColor: 'bg-orange-50',
    iconBg: 'bg-orange-100 text-[#D85A30]',
    cards: [
      {
        icon: MicIcon,
        title: 'Réponse automatique 24h/24',
        description:
          'Un assistant répond à vos appels quand vous êtes occupé ou en dehors de vos horaires. Il se présente au nom de votre entreprise, avec un message d\'accueil que vous personnalisez.',
      },
      {
        icon: CalendarIcon,
        title: 'Prise de RDV par téléphone',
        description:
          'L\'assistant consulte votre agenda et votre catalogue, identifie le besoin du client et réserve un créneau en temps réel. Votre client reçoit une confirmation par SMS dans la seconde.',
      },
      {
        icon: SwitchIcon,
        title: 'Envoi de SMS ou email pendant l\'appel',
        description:
          'L\'assistant peut envoyer un récapitulatif, un lien de réservation ou des informations complémentaires par SMS ou email pendant la conversation téléphonique.',
      },
    ],
  },
  {
    label: 'Base de connaissances',
    color: 'text-[#993556]',
    borderColor: 'border-l-[#993556]',
    bgColor: 'bg-pink-50',
    iconBg: 'bg-pink-100 text-[#993556]',
    cards: [
      {
        icon: SearchIcon,
        title: 'Votre site analysé automatiquement',
        description:
          'Indiquez l\'adresse de votre site web et l\'outil extrait automatiquement vos services, horaires, tarifs et informations utiles. En 2 minutes, l\'assistant sait tout.',
      },
      {
        icon: FileTextIcon,
        title: 'Ajoutez vos propres documents',
        description:
          'Importez des fichiers PDF (brochure, menu, tarifs) ou créez des questions-réponses manuellement. Vous gardez le contrôle sur ce que l\'assistant sait.',
      },
      {
        icon: BookOpenIcon,
        title: 'Réponses précises',
        description:
          'Quand un client demande "Vous êtes ouvert le samedi ?", "Comment venir chez vous ?" ou "Vous acceptez la carte ?", l\'assistant répond correctement. Sans improvisation.',
      },
    ],
  },
  {
    label: 'Pilotage et support',
    color: 'text-[#5F5E5A]',
    borderColor: 'border-l-[#5F5E5A]',
    bgColor: 'bg-gray-50',
    iconBg: 'bg-gray-200 text-[#5F5E5A]',
    cards: [
      {
        icon: HomeIcon,
        title: 'Tableau de bord',
        description:
          'Dès votre connexion, vous voyez l\'essentiel : appels du jour, rendez-vous prévus, nouveaux contacts, tendances. Tout est mis à jour en temps réel.',
      },
      {
        icon: MailIcon,
        title: 'Rapports et récapitulatifs',
        description:
          'Chaque lundi, vous recevez par email le bilan de votre semaine : nombre d\'appels, RDV pris, contacts ajoutés. Vous pouvez aussi exporter vos données en un clic.',
      },
      {
        icon: HelpCircleIcon,
        title: 'Aide et support intégré',
        description:
          'Une FAQ complète, un formulaire de contact et un suivi de vos demandes directement dans l\'application. Invitez vos collaborateurs et gérez leurs droits d\'accès simplement.',
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
            Une plateforme complète pour gérer votre activité au quotidien
          </p>
        </div>

        <div className="space-y-12">
          {featureGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-6">
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
