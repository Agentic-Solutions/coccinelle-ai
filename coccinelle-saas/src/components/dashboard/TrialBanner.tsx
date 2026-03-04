'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, X, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
  trialEndsAt: string | null;
  trialActive: boolean;
  trialDaysRemaining: number;
}

export default function TrialBanner({ trialEndsAt, trialActive, trialDaysRemaining }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem('trial_banner_dismissed');
    if (d === 'true') setDismissed(true);
  }, []);

  if (!trialActive || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trial_banner_dismissed', 'true');
  };

  // Couleur selon jours restants
  let bgClass = 'bg-green-50 border-green-200';
  let textClass = 'text-green-800';
  let iconClass = 'text-green-600';
  let badgeClass = 'bg-green-100 text-green-700';

  if (trialDaysRemaining <= 3) {
    bgClass = 'bg-red-50 border-red-200';
    textClass = 'text-red-800';
    iconClass = 'text-red-600';
    badgeClass = 'bg-red-100 text-red-700';
  } else if (trialDaysRemaining <= 7) {
    bgClass = 'bg-orange-50 border-orange-200';
    textClass = 'text-orange-800';
    iconClass = 'text-orange-600';
    badgeClass = 'bg-orange-100 text-orange-700';
  }

  return (
    <div className={`${bgClass} border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Clock className={`w-5 h-5 ${iconClass} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${textClass}`}>
                Essai gratuit
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''} restant{trialDaysRemaining > 1 ? 's' : ''}
              </span>
            </div>
            <p className={`text-xs ${textClass} opacity-80 mt-0.5 hidden sm:block`}>
              {trialDaysRemaining > 7
                ? 'Profitez de toutes les fonctionnalites pendant votre essai.'
                : trialDaysRemaining > 3
                ? 'Passez au plan Pro pour ne rien perdre.'
                : 'Votre essai expire bientot. Passez au plan Pro maintenant.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/dashboard/billing">
            <button className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1">
              Passer au Pro
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
