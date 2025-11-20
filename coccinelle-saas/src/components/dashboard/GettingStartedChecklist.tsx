'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  Phone,
  Calendar,
  Settings,
  BookOpen
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  icon: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

interface GettingStartedChecklistProps {
  documentsCount: number;
  callsCount: number;
  appointmentsCount: number;
  onDismiss?: () => void;
}

export default function GettingStartedChecklist({
  documentsCount,
  callsCount,
  appointmentsCount,
  onDismiss
}: GettingStartedChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    // Vérifier si déjà dismissed
    const dismissed = localStorage.getItem('getting_started_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    // Vérifier l'onboarding
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    const kbMethod = localStorage.getItem('kb_method');

    // Construire la checklist dynamique
    const checklist: ChecklistItem[] = [
      {
        id: 'account',
        title: 'Compte créé',
        description: 'Votre compte Coccinelle.AI est opérationnel',
        status: 'completed',
        icon: <CheckCircle className="w-5 h-5" />
      },
      {
        id: 'sara',
        title: 'Sara configurée',
        description: 'Votre assistant vocal est prêt',
        status: onboardingCompleted ? 'completed' : 'in-progress',
        icon: <Zap className="w-5 h-5" />
      },
      {
        id: 'knowledge-base',
        title: documentsCount === 0
          ? 'Knowledge Base vide'
          : documentsCount < 3
          ? `Knowledge Base incomplète (${documentsCount}/3 minimum)`
          : `Knowledge Base complète (${documentsCount} docs)`,
        description: documentsCount === 0
          ? 'Ajoutez des documents pour que Sara puisse répondre aux questions'
          : documentsCount < 3
          ? 'Pour que Sara soit vraiment efficace, nous recommandons au moins 3 documents couvrant vos services, horaires et tarifs.'
          : 'Votre KB contient assez de documents, continuez à l\'enrichir',
        status: documentsCount === 0
          ? 'pending'
          : documentsCount < 3
          ? 'in-progress'
          : 'completed',
        icon: <BookOpen className="w-5 h-5" />,
        action: documentsCount < 3 ? {
          label: 'Enrichir ma KB →',
          href: '/dashboard/knowledge?tab=builder'
        } : undefined
      },
      {
        id: 'test-call',
        title: callsCount === 0 ? 'Testez Sara' : `Sara a reçu ${callsCount} appel${callsCount > 1 ? 's' : ''}`,
        description: callsCount === 0
          ? 'Appelez Sara pour tester ses capacités'
          : 'Sara fonctionne correctement',
        status: callsCount === 0 ? 'pending' : 'completed',
        icon: <Phone className="w-5 h-5" />,
        action: callsCount === 0 ? {
          label: 'Voir le numéro',
          href: '/dashboard/sara'
        } : undefined
      },
      {
        id: 'first-rdv',
        title: appointmentsCount === 0 ? 'Créez votre premier RDV' : `${appointmentsCount} RDV créé${appointmentsCount > 1 ? 's' : ''}`,
        description: appointmentsCount === 0
          ? 'Testez la création de rendez-vous'
          : 'Système de RDV fonctionnel',
        status: appointmentsCount === 0 ? 'pending' : 'completed',
        icon: <Calendar className="w-5 h-5" />,
        action: appointmentsCount === 0 ? {
          label: 'Créer un RDV',
          href: '/dashboard/rdv'
        } : undefined
      },
      {
        id: 'integrations',
        title: 'Intégrations',
        description: 'Connectez Google Calendar, CRM, etc.',
        status: 'pending',
        icon: <Settings className="w-5 h-5" />,
        action: {
          label: 'Configurer',
          href: '/dashboard/settings'
        }
      }
    ];

    setItems(checklist);

    // Collapsed par défaut - user peut expand s'il veut voir tout
    setIsExpanded(false);
  }, [documentsCount, callsCount, appointmentsCount]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('getting_started_dismissed', 'true');
    // Notify parent component
    if (onDismiss) {
      onDismiss();
    }
  };

  // Ne pas afficher si dismissed
  if (isDismissed) return null;

  // Ne pas afficher si aucun item (pendant le chargement)
  if (items.length === 0) return null;

  // Calculer la progression
  const completedCount = items.filter(item => item.status === 'completed').length;
  const progressPercentage = Math.round((completedCount / items.length) * 100);

  // Trouver le premier item non-complété pour l'afficher en mode collapsed
  const nextIncompleteItem = items.find(item => item.status !== 'completed');

  // Si tout est complété, ne rien afficher
  if (completedCount === items.length) return null;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-sm mb-6">
      {/* Collapsed view - Just the urgent item */}
      {!isExpanded && nextIncompleteItem && (
        <div className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">{nextIncompleteItem.title}</h3>
                  {nextIncompleteItem.status === 'in-progress' && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded font-medium whitespace-nowrap">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-700 leading-snug">{nextIncompleteItem.description}</p>
                {nextIncompleteItem.action && (
                  <a
                    href={nextIncompleteItem.action.href}
                    className="inline-block mt-2 text-xs font-medium text-gray-900 hover:text-gray-700 underline"
                  >
                    {nextIncompleteItem.action.label}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 hover:bg-yellow-100 rounded transition-colors"
                title="Voir tout"
                aria-label="Développer"
              >
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-yellow-100 rounded transition-colors"
                title="Masquer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded view - Full checklist */}
      {isExpanded && (
        <div>
          <div className="p-3 border-b border-yellow-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm">Premiers pas</h3>
                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded font-medium">
                  {completedCount}/{items.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-yellow-100 rounded transition-colors"
                  aria-label="Réduire"
                >
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 hover:bg-yellow-100 rounded transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2 bg-white/50">
            {items.map((item) => (
              <ChecklistItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistItemCard({ item }: { item: ChecklistItem }) {
  const getStatusStyles = () => {
    switch (item.status) {
      case 'completed':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: 'text-green-600',
          text: 'text-green-900'
        };
      case 'in-progress':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          text: 'text-yellow-900'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-400',
          text: 'text-gray-700'
        };
    }
  };

  const styles = getStatusStyles();
  const StatusIcon = item.status === 'completed' ? CheckCircle : item.status === 'in-progress' ? AlertCircle : Circle;

  return (
    <div className={`flex items-start gap-2 p-2 rounded border ${styles.bg} transition-all`}>
      {/* Status Icon */}
      <div className={`${styles.icon} mt-0.5`}>
        <StatusIcon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-xs mb-0.5">
          {item.title}
        </div>
        <div className="text-xs text-gray-600 leading-snug">
          {item.description}
        </div>
      </div>

      {/* Action Button */}
      {item.action && item.status !== 'completed' && (
        <a
          href={item.action.href}
          className="px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors whitespace-nowrap flex-shrink-0"
        >
          {item.action.label}
        </a>
      )}

      {/* Item Icon */}
      {!item.action || item.status === 'completed' ? (
        <div className={`${styles.icon} opacity-50 flex-shrink-0`}>
          {item.icon}
        </div>
      ) : null}
    </div>
  );
}
