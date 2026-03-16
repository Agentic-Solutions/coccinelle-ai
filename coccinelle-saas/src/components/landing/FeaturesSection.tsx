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
  BarChartIcon,
  BellIcon,
  UploadIcon,
  MessageCircleIcon,
  SearchIcon,
  HelpCircleIcon,
  MailIcon,
  HomeIcon,
  LinkIcon,
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
          'Chaque personne qui vous contacte est automatiquement enregistree avec son nom, telephone et email. Les doublons sont detectes et fusionnes. Vous retrouvez tout l\'historique en un clic.',
      },
      {
        icon: BarChartIcon,
        title: 'Classement automatique',
        description:
          'Vos contacts sont classes automatiquement : chaud (pret a acheter), tiede (interesse) ou froid (a relancer). Vous savez immediatement qui appeler en priorite.',
      },
      {
        icon: UploadIcon,
        title: 'Import et export',
        description:
          'Importez vos contacts existants depuis un fichier Excel ou CSV. Exportez vos donnees a tout moment. Vos informations vous appartiennent.',
      },
    ],
  },
  {
    label: 'Rendez-vous et reservation',
    color: 'text-[#0F6E56]',
    borderColor: 'border-l-[#0F6E56]',
    bgColor: 'bg-emerald-50',
    iconBg: 'bg-emerald-100 text-[#0F6E56]',
    cards: [
      {
        icon: CalendarIcon,
        title: 'Agenda intelligent',
        description:
          'Calendrier visuel avec vue jour, semaine et mois. Creez vos types de rendez-vous (consultation, coupe, visite...) avec la duree correspondante.',
      },
      {
        icon: BellIcon,
        title: 'Confirmations et rappels automatiques',
        description:
          'Des qu\'un RDV est pris, votre client recoit un SMS de confirmation. Un rappel est envoye la veille et 1 heure avant. Fini les oublis et les rendez-vous rates.',
      },
      {
        icon: GlobeIcon,
        title: 'Page de reservation en ligne',
        description:
          'Vos clients prennent RDV directement depuis un lien personnalise, 24h/24, sans vous appeler. Partagez ce lien sur votre site, Google ou Instagram.',
      },
    ],
  },
  {
    label: 'Tous vos messages au meme endroit',
    color: 'text-[#534AB7]',
    borderColor: 'border-l-[#534AB7]',
    bgColor: 'bg-violet-50',
    iconBg: 'bg-violet-100 text-[#534AB7]',
    cards: [
      {
        icon: InboxIcon,
        title: 'Boite de reception unifiee',
        description:
          'Retrouvez tous vos echanges avec un client dans un seul fil : appels, SMS, emails, WhatsApp. Plus besoin de chercher dans 5 applications differentes.',
      },
      {
        icon: MessageCircleIcon,
        title: '6 canaux integres',
        description:
          'Telephone, SMS, Email (Gmail, Outlook), WhatsApp. Activez chaque canal en quelques clics. Vos clients vous contactent comme ils preferent.',
      },
      {
        icon: BellIcon,
        title: 'Notifications en temps reel',
        description:
          'Nouveau message, RDV confirme, appel manque : vous etes prevenu instantanement.',
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
        title: 'Gerez votre offre',
        description:
          'Ajoutez vos services (coupe, coloration, consultation...) avec leur duree et leur prix. Organisez-les par categorie. Modifiez a tout moment.',
      },
      {
        icon: MicIcon,
        title: 'Votre assistant connait votre catalogue',
        description:
          'Quand un client demande "Combien coute une coloration ?", l\'assistant repond avec le bon tarif et peut proposer un creneau adapte a la duree du service.',
      },
      {
        icon: UploadIcon,
        title: 'Plusieurs methodes d\'ajout',
        description:
          'Importez un fichier, laissez l\'outil analyser votre site web automatiquement, ou saisissez vos services a la main. Comme vous preferez.',
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
        title: 'Reponse automatique 24h/24',
        description:
          'Un assistant repond a vos appels quand vous etes occupe ou en dehors de vos horaires. Il se presente au nom de votre entreprise, avec un message d\'accueil que vous personnalisez.',
      },
      {
        icon: CalendarIcon,
        title: 'Prise de RDV par telephone',
        description:
          'L\'assistant consulte votre agenda et votre catalogue, identifie le besoin du client et reserve un creneau en temps reel. Votre client recoit une confirmation par SMS dans la seconde.',
      },
      {
        icon: SwitchIcon,
        title: 'Envoi de SMS ou email pendant l\'appel',
        description:
          'L\'assistant peut envoyer un recapitulatif, un lien de reservation ou des informations complementaires par SMS ou email pendant la conversation telephonique.',
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
        title: 'Votre site analyse automatiquement',
        description:
          'Indiquez l\'adresse de votre site web et l\'outil extrait automatiquement vos services, horaires, tarifs et informations utiles. En 2 minutes, l\'assistant sait tout.',
      },
      {
        icon: FileTextIcon,
        title: 'Ajoutez vos propres documents',
        description:
          'Importez des fichiers PDF (brochure, menu, tarifs) ou creez des questions-reponses manuellement. Vous gardez le controle sur ce que l\'assistant sait.',
      },
      {
        icon: BookOpenIcon,
        title: 'Reponses precises',
        description:
          'Quand un client demande "Vous etes ouvert le samedi ?", "Comment venir chez vous ?" ou "Vous acceptez la carte ?", l\'assistant repond correctement. Sans improvisation.',
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
          'Des votre connexion, vous voyez l\'essentiel : appels du jour, rendez-vous prevus, nouveaux contacts, tendances. Tout est mis a jour en temps reel.',
      },
      {
        icon: MailIcon,
        title: 'Rapports et recapitulatifs',
        description:
          'Chaque lundi, vous recevez par email le bilan de votre semaine : nombre d\'appels, RDV pris, contacts ajoutes. Vous pouvez aussi exporter vos donnees en un clic.',
      },
      {
        icon: HelpCircleIcon,
        title: 'Aide et support integre',
        description:
          'Une FAQ complete, un formulaire de contact et un suivi de vos demandes directement dans l\'application. Invitez vos collaborateurs et gerez leurs droits d\'acces simplement.',
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
            Une plateforme complete pour gerer votre activite au quotidien
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
