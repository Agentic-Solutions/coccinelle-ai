import Link from 'next/link';
import { Phone, Brain, Calendar, BarChart3, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Phone,
      title: 'Agent Vocal IA',
      description: 'Automatisez vos appels avec Sara, votre assistante vocale intelligente.'
    },
    {
      icon: Brain,
      title: 'Knowledge Base RAG',
      description: 'Base de connaissances intelligente avec recherche sémantique et IA.'
    },
    {
      icon: Calendar,
      title: 'Gestion Rendez-vous',
      description: 'Planification automatique et synchronisation multi-agendas.'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avancés',
      description: 'Tableaux de bord et statistiques en temps réel de vos performances.'
    }
  ];

  const benefits = [
    'Réduction de 70% du temps de gestion',
    'Disponibilité 24/7 sans interruption',
    'Intégration avec vos outils existants',
    'Déploiement en moins de 5 minutes'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900">Coccinelle.AI</span>
            </Link>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Fonctionnalités</a>
              <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">Comment ça marche</a>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Automatisez votre communication
            <br />
            avec l'intelligence artificielle
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Coccinelle.AI combine agent vocal IA, base de connaissances intelligente et gestion automatisée 
            de rendez-vous pour transformer votre relation client.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-gray-600">
              Une plateforme complète pour automatiser votre communication
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-4">
                    <Icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Simple et efficace
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Coccinelle.AI s'intègre à votre workflow existant en quelques minutes. 
                Pas de configuration complexe, pas de code requis.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-6 w-6 text-green-600 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Créez votre compte</p>
                    <p className="text-sm text-gray-600">En moins de 2 minutes</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Configurez vos agents</p>
                    <p className="text-sm text-gray-600">Personnalisez selon vos besoins</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">C'est prêt !</p>
                    <p className="text-sm text-gray-600">Commencez à automatiser</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Prêt à transformer votre communication ?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Rejoignez les entreprises qui font confiance à Coccinelle.AI pour automatiser 
            leur relation client.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100"
          >
            Commencer gratuitement
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">Coccinelle.AI</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 Coccinelle.AI. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
