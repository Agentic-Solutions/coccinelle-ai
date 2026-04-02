import { Headphones } from 'lucide-react'

// ═══════════════════════════════════════
// LAYOUT AUTH - Pages d'authentification
// ═══════════════════════════════════════
// Centré à l'écran avec logo et fond dégradé

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-blue-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Headphones className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">VoxyPhone</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white mb-4">
            La téléphonie cloud
            <br />
            propulsée par l&apos;IA
          </h2>
          <p className="text-lg text-blue-100">
            Numéros virtuels, appels, SMS et agents vocaux IA.
            Tout ce dont votre entreprise a besoin en une seule plateforme.
          </p>
        </div>

        <p className="text-sm text-blue-200">
          &copy; 2026 VoxyPhone. Tous droits réservés.
        </p>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
