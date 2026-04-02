'use client';

import { Search, Bell } from 'lucide-react';
import DashboardSidebar from '../../components/DashboardSidebar';
import NotificationBell from '../../components/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <DashboardSidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white flex-shrink-0">
          {/* Recherche */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-80 max-w-full">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Rechercher un contact, appel..."
              className="bg-transparent text-sm outline-none text-gray-700 w-full placeholder-gray-400"
            />
          </div>

          {/* Droite */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900">Utilisateur</div>
                <div className="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
