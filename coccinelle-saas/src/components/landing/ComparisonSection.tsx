import { XIcon, CheckIcon } from './icons';

interface ComparisonRow {
  before: string;
  after: string;
}

const comparisons: ComparisonRow[] = [
  {
    before: "30% d'appels manques",
    after: "0% d'appels perdus — l'assistant repond 24/7",
  },
  {
    before: 'Secretariat a 2 000 EUR/mois',
    after: 'A partir de 79 EUR/mois tout compris',
  },
  {
    before: 'Prise de RDV manuelle',
    after: 'RDV pris et confirmes automatiquement',
  },
  {
    before: 'Prospects perdus dans des cahiers',
    after: 'CRM centralise avec scoring intelligent',
  },
  {
    before: "Aucune visibilite sur l'activite",
    after: 'Analytics et recap hebdomadaire par email',
  },
  {
    before: '5 outils differents (tel + SMS + email + agenda + CRM)',
    after: 'Une seule plateforme unifiee',
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
