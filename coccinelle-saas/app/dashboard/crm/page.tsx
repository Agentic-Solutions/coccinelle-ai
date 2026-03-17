'use client';

import Link from 'next/link';
import { Users, TrendingUp, Target, Award } from 'lucide-react';

export default function CRMPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 pl-10 lg:pl-0">CRM intégré</h1>
        <p className="text-sm sm:text-base lg:text-xl text-gray-600 mb-6 lg:mb-8 pl-10 lg:pl-0">
          Chaque conversation enrichit automatiquement votre base prospects
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">Prospects totaux</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">124</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">Prospects chauds</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">32</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">Taux de qualification</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">68%</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm">Nouveaux ce mois</h3>
            <p className="text-2xl sm:text-4xl font-bold text-gray-900">+18</p>
          </div>
        </div>

        {/* Modules CRM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          <Link href="/dashboard/crm/prospects">
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group active:bg-gray-50">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900">Vue Prospects</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600">Liste complète de vos contacts qualifiés</p>
            </div>
          </Link>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Segmentation</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">Segments intelligents - À venir</p>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Scoring</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">Scoring automatique - À venir</p>
          </div>

          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-xl font-bold text-gray-500">Tous les contacts</h3>
            </div>
            <p className="text-sm sm:text-base text-gray-400">Base complète - À venir</p>
          </div>
        </div>
      </div>
    </div>
  );
}
