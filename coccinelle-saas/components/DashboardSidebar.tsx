'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Phone, Users, Hash, Bot,
  MessageSquare, MessageCircle, Mail, Voicemail,
  Calendar, BookOpen, HelpCircle, Package,
  FileText, GitBranch, ListTree, Users2,
  BarChart3, ScrollText, Download,
  Settings, LogOut, Menu, X, PhoneCall,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import CoccinelleIcon from '@/components/CoccinelleIcon';

// ── Types ────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── Navigation ───────────────────────────────────────

const navigation: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Appels', href: '/dashboard/analytics/calls', icon: Phone },
      { name: 'Contacts', href: '/dashboard/crm/prospects', icon: Users },
    ],
  },
  {
    label: 'Téléphonie',
    items: [
      { name: 'Numéros', href: '/dashboard/channels/phone', icon: Hash },
      { name: 'Agents IA', href: '/dashboard/agents/configuration', icon: Bot },
      { name: 'SMS', href: '/dashboard/channels/sms', icon: MessageSquare },
      { name: 'WhatsApp', href: '/dashboard/channels/whatsapp', icon: MessageCircle },
      { name: 'Email', href: '/dashboard/channels/email', icon: Mail },
      { name: 'Messagerie vocale', href: '/dashboard/channels/voicemail', icon: Voicemail },
      { name: 'Rendez-vous', href: '/dashboard/appointments', icon: Calendar },
    ],
  },
  {
    label: 'Connaissances',
    items: [
      { name: 'Base de connaissances', href: '/dashboard/knowledge', icon: BookOpen },
      { name: 'FAQ', href: '/dashboard/knowledge/faq', icon: HelpCircle },
      { name: 'Produits & Services', href: '/dashboard/knowledge/products', icon: Package },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { name: 'Scripts', href: '/dashboard/agents/scripts', icon: FileText },
      { name: 'Séquences', href: '/dashboard/agents/nodes', icon: GitBranch },
      { name: 'IVR / SVI', href: '/dashboard/channels/ivr', icon: ListTree },
      { name: "Files d'attente", href: '/dashboard/channels/queues', icon: Users2 },
    ],
  },
  {
    label: 'Rapports',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Transcripts', href: '/dashboard/analytics/transcripts', icon: ScrollText },
      { name: 'Export', href: '/dashboard/analytics/export', icon: Download },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function getActiveGroupLabel(pathname: string): string | null {
  for (const group of navigation) {
    if (group.items.some((item) => isActive(pathname, item.href))) {
      return group.label;
    }
  }
  return null;
}

// ── Composant ────────────────────────────────────────

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Accordéons : un Set de labels ouverts
  const activeGroupLabel = getActiveGroupLabel(pathname);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    return activeGroupLabel ? new Set([activeGroupLabel]) : new Set<string>();
  });

  // Auto-ouvrir le groupe actif quand la route change
  useEffect(() => {
    const label = getActiveGroupLabel(pathname);
    if (label) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        next.add(label);
        return next;
      });
    }
  }, [pathname]);

  // Fermer le mobile à chaque changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquer le scroll sur mobile quand ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Déconnexion même si l'API échoue
    }
    localStorage.removeItem('auth_token');
    router.push('/login');
  }, [router]);

  // ── Contenu sidebar ──

  function renderContent() {
    return (
      <div className="flex flex-col h-full">
        {/* En-tête logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <CoccinelleIcon size={18} color="white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-gray-900 whitespace-nowrap">
              Coccinelle.ai
            </span>
          )}
        </div>

        {/* Bouton nouvel appel */}
        <div className="px-3 py-3">
          {collapsed ? (
            <button className="w-full flex items-center justify-center py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
              <PhoneCall className="w-5 h-5" />
            </button>
          ) : (
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
              <PhoneCall className="w-4 h-4" />
              Nouvel appel
            </button>
          )}
        </div>

        {/* Navigation avec accordéons */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {navigation.map((group) => {
            const isOpen = openGroups.has(group.label);
            const hasActiveItem = group.items.some((item) => isActive(pathname, item.href));

            return (
              <div key={group.label} className="mb-1">
                {/* Label groupe cliquable */}
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      hasActiveItem
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      hasActiveItem ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {group.label}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${
                        isOpen ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                ) : (
                  <div className="w-6 mx-auto border-t border-gray-200 my-2" />
                )}

                {/* Items du groupe (avec animation) */}
                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ease-in-out ${
                    collapsed || isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } ${collapsed ? 'justify-center px-0' : ''}`}
                      >
                        <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${
                          active ? 'text-gray-900' : 'text-gray-400'
                        }`} />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bas de sidebar */}
        <div className="border-t border-gray-200 px-3 py-3 space-y-0.5">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(pathname, '/dashboard/settings')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            } ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'Paramètres' : undefined}
          >
            <Settings className={`w-[18px] h-[18px] flex-shrink-0 ${
              isActive(pathname, '/dashboard/settings') ? 'text-gray-900' : 'text-gray-400'
            }`} />
            {!collapsed && <span>Paramètres</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-gray-400" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>

        {/* Bouton collapse (desktop uniquement) */}
        <div className="hidden lg:flex border-t border-gray-200 px-3 py-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Rendu principal ──

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Bouton fermer mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-lg z-10"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        {renderContent()}
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-gray-200 h-full transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
      >
        {renderContent()}
      </aside>
    </>
  );
}
