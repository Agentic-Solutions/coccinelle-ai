'use client';

import Link from 'next/link';
import { Phone, MessageSquare, Mail, MessageCircle } from 'lucide-react';

export default function ChannelsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 pl-10 lg:pl-0">Multi-canal</h1>
        <p className="text-sm sm:text-base lg:text-xl text-gray-600 mb-6 lg:mb-8 pl-10 lg:pl-0">
          Gerez tous vos canaux de communication depuis une seule interface
        </p>

        {/* Stats globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Telephone</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">47</p>
            <p className="text-xs sm:text-sm text-gray-600">Appels aujourd&apos;hui</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">SMS</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">34</p>
            <p className="text-xs sm:text-sm text-gray-600">Messages envoyes</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">WhatsApp</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">28</p>
            <p className="text-xs sm:text-sm text-gray-600">Conversations</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Email</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">15</p>
            <p className="text-xs sm:text-sm text-gray-600">Emails traites</p>
          </div>
        </div>

        {/* Configuration des canaux */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 lg:mb-8">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Configuration des canaux</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link href="/dashboard/channels/phone">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Telephone</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Configurer les numeros et options d&apos;appel</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/sms">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">SMS</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Gerer les campagnes et reponses SMS</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/whatsapp">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">WhatsApp</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Connecter et configurer WhatsApp Business</p>
              </div>
            </Link>

            <Link href="/dashboard/channels/email">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Email</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600">Configurer domaine et templates d&apos;email</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Boite de reception unifiee */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Boite de reception unifiee</h2>
            <Link href="/dashboard/channels/inbox">
              <button className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base">
                Voir tous les messages
              </button>
            </Link>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Accedez a toutes vos conversations (appels, SMS, WhatsApp, emails) depuis une interface unique.
          </p>
        </div>
      </div>
    </div>
  );
}
