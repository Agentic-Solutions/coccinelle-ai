'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Settings2, Menu, X,
  BarChart2, BookOpen, Radio, Bot
} from 'lucide-react';
import CoccinelleIcon from '@/components/CoccinelleIcon';

// ── Data ──────────────────────────────────────────────

interface NavChild {
  label: string;
  href: string;
}

interface NavModule {
  type: 'module';
  id: string;
  icon: typeof LayoutDashboard;
  label: string;
  description: string;
  children: NavChild[];
}

interface NavDirectLink {
  type: 'direct';
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
}

interface NavSeparator {
  type: 'separator';
}

type NavEntry = NavModule | NavDirectLink | NavSeparator;

const MODULES: NavModule[] = [
  {
    type: 'module', id: 'knowledge', icon: BookOpen,
    label: 'Connaissances', description: "Ce que l'agent sait",
    children: [
      { label: 'Base de connaissances', href: '/dashboard/knowledge' },
      { label: 'FAQ', href: '/dashboard/knowledge/faq' },
      { label: 'Produits & Services', href: '/dashboard/knowledge/products' },
      { label: 'Documents', href: '/dashboard/knowledge/docs' },
    ],
  },
  {
    type: 'module', id: 'channels', icon: Radio,
    label: 'Canaux', description: 'Toutes les interactions',
    children: [
      { label: 'Téléphone', href: '/dashboard/channels/phone' },
      { label: 'SMS', href: '/dashboard/channels/sms' },
      { label: 'WhatsApp', href: '/dashboard/channels/whatsapp' },
      { label: 'Email', href: '/dashboard/channels/email' },
      { label: 'Rendez-vous', href: '/dashboard/appointments' },
    ],
  },
  {
    type: 'module', id: 'agents', icon: Bot,
    label: 'Agents', description: "Ce que l'agent dit et fait",
    children: [
      { label: 'Configuration', href: '/dashboard/agents/configuration' },
      { label: 'Scripts', href: '/dashboard/agents/scripts' },
      { label: 'Séquences', href: '/dashboard/agents/nodes' },
      { label: 'Test vocal', href: '/dashboard/agents/test' },
    ],
  },
  {
    type: 'module', id: 'analytics', icon: BarChart2,
    label: 'Analytics', description: "Ce que l'agent a accompli",
    children: [
      { label: 'KPIs', href: '/dashboard/analytics' },
      { label: 'Transcripts', href: '/dashboard/analytics/transcripts' },
      { label: 'Performances', href: '/dashboard/analytics/performance' },
      { label: 'Export', href: '/dashboard/analytics/export' },
    ],
  },
  {
    type: 'module', id: 'crm', icon: Users,
    label: 'CRM', description: 'Contacts & relations',
    children: [
      { label: 'Prospects', href: '/dashboard/crm/prospects' },
      { label: 'Clients', href: '/dashboard/customers' },
      { label: 'Conversations', href: '/dashboard/conversations' },
    ],
  },
  {
    type: 'module', id: 'admin', icon: Settings2,
    label: 'Administration', description: 'Gestion & configuration',
    children: [
      { label: 'Équipes', href: '/dashboard/teams' },
      { label: 'Facturation', href: '/dashboard/billing' },
      { label: 'Paramètres', href: '/dashboard/settings' },
    ],
  },
];

const RAIL_ITEMS: NavEntry[] = [
  { type: 'direct', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { type: 'separator' },
  ...MODULES,
];

// ── Helpers ───────────────────────────────────────────

function isHrefActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function getActiveModuleId(pathname: string): string | null {
  for (const mod of MODULES) {
    if (mod.children.some(c => isHrefActive(pathname, c.href))) return mod.id;
  }
  return null;
}

// ── Component ─────────────────────────────────────────

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeModuleId = getActiveModuleId(pathname);

  // Sync panel: open the active module's panel on route change
  useEffect(() => {
    setOpenModuleId(activeModuleId);
  }, [activeModuleId]);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Body scroll lock for mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleModuleClick = useCallback((mod: NavModule) => {
    if (openModuleId === mod.id) {
      setOpenModuleId(null);
    } else {
      setOpenModuleId(mod.id);
    }
  }, [openModuleId]);

  const handleDirectClick = useCallback(() => {
    setOpenModuleId(null);
  }, []);

  const openModule = MODULES.find(m => m.id === openModuleId) || null;

  // ── Render: Icon rail (level 1) ──

  function renderRail() {
    return (
      <div className="w-14 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center justify-center py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors">
          <CoccinelleIcon size={28} color="currentColor" strokeWidth={1.5} className="text-gray-700" />
        </Link>

        {/* Rail items */}
        <nav className="flex-1 flex flex-col items-center py-2 gap-0.5 overflow-y-auto">
          {RAIL_ITEMS.map((entry, idx) => {
            if (entry.type === 'separator') {
              return <div key={`sep-${idx}`} className="w-6 border-t border-gray-200 my-1.5" />;
            }

            if (entry.type === 'module') {
              const Icon = entry.icon;
              const isActive = activeModuleId === entry.id;
              const isOpen = openModuleId === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => handleModuleClick(entry)}
                  title={entry.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
                    isActive || isOpen
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-[22px] h-[22px]" />
                </button>
              );
            }

            // direct link
            const Icon = entry.icon;
            const isActive = isHrefActive(pathname, entry.href);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={handleDirectClick}
                title={entry.label}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <Icon className="w-[22px] h-[22px]" />
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Render: Context panel (level 2) ──

  function renderPanel() {
    if (!openModule) return null;
    return (
      <div className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full animate-slide-in">
        {/* Module header */}
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-base font-semibold text-gray-900">{openModule.label}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{openModule.description}</p>
        </div>
        <div className="mx-4 border-t border-gray-100" />

        {/* Sub-items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {openModule.children.map((child) => {
            const active = isHrefActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? 'text-gray-900 font-semibold border-l-2 border-gray-900 pl-2 -ml-[2px] bg-gray-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Render: Mobile full sidebar (classic) ──

  function renderMobileSidebar() {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <CoccinelleIcon size={32} color="currentColor" strokeWidth={1.5} className="text-gray-700" />
          <h1 className="text-lg font-bold flex-1">Coccinelle.AI</h1>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] ${
              pathname === '/dashboard'
                ? 'bg-gray-100 text-gray-900 font-bold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          {/* Modules with always-visible children */}
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const modActive = mod.children.some(c => isHrefActive(pathname, c.href));
            return (
              <div key={mod.id} className="mt-2">
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${modActive ? 'bg-gray-100' : ''}`}>
                  <Icon className={`w-5 h-5 ${modActive ? 'text-gray-900' : 'text-gray-400'}`} />
                  <div>
                    <span className={`text-sm font-medium block ${modActive ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {mod.label}
                    </span>
                    <span className="text-[10px] text-gray-400 block">{mod.description}</span>
                  </div>
                </div>
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {mod.children.map((child) => {
                    const active = isHrefActive(pathname, child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-1 text-[13px] ${
                          active
                            ? 'text-gray-900 font-semibold border-l-2 border-gray-900 -ml-[2px] pl-[14px]'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    );
  }

  // ── Main return ──

  return (
    <>
      {/* CSS animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 150ms ease-out;
        }
      `}</style>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — classic full-width */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderMobileSidebar()}
      </aside>

      {/* Desktop: 2-level sidebar — in flex flow, not fixed */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        {renderRail()}
        {renderPanel()}
      </div>
    </>
  );
}
