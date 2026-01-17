import Link from 'next/link';
import { Phone, MessageSquare, Calendar, Users, BarChart3, Zap, Clock, TrendingUp, Shield, Check, Star, ArrowRight, Building2, Mail, Bot } from 'lucide-react';
import AnimatedAppPreview from '@/components/landing/AnimatedAppPreview';
import OnboardingAnimation from '@/components/landing/OnboardingAnimation';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">coccinelle.ai</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#fonctionnalites" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Fonctionnalités</a>
              <a href="#demo" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Démo</a>
              <a href="#tarifs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Tarifs</a>
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                Connexion
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition"
              >
                Essai gratuit
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Call Center IA & Relation Client
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Disponibilité 24/7
              <br />
              avec votre <span className="text-gray-900">Agent IA Intelligent</span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Répondez à tous les appels clients 24/7, automatisez la prise de rendez-vous et la qualification,
              et améliorez la satisfaction client avec une réponse instantanée et intelligente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
              >
                Démarrer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center px-8 py-4 border border-gray-300 text-base font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                Voir la démo
              </a>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                14 jours gratuits
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Sans carte bancaire
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Setup en 5 min
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">95%</div>
              <div className="text-gray-600">Taux de réponse</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">3x</div>
              <div className="text-gray-600">Plus de RDV qualifiés</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Disponibilité</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Avant */}
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="text-gray-900 font-semibold mb-4">❌ Avant Coccinelle</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Les défis quotidiens</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-600">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                  Appels manqués après les heures de bureau
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                  Clients mal qualifiés avant réponse manuelle
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                  Processus de prise de RDV long et manuel
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                  Tickets support dispersés sur plusieurs canaux
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <div className="w-2 h-2 bg-gray-900 rounded-full mt-2 flex-shrink-0" />
                  Temps de réponse lents aux demandes urgentes
                </li>
              </ul>
            </div>

            {/* Après */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-white">
              <div className="font-semibold mb-4">✓ Avec Coccinelle</div>
              <h3 className="text-2xl font-bold mb-6">La solution complète</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 flex-shrink-0" />
                  Réponse instantanée 24/7 à tous les appels clients
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 flex-shrink-0" />
                  Auto-qualification intelligente des demandes
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 flex-shrink-0" />
                  Prise de RDV automatique et gestion des annulations
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 flex-shrink-0" />
                  Tous les tickets centralisés et organisés automatiquement
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-6 h-6 flex-shrink-0" />
                  Analytics client et satisfaction en temps réel
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Animated App Preview */}
      <section id="demo" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Découvrez la plateforme
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une interface intuitive qui gère tous vos appels, tickets et clients en une seule plateforme
            </p>
          </div>

          <AnimatedAppPreview />
        </div>
      </section>

      {/* Onboarding Animation */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Prêt en moins d'une minute
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Aucune compétence technique requise. Collez votre URL, configurez votre numéro, c'est parti
            </p>
          </div>

          <OnboardingAnimation />
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600">
              Une plateforme complète pour gérer votre relation client et vos appels
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <Phone className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Assistant vocal IA
              </h3>
              <p className="text-gray-600 mb-6">
                Votre agent virtuel répond aux appels 24/7, qualifie les prospects et planifie les rendez-vous automatiquement.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Conversation naturelle en français
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Qualification intelligente
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Transcription en temps réel
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Communication omnicanal
              </h3>
              <p className="text-gray-600 mb-6">
                Centralisez SMS, WhatsApp, email et appels dans une seule interface. Historique complet par prospect.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  SMS & WhatsApp intégrés
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Réponses suggérées par IA
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Relances automatiques
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Gestion automatisée des RDV
              </h3>
              <p className="text-gray-600 mb-6">
                Synchronisation avec Google/Outlook, rappels automatiques et gestion des annulations en toute autonomie.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Prise de RDV automatique
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Sync calendrier
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Rappels intelligents
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                CRM intelligent
              </h3>
              <p className="text-gray-600 mb-6">
                Base prospects enrichie automatiquement avec scoring IA, segmentation et historique complet.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Scoring automatique
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Enrichissement données
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Segmentation intelligente
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Analytics & Rapports
              </h3>
              <p className="text-gray-600 mb-6">
                Tableaux de bord en temps réel, analyses de performance et prédictions IA pour optimiser votre activité.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Dashboards personnalisés
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Exports automatiques
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Prédictions IA
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Votre base de connaissance prête en 2 minutes
              </h3>
              <p className="text-gray-600 mb-6">
                Collez l'URL de votre site web, et votre IA connaît instantanément tous vos produits, services et tarifs.
                Zéro configuration technique.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Importez votre site en 1 clic
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Ajoutez vos documents (PDF, Word)
                </li>
                <li className="flex items-center gap-2 text-gray-700">
                  <Check className="w-4 h-4 text-green-600" />
                  Créez votre FAQ personnalisée
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Pour tous types de secteurs
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">E-commerce & Retail</h3>
              <p className="text-gray-600">
                Gérez les demandes clients, commandes, retours et support 24/7. Augmentez la satisfaction.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Services & Conseil</h3>
              <p className="text-gray-600">
                Qualification des demandes, prise de RDV automatique et suivi client personnalisé.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">SAV & Support Client</h3>
              <p className="text-gray-600">
                Support technique, traitement des réclamations et ticketing automatisé en temps réel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "Avec Coccinelle, 95% de nos appels clients sont maintenant traités immédiatement. La satisfaction client a explosé et nos équipes peuvent se concentrer sur les cas complexes."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">ML</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Marie Legrand</div>
                  <div className="text-sm text-gray-600">Directrice Relation Client</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "L'IA qualifie automatiquement chaque appel et RDV. Nos temps de réponse ont diminué de 80% et la qualité des interactions client a amélioré drastiquement."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">TD</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Thomas Dupont</div>
                  <div className="text-sm text-gray-600">Manager Centre d'Appels</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">
                "Setup rapide et interface intuitive. Notre équipe support traite maintenant 3x plus de demandes sans effort. Les clients apprécient les réponses instantanées."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold">SB</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Sophie Bernard</div>
                  <div className="text-sm text-gray-600">Responsable Support Client</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Tarification simple et transparente
            </h2>
            <p className="text-xl text-gray-600">
              Choisissez l'offre adaptée à votre activité
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">79€</span>
                <span className="text-gray-600">/mois</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">100 appels/mois</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">1 agent vocal IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">SMS & WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Gestion RDV</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">CRM prospects</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Essayer gratuitement
              </Link>
            </div>

            {/* Pro - Popular */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 text-white shadow-2xl transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                  Populaire
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">199€</span>
                <span className="text-gray-300">/mois</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Appels illimités</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>3 agents vocaux IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Tout Starter +</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Analytics avancés</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>API & Intégrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Support prioritaire</span>
                </li>
              </ul>
              <Link
                href="/signup"
                className="block w-full text-center px-6 py-3 text-base font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-50 transition"
              >
                Essayer gratuitement
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-xl p-8 border border-gray-200 hover:shadow-xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">Sur mesure</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Volume personnalisé</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Agents IA illimités</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Tout Pro +</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">SLA garanti</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Déploiement dédié</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Account manager</span>
                </li>
              </ul>
              <a
                href="mailto:contact@coccinelle.ai"
                className="block w-full text-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Sécurité et conformité
            </h2>
            <p className="text-lg text-gray-600">
              Vos données sont protégées et conformes aux normes les plus strictes
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">RGPD</h3>
              <p className="text-sm text-gray-600">100% conforme RGPD</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">ISO 27001</h3>
              <p className="text-sm text-gray-600">Certification sécurité</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Hébergement EU</h3>
              <p className="text-sm text-gray-600">Données en France</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Chiffrement</h3>
              <p className="text-sm text-gray-600">SSL/TLS 256-bit</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à transformer votre relation client ?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Rejoignez les équipes qui améliorent leur expérience client avec coccinelle.ai.
            <br />
            Essai gratuit de 14 jours, sans engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-lg text-gray-900 bg-white hover:bg-gray-50 shadow-lg transition-all"
            >
              Démarrer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="mailto:contact@coccinelle.ai"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-base font-semibold rounded-lg text-white hover:bg-gray-800 transition-all"
            >
              Demander une démo
            </a>
          </div>
          <div className="flex items-center justify-center gap-8 mt-10 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              14 jours gratuits
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Sans carte bancaire
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Annulation à tout moment
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <span className="ml-3 text-xl font-bold text-white">coccinelle.ai</span>
              </div>
              <p className="text-sm text-gray-400">
                L'agent IA qui gère vos appels et améliore votre relation client 24/7.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#fonctionnalites" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-white transition">Tarifs</a></li>
                <li><a href="#demo" className="hover:text-white transition">Démo</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white transition">À propos</a></li>
                <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
                <li><a href="mailto:contact@coccinelle.ai" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/legal/privacy" className="hover:text-white transition">Confidentialité</a></li>
                <li><a href="/legal/terms" className="hover:text-white transition">CGU</a></li>
                <li><a href="/legal/mentions" className="hover:text-white transition">Mentions légales</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-400">
                © 2025 coccinelle.ai. Tous droits réservés.
              </p>
              <div className="flex items-center gap-6">
                <a href="mailto:contact@coccinelle.ai" className="text-gray-400 hover:text-white transition">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
