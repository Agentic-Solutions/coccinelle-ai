'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import TeamManagement from '@/components/settings/TeamManagement';

export default function TeamsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Équipes</h1>
              <p className="text-sm text-gray-600">Gérez vos équipes et leurs membres</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <TeamManagement />
      </div>
    </div>
  );
}
