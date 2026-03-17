'use client';

import Link from 'next/link';
import { Users, Phone, MessageSquare, Clock } from 'lucide-react';

export default function ConversationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 pl-10 lg:pl-0">Conversations IA</h1>
        <p className="text-sm sm:text-base lg:text-xl text-gray-600 mb-6 lg:mb-8 pl-10 lg:pl-0">
          L&apos;IA adapte son approche à chaque client sur tous les canaux
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Conversations aujourd&apos;hui</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">89</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Temps de réponse moyen</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">&lt;2s</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Taux de satisfaction</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">94%</p>
          </div>
        </div>

        {/* Modules conversations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/dashboard/conversations/sara">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Configuration assistant</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Personnalisez votre agent IA et ses réponses</p>
            </div>
          </Link>

          <Link href="/dashboard/conversations/appels">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Journal des appels</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Historique complet des appels téléphoniques</p>
            </div>
          </Link>

          <Link href="/dashboard/channels/inbox">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Conversations en cours</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Messages actifs sur tous les canaux</p>
            </div>
          </Link>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Historique complet</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">À venir prochainement</p>
          </div>
        </div>
      </div>
    </div>
  );
}
