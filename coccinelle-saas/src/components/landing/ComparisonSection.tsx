import { XIcon, CheckIcon } from './icons';

interface ComparisonRow {
  before: string;
  after: string;
}

const comparisons: ComparisonRow[] = [
  {
    before: 'Vos prospects sont notes sur un carnet ou un fichier Excel',
    after: 'Tous vos contacts sont centralises et classes automatiquement',
  },
  {
    before: 'Vous manquez 30% des appels quand vous etes occupe',
    after: 'Un assistant vocal repond a votre place 24h/24',
  },
  {
    before: 'Les clients prennent RDV par telephone, avec des allers-retours',
    after: 'Une page de reservation en ligne accessible 24h/24',
  },
  {
    before: 'Vos messages sont disperses entre telephone, SMS et email',
    after: 'Tous vos echanges regroupes dans une seule boite de reception',
  },
  {
    before: 'Vous envoyez les rappels de RDV a la main (ou vous oubliez)',
    after: 'Confirmations et rappels envoyes automatiquement par SMS',
  },
  {
    before: 'Vous n\'avez aucune vue d\'ensemble sur votre activite',
    after: 'Un tableau de bord en temps reel et un recapitulatif chaque lundi',
  },
];

export default function ComparisonSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi Coccinelle ?
          </h2>
          <p className="text-lg text-gray-600">
            Comparez votre quotidien avant et apres
          </p>
        </div>

        {/* Header */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 mb-4 px-4">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
              <XIcon className="w-4 h-4" />
              Avant
            </span>
          </div>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-[#0F6E56] rounded-full text-sm font-semibold">
              <CheckIcon className="w-4 h-4" />
              Avec Coccinelle
            </span>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {comparisons.map((row, i) => (
            <div
              key={i}
              className="grid md:grid-cols-2 gap-3 md:gap-6"
            >
              {/* Before */}
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-red-100">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                  <XIcon className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-gray-700 text-sm">{row.before}</span>
              </div>

              {/* After */}
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-emerald-100">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5 text-[#0F6E56]" />
                </div>
                <span className="text-gray-700 text-sm font-medium">{row.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
