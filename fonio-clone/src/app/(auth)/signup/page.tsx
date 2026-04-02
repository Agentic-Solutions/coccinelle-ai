'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

// ═══════════════════════════════════════
// PAGE INSCRIPTION
// ═══════════════════════════════════════

interface SignupFormData {
  fullName: string
  companyName: string
  email: string
  password: string
  confirmPassword: string
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  function updateField(field: keyof SignupFormData, value: string): void {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      setLoading(false)
      return
    }

    try {
      // Appeler better-auth pour l'inscription
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
          // Le nom de l'entreprise sera associé à l'organisation après inscription
        }),
      })

      if (!response.ok) {
        const data = await response.json() as { message?: string }
        throw new Error(data.message || 'Erreur lors de l\'inscription')
      }

      // TODO: Créer l'organisation avec formData.companyName
      // Redirection vers le dashboard ou l'onboarding
      router.push('/')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Créer un compte</h1>
        <p className="text-muted-foreground mt-1">
          Démarrez votre essai gratuit de 14 jours
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1">
              Nom complet
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="Jean Dupont"
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-1">
              Entreprise
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Mon entreprise"
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Adresse email professionnelle
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="vous@entreprise.com"
            className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Minimum 8 caractères"
              className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm pr-10 bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            placeholder="Retapez votre mot de passe"
            className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-sm bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Création en cours...' : 'Créer mon compte'}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          En créant un compte, vous acceptez nos{' '}
          <a href="#" className="text-primary hover:underline">conditions d&apos;utilisation</a>
          {' '}et notre{' '}
          <a href="#" className="text-primary hover:underline">politique de confidentialité</a>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
