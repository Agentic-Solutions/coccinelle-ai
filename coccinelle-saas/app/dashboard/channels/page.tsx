'use client';

import Link from 'next/link';
import { Phone, MessageSquare, Mail, MessageCircle } from 'lucide-react';

export default function ChannelsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Multi-canal</h1>
        <p className="text-xl text-gray-600 mb-8">
          Gérez tous vos canaux de communication depuis une seule interface
        </p>

        {/* Stats globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-6 h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Téléphone</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">47</p>
            <p className="text-sm text-gray-600">Appels aujourd'hui</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-6 h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900">SMS</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">34</p>
            <p className="text-sm text-gray-600">Messages envoyés</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-900">WhatsApp</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">28</p>
            <p className="text-sm text-gray-600">Conversations</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-6 h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900">Email</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">15</p>
            <p className="text-sm text-gray-600">Emails traités</p>
          </div>
        </div>

        {/* Configuration des canaux */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration des canaux</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/channels/phone">
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                    <Phone className="w-6 h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Téléphone</h3>
                </div>
                <p className="text-sm text-gray-600">Configurer les numéros et options d'appel</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/sms">
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                    <MessageSquare className="w-6 h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">SMS</h3>
                </div>
                <p className="text-sm text-gray-600">Gérer les campagnes et réponses SMS</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/whatsapp">
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                    <MessageCircle className="w-6 h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">WhatsApp</h3>
                </div>
                <p className="text-sm text-gray-600">Connecter et configurer WhatsApp Business</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/email">
              <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                    <Mail className="w-6 h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Email</h3>
                </div>
                <p className="text-sm text-gray-600">Configurer domaine et templates d'email</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Boîte de réception unifiée */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Boîte de réception unifiée</h2>
            <Link href="/dashboard/channels/inbox">
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                Voir tous les messages
              </button>
            </Link>
          </div>
          <p className="text-gray-600">
            Accédez à toutes vos conversations (appels, SMS, WhatsApp, emails) depuis une interface unique.
          </p>
        </div>
      </div>
    </div>
  );
}
