import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'WhatsApp Business - Coccinelle.ai',
};

const features = [
  'Reponses automatiques par agent IA',
  'Prise de RDV via WhatsApp',
  'Confirmation par message',
  'Historique des conversations',
];

export default function WhatsAppPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">WhatsApp Business</h1>
              <p className="text-sm text-gray-500">Canal de messagerie instantanee</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
        <div className="text-center mb-8">
          {/* WhatsApp icon */}
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mb-4">
            Bientot disponible
          </span>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            WhatsApp Business
          </h2>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            L&apos;integration WhatsApp Business sera disponible prochainement.
            Vous pourrez connecter votre numero WhatsApp et repondre automatiquement
            a vos clients 24h/24.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Fonctionnalites prevues</h3>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-600">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disabled button */}
        <button
          disabled
          className="w-full px-6 py-3 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed text-sm"
        >
          Connexion WhatsApp — Bientot disponible
        </button>

        {/* Notification link */}
        <p className="text-center mt-6 text-sm text-gray-500">
          <a href="mailto:contact@coccinelle.ai" className="inline-flex items-center gap-1.5 text-gray-700 hover:text-gray-900 transition-colors">
            <Mail className="w-3.5 h-3.5" />
            Etre notifie a l&apos;ouverture
          </a>
        </p>
      </div>
    </div>
  );
}
