'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import DashboardSidebar from '../../components/DashboardSidebar';
import NotificationBell from '../../components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Garde d'authentification (05/08/2026).
  //
  // Avant : le layout lisait useAuth() UNIQUEMENT pour afficher le nom, et
  // rendait {children} quoi qu'il arrive. Sans jeton, useAuth s'arrête sur
  // `if (!token) { setLoading(false); return; }` SANS rediriger — on obtenait
  // un dashboard complet, navigable et entièrement vide (KPI à 0, aucune
  // requête émise, avatar « U »), au lieu de l'écran de connexion. Un
  // utilisateur dont la session expire croyait le produit cassé.
  //
  // router.push() et non le redirect() de next/navigation : le site est
  // exporté en statique, où redirect() génère une page d'erreur (règle i.16bis).
  // Ici on est dans un client component, la redirection est purement runtime.
  const unauthenticated = !loading && !user;

  useEffect(() => {
    if (unauthenticated) router.push('/login');
  }, [unauthenticated, router]);

  // Ne pas rendre le dashboard vide pendant la redirection.
  if (unauthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="sr-only">Redirection vers la connexion</span>
      </div>
    );
  }

  const userName = user?.name || '';
  const userRole = user?.role || '';
  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

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
              {loading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium">
                  {initials || 'U'}
                </div>
              )}
              <div className="hidden sm:block">
                {loading ? (
                  <>
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-gray-100 rounded animate-pulse mt-1" />
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500 capitalize">{userRole}</div>
                  </>
                )}
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
