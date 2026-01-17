'use client';

import Link from 'next/link';
import { Calendar, Clock, Bell, BarChart3 } from 'lucide-react';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestion de RDV</h1>
        <p className="text-xl text-gray-600 mb-8">
          Prise, rappels et confirmations 100% automatiques
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">RDV ce mois</h3>
            <p className="text-4xl font-bold text-gray-900">23</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">RDV confirmés</h3>
            <p className="text-4xl font-bold text-gray-900">21</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Taux de présence</h3>
            <p className="text-4xl font-bold text-gray-900">94%</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">RDV oubliés</h3>
            <p className="text-4xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Modules RDV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard/appointments/calendar">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Calendar className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Calendrier</h3>
              </div>
              <p className="text-gray-600">Vue d'ensemble de vos rendez-vous</p>
            </div>
          </Link>

          <Link href="/dashboard/appointments/settings">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Clock className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Disponibilités</h3>
              </div>
              <p className="text-gray-600">Configurer vos créneaux horaires</p>
            </div>
          </Link>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Rappels</h3>
            </div>
            <p className="text-gray-500">Gestion des rappels automatiques - À venir</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Statistiques</h3>
            </div>
            <p className="text-gray-500">Analytics RDV - À venir</p>
          </div>
        </div>
      </div>
    </div>
  );
}
