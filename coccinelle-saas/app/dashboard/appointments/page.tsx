'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Bell, BarChart3, Download } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ActionToastContainer from '@/components/ActionToast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function AppointmentsPage() {
  const toast = useToast();

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/appointments/export?format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Erreur export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rendez-vous_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export telecharge');
    } catch (err) {
      toast.error('Impossible d\'exporter les rendez-vous');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <ActionToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="pl-10 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Gestion de RDV</h1>
            <p className="text-sm sm:text-base lg:text-xl text-gray-600">
              Prise, rappels et confirmations 100% automatiques
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">RDV ce mois</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">23</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">RDV confirmes</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">21</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">Taux de presence</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">94%</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">RDV oublies</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Modules RDV */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/dashboard/appointments/calendar">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Calendrier</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Vue d&apos;ensemble de vos rendez-vous</p>
            </div>
          </Link>

          <Link href="/dashboard/appointments/settings">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Disponibilites</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Configurer vos creneaux horaires</p>
            </div>
          </Link>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Rappels</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">Gestion des rappels automatiques - A venir</p>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Statistiques</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">Analytics RDV - A venir</p>
          </div>
        </div>
      </div>
    </div>
  );
}
