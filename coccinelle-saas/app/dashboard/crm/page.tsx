'use client';

import Link from 'next/link';
import { Users, TrendingUp, Target, Award } from 'lucide-react';

export default function CRMPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CRM intégré</h1>
        <p className="text-xl text-gray-600 mb-8">
          Chaque conversation enrichit automatiquement votre base prospects
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Prospects totaux</h3>
            <p className="text-4xl font-bold text-gray-900">124</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Prospects chauds</h3>
            <p className="text-4xl font-bold text-gray-900">32</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Taux de qualification</h3>
            <p className="text-4xl font-bold text-gray-900">68%</p>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Nouveaux ce mois</h3>
            <p className="text-4xl font-bold text-gray-900">+18</p>
          </div>
        </div>

        {/* Modules CRM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard/crm/prospects">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-gray-900 rounded-lg flex items-center justify-center transition-colors">
                  <Users className="w-6 h-6 text-gray-700 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Vue Prospects</h3>
              </div>
              <p className="text-gray-600">Liste complète de vos contacts qualifiés</p>
            </div>
          </Link>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Segmentation</h3>
            </div>
            <p className="text-gray-500">Segments intelligents - À venir</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Scoring</h3>
            </div>
            <p className="text-gray-500">Scoring automatique - À venir</p>
          </div>

          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Tous les contacts</h3>
            </div>
            <p className="text-gray-500">Base complète - À venir</p>
          </div>
        </div>
      </div>
    </div>
  );
}
