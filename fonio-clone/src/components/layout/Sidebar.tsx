'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Phone,
  Users,
  Hash,
  Bot,
  MessageSquare,
  Voicemail,
  ListTree,
  Users2,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Headphones,
} from 'lucide-react'
import { useState } from 'react'

// ═══════════════════════════════════════
// SIDEBAR - Navigation principale
// ═══════════════════════════════════════
// Barre latérale avec tous les liens de navigation
// Se réduit en mode compact (icônes seulement)

const navigation = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Appels', href: '/calls', icon: Phone },
      { name: 'Contacts', href: '/contacts', icon: Users },
    ],
  },
  {
    label: 'Téléphonie',
    items: [
      { name: 'Numéros', href: '/phone-numbers', icon: Hash },
      { name: 'Agents IA', href: '/ai-agents', icon: Bot },
      { name: 'SMS', href: '/sms', icon: MessageSquare },
      { name: 'Messagerie vocale', href: '/voicemail', icon: Voicemail },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { name: 'IVR / SVI', href: '/ivr', icon: ListTree },
      { name: 'Files d\'attente', href: '/queues', icon: Users2 },
    ],
  },
  {
    label: 'Rapports',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Gérer la déconnexion
  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoggingOut(true)
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
      } else {
        console.error('[Sidebar] Erreur lors de la déconnexion')
      }
    } catch (error) {
      console.error('[Sidebar] Erreur déconnexion:', error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">VoxyPhone</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center mx-auto">
            <Headphones className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Dialer rapide */}
      <div className="px-3 py-3">
        <Link
          href="/calls/dialer"
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium text-sm',
            collapsed && 'justify-center px-2'
          )}
        >
          <Phone className="w-4 h-4" />
          {!collapsed && <span>Nouveau appel</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {navigation.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                // Gestion spéciale pour la route racine "/" (Dashboard)
                // pour éviter qu'elle soit active sur toutes les pages
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className={cn('w-5 h-5', isActive ? 'text-brand-600' : 'text-gray-400')} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom - Settings + Logout */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings className="w-5 h-5 text-gray-400" />
          {!collapsed && <span>Paramètres</span>}
        </Link>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-5 h-5 text-gray-400" />
          {!collapsed && <span>{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>}
        </button>
      </div>
    </aside>
  )
}
