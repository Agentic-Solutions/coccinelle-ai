'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessageSquare, Users, Calendar, Settings,
  Package, ChevronLeft, ChevronRight, Sliders
} from 'lucide-react';
import Logo from '../src/components/Logo';

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: 'Accueil', href: '/dashboard' },
    { icon: MessageSquare, label: 'Conversations', href: '/dashboard/conversations' },
    { icon: Sliders, label: 'Configuration', href: '/dashboard/configuration' },
    { icon: Users, label: 'CRM', href: '/dashboard/crm' },
    { icon: Calendar, label: 'Rendez-vous', href: '/dashboard/appointments' },
    { icon: Package, label: 'Produits', href: '/dashboard/products' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col fixed h-screen transition-all duration-300 z-50`}>
      {/* Logo */}
      <div className={`p-6 border-b border-gray-200 ${collapsed ? 'flex flex-col items-center' : 'relative'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Logo size={40} />
          {!collapsed && (
            <div className="flex-1">
              <h1 className="text-lg font-bold">Coccinelle.AI</h1>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Réduire la barre latérale"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Ouvrir la barre latérale"
            className="mt-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : ''}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-gray-600'}`} />
              {!collapsed && (
                <span className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-700'}`}>
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
              <p className="mt-1">© 2024 Coccinelle.AI</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
