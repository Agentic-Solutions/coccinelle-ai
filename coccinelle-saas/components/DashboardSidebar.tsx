'use client';

/**
 * Barre latérale du dashboard — chantier NAVIGATION (14/08/2026).
 *
 * Trois entrées, un pied à trois lignes, rien d'autre. Ce qui a disparu et
 * pourquoi :
 *
 *   - le bouton « Nouvel appel » : l'appel sortant n'existe pas dans le
 *     produit. Le bouton lançait /voixia/orchestrate avec une action que
 *     l'orchestrateur ne connaît pas, sur un numéro écrit en dur ;
 *   - la bascule Simple/Avancé : une seule navigation pour tous désormais ;
 *   - les 6 groupes accordéon : leurs 24 entrées sont rangées dans les trois
 *     destinations, ou atteignables par la recherche de Réglages ;
 *   - le repli en colonne étroite (68 px) : il n'avait plus d'objet avec trois
 *     entrées, et coûtait un état de plus.
 *
 * La pastille d'essai descend EN BAS, au-dessus du pied — elle était en haut.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { NAV, NAV_PIED, entreeActive } from '@/lib/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Essai',
  essentiel: 'Essentiel',
  starter: 'Essentiel',
  pro: 'Pro',
  business: 'Business',
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [statut, setStatut] = useState<string | null>(null);
  const [joursEssai, setJoursEssai] = useState<number | null>(null);

  const active = entreeActive(pathname);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      : null;
    if (!token) return;
    fetch(`${API_URL}/api/v1/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.subscription) {
          setPlan(data.subscription.plan);
          setStatut(data.subscription.status);
          setJoursEssai(data.subscription.trial_days_remaining);
        } else {
          setPlan('trial');
          setStatut('trialing');
        }
      })
      .catch(() => {});
  }, []);

  const deconnexion = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // On déconnecte même si l'API ne répond pas : rester connecté malgré un
      // clic sur « Déconnexion » serait pire qu'une session orpheline côté serveur.
    }
    localStorage.removeItem('auth_token');
    router.push('/login');
  }, [router]);

  const contenu = (
    <>
      {/* Marque */}
      <div className="flex items-center gap-[11px] px-5 pt-[22px] pb-[18px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-[#1a1a19] block flex-shrink-0" />
        <span className="text-[16px] font-semibold tracking-[-0.01em] text-[#1a1a19]">
          Coccinelle.ai
        </span>
      </div>

      {/* Les trois destinations */}
      <nav className="flex-1 px-3 flex flex-col gap-[3px]">
        {NAV.map((item) => {
          const Icon = item.icon;
          const actif = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={actif ? 'page' : undefined}
              className={`flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[15px] font-medium whitespace-nowrap transition-colors ${
                actif
                  ? 'bg-[#f2f2ee] text-[#1a1a19]'
                  : 'text-[#6b6b66] hover:bg-[#fafaf9] hover:text-[#1a1a19]'
              }`}
            >
              <Icon
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={1.7}
                color={actif ? '#1a1a19' : '#a3a39c'}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Essai — en bas, au-dessus du pied */}
      {plan && (
        <div className="px-4 pt-[14px] pb-3 border-t border-[#f2f2ee]">
          <Link
            href="/dashboard/settings"
            className="flex items-center justify-between gap-[10px] border border-[#ebebe7] rounded-full px-[13px] py-[7px] hover:border-[#dcdbd6] transition-colors"
          >
            <span className="text-[12.5px] text-[#6b6b66]">
              {PLAN_LABELS[plan] || plan}
            </span>
            {statut === 'trialing' && joursEssai !== null && joursEssai > 0 && (
              <span className="text-[12.5px] font-medium font-mono text-[#1a1a19]">
                {joursEssai} j
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Pied : Réglages · Aide · Déconnexion */}
      <div className="px-3 pt-0.5 pb-[18px] flex flex-col gap-0.5">
        {NAV_PIED.map((item) => {
          const Icon = item.icon;
          const actif = active === null && pathname.replace(/\/$/, '') === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] whitespace-nowrap transition-colors ${
                actif
                  ? 'bg-[#f2f2ee] text-[#1a1a19] font-medium'
                  : 'text-[#6b6b66] hover:bg-[#fafaf9] hover:text-[#1a1a19]'
              }`}
            >
              <Icon
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={1.7}
                color={actif ? '#1a1a19' : '#a3a39c'}
              />
              {item.name}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={deconnexion}
          className="flex items-center gap-[11px] px-3 py-[10px] rounded-[9px] text-[14px] text-[#6b6b66] hover:bg-[#fafaf9] hover:text-[#1a1a19] transition-colors w-full text-left"
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.7} color="#a3a39c" />
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Ouverture mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2 bg-white border border-[#e2e2de] rounded-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5 text-[#3a3a37]" />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#e2e2de] flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 hover:bg-[#f2f2ee] rounded-lg z-10"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-[#6b6b66]" />
        </button>
        {contenu}
      </aside>

      <aside className="hidden lg:flex flex-col flex-shrink-0 w-64 bg-white border-r border-[#e2e2de] h-full">
        {contenu}
      </aside>
    </>
  );
}
