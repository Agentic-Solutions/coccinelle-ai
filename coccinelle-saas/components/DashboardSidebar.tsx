'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessageSquare, Users, Calendar, Settings,
  Package, ChevronLeft, ChevronRight, Sliders, Menu, X,
  Clock, BarChart3, CreditCard, UserPlus
} from 'lucide-react';
import Logo from '../src/components/Logo';

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const menuItems = [
    { icon: Home, label: 'Accueil', href: '/dashboard' },
    { icon: MessageSquare, label: 'Conversations', href: '/dashboard/conversations' },
    { icon: Sliders, label: 'Configuration', href: '/dashboard/configuration' },
    { icon: Users, label: 'CRM', href: '/dashboard/crm' },
    { icon: Calendar, label: 'Rendez-vous', href: '/dashboard/appointments' },
    { icon: Clock, label: 'Disponibilités', href: '/dashboard/availability' },
    { icon: Package, label: 'Produits', href: '/dashboard/products' },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/sara-analytics' },
    { icon: CreditCard, label: 'Facturation', href: '/dashboard/billing' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`p-4 lg:p-6 border-b border-gray-200 ${collapsed ? 'flex flex-col items-center' : 'relative'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Logo size={36} />
          {!collapsed && (
            <div className="flex-1">
              <h1 className="text-lg font-bold">Coccinelle.AI</h1>
            </div>
          )}
          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          {/* Collapse button on desktop */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Reduire la barre laterale"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Ouvrir la barre laterale"
            className="mt-4 p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              } ${collapsed ? 'lg:justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-700' : 'text-gray-600'}`} />
              {(!collapsed || mobileOpen) && (
                <span className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-700'} ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className={`text-xs text-gray-500 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed && (
            <>
              <p className="font-medium">Version 1.0.0</p>
              <p className="mt-1">2024 Coccinelle.AI</p>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
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

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex-col fixed h-screen transition-all duration-300 z-30 hidden lg:flex`}>
        {sidebarContent}
      </aside>
    </>
  );
}
