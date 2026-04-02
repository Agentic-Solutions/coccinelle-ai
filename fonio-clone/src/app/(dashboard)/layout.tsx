import Sidebar from '@/components/layout/Sidebar'

// ═══════════════════════════════════════
// LAYOUT DASHBOARD - Structure principale
// ═══════════════════════════════════════
// Sidebar à gauche + contenu principal à droite
// Toutes les pages protégées utilisent ce layout

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: Vérifier l'authentification ici
  // Si pas connecté → rediriger vers /login

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
