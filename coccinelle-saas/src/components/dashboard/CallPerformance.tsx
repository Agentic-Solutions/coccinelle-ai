'use client';

import { CallPerformance } from '../../../lib/sara-analytics';
import { PhoneCall, PhoneIncoming, Calendar, Clock, TrendingUp } from 'lucide-react';

interface CallPerformanceProps {
  performance: CallPerformance;
}

export default function CallPerformanceComponent({ performance }: CallPerformanceProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getMetricColor = (value: number, thresholds: { good: number; medium: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.medium) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total appels */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-gray-100 rounded">
              <PhoneCall className="w-5 h-5 text-gray-900" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{performance.totalCalls}</p>
          <p className="text-sm text-gray-600 mt-1">Appels reçus</p>
        </div>

        {/* Appels traités */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded">
              <PhoneIncoming className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{performance.totalHandled}</p>
          <p className="text-sm text-gray-600 mt-1">Traités</p>
        </div>

        {/* Taux de prise en charge */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${getMetricColor(performance.handleRate, { good: 95, medium: 85 })}`}>
            {performance.handleRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 mt-1">Taux de prise en charge</p>
        </div>

        {/* RDV créés */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-50 rounded">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{performance.totalRdv}</p>
          <p className="text-sm text-gray-600 mt-1">RDV créés</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Durées moyennes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-100 rounded">
              <Clock className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Durées moyennes</h3>
              <p className="text-sm text-gray-600">Temps de conversation</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Tous les appels</span>
                <span className={`font-bold ${getMetricColor(performance.avgCallDuration, { good: 180, medium: 120 })}`}>
                  {formatDuration(performance.avgCallDuration)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded h-2">
                <div
                  className="bg-gray-900 h-full rounded transition-all duration-500"
                  style={{ width: `${Math.min((performance.avgCallDuration / 300) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Appels avec RDV</span>
                <span className="font-bold text-green-600">
                  {formatDuration(performance.avgRdvCallDuration)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded h-2">
                <div
                  className="bg-green-600 h-full rounded transition-all duration-500"
                  style={{ width: `${Math.min((performance.avgRdvCallDuration / 300) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs text-gray-600">
              {performance.avgCallDuration < 120 ? (
                <span className="text-red-600">⚠ Appels trop courts - Enrichir le script de Sara</span>
              ) : performance.avgCallDuration >= 180 ? (
                <span className="text-green-600">✓ Bonne durée - Sara prend le temps d'échanger</span>
              ) : (
                <span className="text-yellow-600">○ Durée correcte - Potentiel d'amélioration</span>
              )}
            </p>
          </div>
        </div>

        {/* Créneaux horaires d'affluence */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Créneaux d'affluence</h3>

          {performance.callsByTimeSlot.length > 0 ? (
            <div className="space-y-3">
              {performance.callsByTimeSlot
                .filter(slot => slot.calls > 0)
                .sort((a, b) => b.rdvRate - a.rdvRate)
                .slice(0, 5)
                .map((slot, index) => (
                  <div key={slot.hour} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-700">
                      {slot.hour}h-{slot.hour + 1}h
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{slot.calls} appels</span>
                        <span className={`text-xs font-semibold ${getMetricColor(slot.rdvRate, { good: 20, medium: 10 })}`}>
                          {slot.rdvRate.toFixed(1)}% RDV
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded h-2">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            slot.rdvRate >= 20 ? 'bg-green-600' :
                            slot.rdvRate >= 10 ? 'bg-yellow-600' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(slot.rdvRate * 5, 100)}%` }}
                        />
                      </div>
                    </div>
                    {index === 0 && (
                      <span className="flex-shrink-0 text-lg">🏆</span>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Pas encore de données</p>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-900">
              💡 Assurez une capacité suffisante sur les créneaux d'affluence
            </p>
          </div>
        </div>
      </div>

      {/* Performance par jour de la semaine */}
      {performance.callsByDay.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance par jour</h3>

          <div className="grid grid-cols-7 gap-2">
            {performance.callsByDay.map((day) => {
              const rdvRate = day.calls > 0 ? (day.rdv / day.calls) * 100 : 0;
              return (
                <div key={day.day} className="text-center">
                  <div className="text-xs font-medium text-gray-700 mb-2">{day.day.slice(0, 3)}</div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-lg font-bold text-gray-900">{day.calls}</div>
                    <div className="text-xs text-gray-600">appels</div>
                    <div className={`text-sm font-semibold mt-1 ${getMetricColor(rdvRate, { good: 15, medium: 8 })}`}>
                      {day.rdv} RDV
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
