'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CalendarIntegration from '@/components/settings/CalendarIntegration';
import Logo from '@/components/Logo';

export default function CalendarsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/rdv">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} className="hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Synchronisation calendrier</h1>
              <p className="text-xs sm:text-sm text-gray-600">Connectez votre calendrier pour éviter les doubles réservations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <CalendarIntegration />

        <div className="mt-6">
          <Link
            href="/dashboard/rdv"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Retour aux rendez-vous
          </Link>
        </div>
      </div>
    </div>
  );
}
