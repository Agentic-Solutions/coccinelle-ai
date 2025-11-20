'use client';

import { CallFunnel } from '../../../lib/sara-analytics';
import { PhoneCall, CheckCircle, UserCheck, Calendar } from 'lucide-react';

interface CallFunnelProps {
  funnel: CallFunnel;
}

export default function CallFunnelComponent({ funnel }: CallFunnelProps) {
  const steps = [
    {
      label: 'Appels reçus',
      count: funnel.received,
      rate: 100,
      icon: PhoneCall,
      color: 'bg-gray-900',
      nextRate: funnel.rates.handleRate
    },
    {
      label: 'Traités par Sara',
      count: funnel.handled,
      rate: funnel.rates.handleRate,
      icon: CheckCircle,
      color: 'bg-blue-600',
      nextRate: funnel.rates.qualificationRate
    },
    {
      label: 'Leads qualifiés',
      count: funnel.qualified,
      rate: funnel.rates.qualificationRate,
      icon: UserCheck,
      color: 'bg-green-600',
      nextRate: funnel.rates.conversionRate
    },
    {
      label: 'RDV créés',
      count: funnel.rdvCreated,
      rate: funnel.rates.conversionRate,
      icon: Calendar,
      color: 'bg-green-700',
      nextRate: null
    }
  ];

  const getRateStatus = (rate: number, thresholds: { good: number; medium: number }) => {
    if (rate >= thresholds.good) return { color: 'text-green-600', label: 'Excellent' };
    if (rate >= thresholds.medium) return { color: 'text-yellow-600', label: 'Correct' };
    return { color: 'text-red-600', label: 'À améliorer' };
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Funnel d'appels entrants</h3>
        <p className="text-gray-600 text-sm">
          Performance de Sara sur les appels reçus
        </p>
      </div>

      {/* Conversion globale */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Taux de conversion global</p>
            <p className="text-3xl font-bold text-gray-900">
              {funnel.rates.overallConversion.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {funnel.rdvCreated} RDV sur {funnel.initiated} appels
            </p>
          </div>
          <div className={`text-5xl ${funnel.rates.overallConversion >= 10 ? 'opacity-100' : 'opacity-30'}`}>
            🎯
          </div>
        </div>
      </div>

      {/* Étapes du funnel */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const widthPercentage = funnel.received > 0 ? (step.count / funnel.received) * 100 : 0;
          const displayWidth = Math.max(widthPercentage, 5);
          const Icon = step.icon;

          // Thresholds différents selon l'étape
          let thresholds = { good: 70, medium: 50 };
          if (index === 0) thresholds = { good: 100, medium: 100 }; // Reçus = toujours 100%
          if (index === 1) thresholds = { good: 95, medium: 85 }; // Prise en charge (Sara doit traiter quasi tous)
          if (index === 2) thresholds = { good: 60, medium: 40 }; // Qualification
          if (index === 3) thresholds = { good: 50, medium: 30 }; // RDV

          const status = getRateStatus(step.rate, thresholds);

          return (
            <div key={index}>
              {/* Barre de l'étape */}
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    <span className="text-xs text-gray-500">({step.count})</span>
                  </div>
                  <div className={`flex items-center gap-2`}>
                    <span className={`text-sm font-semibold ${status.color}`}>
                      {step.rate.toFixed(1)}%
                    </span>
                    {index > 0 && (
                      <span className={`text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded h-7 overflow-hidden">
                  <div
                    className={`${step.color} h-full transition-all duration-500 flex items-center justify-end px-3`}
                    style={{ width: `${displayWidth}%` }}
                  >
                    {widthPercentage > 12 && (
                      <span className="text-white font-semibold text-sm">
                        {step.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Flèche et taux de passage */}
              {step.nextRate !== null && (
                <div className="flex items-center gap-2 my-3 ml-6">
                  <div className="w-px h-4 bg-gray-300" />
                  <div className="text-xs text-gray-600">
                    ↓ {step.nextRate.toFixed(1)}% passent à l'étape suivante
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Points d'attention */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-sm mb-3 text-gray-700">Points clés</h4>
        <div className="space-y-2">
          {funnel.rates.handleRate < 90 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-red-600 font-bold">•</span>
              <p className="text-gray-700">
                <span className="font-semibold">Appels non traités:</span> {(100 - funnel.rates.handleRate).toFixed(1)}% des appels ne sont pas pris en charge
              </p>
            </div>
          )}
          {funnel.rates.conversionRate < 40 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-orange-600 font-bold">•</span>
              <p className="text-gray-700">
                <span className="font-semibold">Conversion RDV à améliorer:</span> {funnel.rates.conversionRate.toFixed(1)}%
              </p>
            </div>
          )}
          {funnel.rates.overallConversion >= 25 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 font-bold">•</span>
              <p className="text-gray-700">
                <span className="font-semibold">Excellente performance globale</span> - Continuez !
              </p>
            </div>
          )}
          {funnel.rates.handleRate >= 95 && funnel.rates.conversionRate >= 50 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-600 font-bold">•</span>
              <p className="text-gray-700">
                <span className="font-semibold">Sara performe très bien</span> sur toutes les étapes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
