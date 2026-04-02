'use client'

import { Bell, Search, ChevronDown } from 'lucide-react'
import { useState, useCallback } from 'react'
import { cn, getInitials } from '@/lib/utils'

// ═══════════════════════════════════════
// HEADER - Barre supérieure du dashboard
// ═══════════════════════════════════════
// Contient : recherche, notifications, profil utilisateur

interface HeaderUser {
  name: string             // Better Auth utilise 'name' (pas 'full_name')
  email: string
  role: string
  image: string | null     // Better Auth utilise 'image' (pas 'avatar_url')
}

interface HeaderProps {
  title: string
  subtitle?: string
  user?: HeaderUser
}

const DEFAULT_USER: HeaderUser = {
  name: 'Utilisateur',
  email: 'user@voxyphone.com',
  role: 'user',
  image: null,
}

export default function Header({ title, subtitle, user = DEFAULT_USER }: HeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchFocus = useCallback(() => setIsSearchFocused(true), [])
  const handleSearchBlur = useCallback(() => setIsSearchFocused(false), [])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Titre de la page */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un contact, appel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-64 pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-gray-50 transition-colors',
              isSearchFocused ? 'border-brand-300' : 'border-gray-200'
            )}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          {/* Badge de notification */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Séparateur */}
        <div className="h-8 w-px bg-gray-200" />

        {/* Profil utilisateur */}
        <button
          className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
          aria-label="Menu profil"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-sm font-medium text-brand-700">
              {getInitials(user.name)}
            </span>
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </header>
  )
}
