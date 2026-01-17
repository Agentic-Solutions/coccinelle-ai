'use client';

import Link from 'next/link';
import { Users, Phone, MessageSquare, Clock } from 'lucide-react';

export default function ConversationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Conversations IA</h1>
        <p className="text-xl text-gray-600 mb-8">
          L'IA adapte son approche à chaque client sur tous les canaux
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Conversations aujourd'hui</h3>
            <p className="text-4xl font-bold text-gray-900">89</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Temps de réponse moyen</h3>
            <p className="text-4xl font-bold text-gray-900">&lt;2s</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Taux de satisfaction</h3>
            <p className="text-4xl font-bold text-gray-900">94%</p>
          </div>
        </div>

        {/* Modules conversations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard/conversations/sara">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Users className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Configuration SARA</h3>
              </div>
              <p className="text-gray-600">Personnalisez votre agent IA et ses réponses</p>
            </div>
          </Link>

          <Link href="/dashboard/conversations/appels">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Phone className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Journal des appels</h3>
              </div>
              <p className="text-gray-600">Historique complet des appels téléphoniques</p>
            </div>
          </Link>

          <Link href="/dashboard/channels/inbox">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <MessageSquare className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Conversations en cours</h3>
              </div>
              <p className="text-gray-600">Messages actifs sur tous les canaux</p>
            </div>
          </Link>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Historique complet</h3>
            </div>
            <p className="text-gray-500">À venir prochainement</p>
          </div>
        </div>
      </div>
    </div>
  );
}
