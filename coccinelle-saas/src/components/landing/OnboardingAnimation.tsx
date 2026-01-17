'use client';

import { useState, useEffect } from 'react';
import { Link2, Upload, Phone, MessageSquare, Mail, Calendar, BarChart3, CheckCircle, Zap, Clock, Users, FileText, ChevronLeft, ChevronRight, Pause, Play, PlayCircle } from 'lucide-react';

const onboardingSteps = [
  {
    id: 1,
    title: 'Base de connaissance',
    subtitle: '3 façons de nourrir l\'IA avec vos informations',
    icon: FileText,
    duration: '30 secondes',
    visual: 'knowledge',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: Link2, text: 'Crawler web automatique' },
      { icon: Upload, text: 'Import PDF/Catalogues' },
      { icon: FileText, text: 'Création manuelle de contenu' }
    ],
    narrative: 'L\'IA apprend vos produits, services et expertise en crawlant votre site, en lisant vos documents, ou via création manuelle de contenu personnalisé.',
    explanation: 'Donnez à l\'IA toutes les informations dont elle a besoin pour répondre à vos clients',
  },
  {
    id: 2,
    title: 'Multi-canal',
    subtitle: 'Gérez tous vos canaux depuis une seule interface',
    icon: MessageSquare,
    duration: 'Instantané',
    visual: 'channels',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: Phone, text: '47 appels aujourd\'hui' },
      { icon: MessageSquare, text: '28 conversations WhatsApp' },
      { icon: Mail, text: '15 emails traités' }
    ],
    narrative: 'Téléphone, SMS, WhatsApp, Email : tous vos canaux de communication client centralisés en un seul endroit.',
    explanation: 'Plus besoin de jongler entre applications, tout est au même endroit',
  },
  {
    id: 3,
    title: 'Conversations IA',
    subtitle: 'L\'IA adapte son approche à chaque client',
    icon: Users,
    duration: '24/7',
    visual: 'conversations',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: CheckCircle, text: 'Réponses contextuelles' },
      { icon: MessageSquare, text: 'Switch automatique SMS/WhatsApp' },
      { icon: Calendar, text: 'Prise de RDV intégrée' }
    ],
    narrative: 'L\'IA comprend chaque demande, répond avec le bon niveau de détail, et peut basculer de canal si nécessaire (appel → SMS, WhatsApp → Email...).',
    explanation: 'Chaque client est unique, l\'IA s\'adapte automatiquement',
  },
  {
    id: 4,
    title: 'CRM intégré',
    subtitle: 'Chaque conversation enrichit votre base prospects',
    icon: Users,
    duration: 'Automatique',
    visual: 'crm',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: Users, text: 'Ajout auto au CRM' },
      { icon: BarChart3, text: 'Score de qualification' },
      { icon: Calendar, text: 'Historique complet' }
    ],
    narrative: 'Chaque appel, SMS ou message crée automatiquement un contact qualifié avec son score, ses intérêts, et tout l\'historique des échanges.',
    explanation: 'Construisez votre base prospects sans lever le petit doigt',
  },
  {
    id: 5,
    title: 'Gestion de RDV',
    subtitle: 'Prise, rappels et confirmations 100% automatiques',
    icon: Calendar,
    duration: 'Automatique',
    visual: 'appointments',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: Calendar, text: '23 RDV confirmés' },
      { icon: MessageSquare, text: 'Rappels automatiques' },
      { icon: CheckCircle, text: 'Confirmations SMS/Email' }
    ],
    narrative: 'L\'IA planifie les rendez-vous selon vos disponibilités, envoie les rappels automatiques 24h avant, et confirme par SMS ou Email.',
    explanation: 'Fini les no-show et les rendez-vous oubliés',
  },
  {
    id: 6,
    title: 'Analytics',
    subtitle: 'Mesurez et optimisez vos performances',
    icon: BarChart3,
    duration: 'Temps réel',
    visual: 'analytics',
    color: 'from-gray-700 to-gray-900',
    details: [
      { icon: BarChart3, text: 'Taux de conversion en temps réel' },
      { icon: Users, text: 'Performance par canal' },
      { icon: Calendar, text: 'Rapports exportables' }
    ],
    narrative: 'Tableaux de bord en temps réel pour suivre vos conversions, comparer les canaux, et identifier les opportunités d\'amélioration.',
    explanation: 'Décisions éclairées basées sur des données concrètes',
  }
];

export default function OnboardingAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Démarrer la démo
  const startDemo = () => {
    setHasStarted(true);
    setCurrentStep(0);
    setIsPaused(false);
    setTotalTime(0); // Réinitialiser le chronomètre
  };

  // Auto-play avec boucle infinie
  useEffect(() => {
    if (isPaused || !hasStarted) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        // Boucle infinie : retour à 0 après la dernière étape
        const nextStep = (prev + 1) % onboardingSteps.length;

        // Remettre le chronomètre à zéro quand on recommence la boucle
        if (nextStep === 0) {
          setTotalTime(0);
        }

        return nextStep;
      });
    }, 8000); // 8 secondes par étape pour lire le texte

    return () => clearInterval(interval);
  }, [isPaused, hasStarted]);

  // Timer (uniquement quand la démo est lancée et pas en pause)
  useEffect(() => {
    if (!hasStarted || isPaused) return;

    const timeInterval = setInterval(() => {
      setTotalTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [hasStarted, isPaused]);

  // Navigation manuelle
  const goToStep = (index: number) => {
    setCurrentStep(index);
    setIsPaused(true);

    // Reprend l'auto-play après 10 secondes d'inactivité
    setTimeout(() => setIsPaused(false), 10000);
  };

  const nextStep = () => {
    goToStep((currentStep + 1) % onboardingSteps.length);
  };

  const prevStep = () => {
    goToStep((currentStep - 1 + onboardingSteps.length) % onboardingSteps.length);
  };

  const current = onboardingSteps[currentStep];
  const Icon = current.icon;

  // Écran de démarrage
  if (!hasStarted) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
          <div className="p-16 md:p-24 min-h-[600px] flex items-center justify-center text-center">
            <div className="max-w-3xl">
              <div className="mb-8 flex justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-2xl animate-pulse">
                  <PlayCircle className="w-16 h-16 text-white" />
                </div>
              </div>

              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Regardez comme c'est facile
              </h2>

              <p className="text-2xl text-gray-300 mb-12 leading-relaxed">
                Découvrez en 1 minute comment Coccinelle transforme votre relation client
              </p>

              <button
                onClick={startDemo}
                className="group inline-flex items-center gap-4 bg-white text-gray-900 px-12 py-6 rounded-xl text-xl font-bold hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <PlayCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                Lancer la démonstration
              </button>

              <p className="mt-8 text-sm text-gray-400">
                Durée : 1 minute • 6 modules essentiels
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header avec timer et contrôles audio */}
        <div className="bg-gray-100 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
          <div className="text-sm font-medium text-gray-600">
            Module {currentStep + 1}/{onboardingSteps.length}
          </div>
          {/* Timer */}
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{totalTime}s</span>
          </div>
        </div>

        {/* Navigation par étapes */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            {/* Bouton précédent */}
            <button
              onClick={prevStep}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Étape précédente"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>

            {/* Indicateurs d'étapes cliquables */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              {onboardingSteps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={`group flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    index === currentStep
                      ? 'bg-gray-900 text-white'
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                  aria-label={`Aller à ${step.title}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'bg-white'
                          : index < currentStep
                          ? 'bg-gray-900'
                          : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-xs font-medium hidden md:inline">
                      {step.title.split(' ')[0]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Bouton suivant + pause/play */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label={isPaused ? 'Reprendre' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-gray-700" />
                ) : (
                  <Pause className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <button
                onClick={nextStep}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Étape suivante"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal - Style vidéo */}
        <div className="p-6 md:p-10 bg-gray-50 min-h-[500px] flex items-center justify-center">
          <div className="w-full max-w-4xl">
            {/* Message principal - GROS comme dans une vidéo */}
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center shadow-xl animate-scaleIn`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {current.title}
              </h3>

              <p className="text-lg md:text-xl font-medium text-gray-700 mb-6">
                {current.explanation}
              </p>
            </div>

            {/* Visualisation modulaire */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
              {current.visual === 'knowledge' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Link2 className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Crawler web</p>
                        <p className="text-xs text-gray-500">https://votre-entreprise.fr • 47 pages</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Upload className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Documents</p>
                        <p className="text-xs text-gray-500">catalogue-2024.pdf • 12 fiches produits</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Contenu personnalisé</p>
                        <p className="text-xs text-gray-500">FAQ • Scripts • Réponses spécifiques</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>
              )}

              {current.visual === 'channels' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-gray-900">Téléphone</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">47</p>
                      <p className="text-xs text-gray-500">Appels aujourd'hui</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-gray-900">SMS</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">34</p>
                      <p className="text-xs text-gray-500">Messages envoyés</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-gray-900">WhatsApp</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">28</p>
                      <p className="text-xs text-gray-500">Conversations</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-gray-900">Email</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">15</p>
                      <p className="text-xs text-gray-500">Emails traités</p>
                    </div>
                  </div>
                </div>
              )}

              {current.visual === 'conversations' && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Sophie Martin</p>
                        <p className="text-xs text-gray-500">Appel → SMS → WhatsApp</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">RDV confirmé</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Marc Dubois</p>
                        <p className="text-xs text-gray-500">Email → Téléphone</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">En cours</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Julie Bernard</p>
                        <p className="text-xs text-gray-500">WhatsApp uniquement</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Qualifié</span>
                    </div>
                  </div>
                </div>
              )}

              {current.visual === 'crm' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-700" />
                        <span className="font-medium text-gray-900">Sophie Martin</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Score: 85/100</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <p className="text-gray-500">Source</p>
                        <p className="font-medium text-gray-900">Appel entrant</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <p className="text-gray-500">Intérêt</p>
                        <p className="font-medium text-gray-900">Produit Premium</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-gray-200">
                        <p className="text-gray-500">Budget</p>
                        <p className="font-medium text-gray-900">Qualifié</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">124</p>
                      <p className="text-xs text-gray-600">Prospects totaux</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">68%</p>
                      <p className="text-xs text-gray-600">Taux qualification</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">32</p>
                      <p className="text-xs text-gray-600">Prospects chauds</p>
                    </div>
                  </div>
                </div>
              )}

              {current.visual === 'appointments' && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-gray-700" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Demain 14h00</p>
                        <p className="text-sm text-gray-600">Sophie Martin • Démo produit</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 ml-8">Rappel envoyé • Confirmé par SMS</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-gray-700" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Jeudi 10h30</p>
                        <p className="text-sm text-gray-600">Marc Dubois • Consultation</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 ml-8">Rappel programmé pour demain</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mt-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">23</p>
                      <p className="text-xs text-gray-600">RDV ce mois</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">94%</p>
                      <p className="text-xs text-gray-600">Taux de présence</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-600">RDV oubliés</p>
                    </div>
                  </div>
                </div>
              )}

              {current.visual === 'analytics' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-5 h-5 text-gray-700" />
                        <span className="text-sm font-medium text-gray-900">Conversion</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">68%</p>
                      <p className="text-xs text-green-600">+12% vs mois dernier</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-700" />
                        <span className="text-sm font-medium text-gray-900">Temps réponse</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">&lt;2s</p>
                      <p className="text-xs text-gray-500">Moyen sur tous canaux</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">Performance par canal</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Téléphone</span>
                          <span className="font-medium text-gray-900">72%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-gray-700 to-gray-900" style={{ width: '72%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">WhatsApp</span>
                          <span className="font-medium text-gray-900">68%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-gray-700 to-gray-900" style={{ width: '68%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Email</span>
                          <span className="font-medium text-gray-900">45%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-gray-700 to-gray-900" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Texte explicatif - Style sous-titres de vidéo */}
            <div className="space-y-4 mt-6">
              {/* Texte principal - GRAND et LISIBLE comme des sous-titres */}
              <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-xl">
                <p className="text-base md:text-lg font-medium text-gray-900 text-center leading-relaxed max-w-3xl mx-auto">
                  {current.narrative}
                </p>
              </div>

              {/* Badge durée */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg">
                  <Zap className="w-5 h-5" />
                  <span className="font-mono font-bold text-base">{current.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions et métriques */}
      <div className="mt-8 space-y-4">
        {/* Instructions de navigation */}
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
              <span>Naviguer entre les modules</span>
            </div>
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              <Play className="w-4 h-4" />
              <span>Mettre en pause / Reprendre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-900" />
              <span>Cliquez sur un module</span>
            </div>
          </div>
        </div>

        {/* Métriques */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-4">
            <p className="text-base font-medium text-gray-900 mb-1">
              Une plateforme complète de relation client IA
            </p>
            <p className="text-sm text-gray-600">
              Multi-canal • Automatisée • Intelligente
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">4</p>
              <p className="text-xs text-gray-600">Canaux intégrés</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">24/7</p>
              <p className="text-xs text-gray-600">Disponibilité</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">100%</p>
              <p className="text-xs text-gray-600">Automatisé</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-xs text-gray-600">Effort requis</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
