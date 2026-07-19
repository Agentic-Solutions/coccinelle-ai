import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CoccinelleIcon } from '@/components/CoccinelleIcon';

const legalLinks = [
  { href: '/legal/mentions-legales', label: 'Mentions legales' },
  { href: '/legal/politique-confidentialite', label: 'Confidentialite' },
  { href: '/legal/suppression-donnees', label: 'Suppression des donnees' },
  { href: '/legal/politique-cookies', label: 'Cookies' },
  { href: '/legal/cgu', label: 'CGU' },
  { href: '/legal/cgv', label: 'CGV' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <CoccinelleIcon size={18} color="white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Coccinelle.ai</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour a l&apos;accueil
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {children}
        </div>
      </main>

      {/* Footer with cross-navigation */}
      <footer className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; 2026 Agentic Solutions SASU &middot; SIREN 944 504 679
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gray-900 transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
