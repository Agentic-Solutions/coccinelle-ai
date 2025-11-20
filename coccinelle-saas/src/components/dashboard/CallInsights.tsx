'use client';

import { OptimizationInsight } from '../../../lib/sara-analytics';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, FileText, Target, TrendingUp } from 'lucide-react';

interface CallInsightsProps {
  insights: OptimizationInsight[];
  score: number;
}

export default function CallInsights({ insights, score }: CallInsightsProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { icon: AlertTriangle, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'CRITIQUE' };
      case 'high':
        return { icon: AlertCircle, bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', label: 'PRIORITAIRE' };
      case 'medium':
        return { icon: Info, bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', label: 'MOYEN' };
      case 'low':
        return { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'INFO' };
      default:
        return { icon: Info, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: 'INFO' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'capacity':
        return Clock;
      case 'script':
        return FileText;
      case 'qualification':
        return Target;
      case 'performance':
        return TrendingUp;
      default:
        return Info;
    }
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Excellente performance ! Sara est très efficace.';
    if (score >= 60) return 'Bonne performance. Quelques optimisations possibles.';
    if (score >= 40) return 'Performance moyenne. Plusieurs améliorations nécessaires.';
    return 'Performance faible. Optimisation urgente recommandée.';
  };

  return (
    <div className="space-y-6">
      {/* Score global */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Score de performance de Sara</h3>
            <p className="text-gray-600 text-sm mb-4">{getScoreMessage(score)}</p>

            {/* Barre de progression */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded h-6 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-out ${
                    score >= 80 ? 'bg-green-600' :
                    score >= 60 ? 'bg-yellow-600' :
                    score >= 40 ? 'bg-orange-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${score}%` }}
                >
                  <div className="flex items-center justify-center h-full">
                    <span className="text-white font-bold text-sm">{score}/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grade */}
          <div className="ml-8 text-center">
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {getScoreGrade(score)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Note</p>
          </div>
        </div>
      </div>

      {/* En-tête des insights */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Recommandations d'optimisation</h3>
          <p className="text-gray-600 text-sm mt-1">
            {insights.length} recommandation{insights.length > 1 ? 's' : ''} pour améliorer les performances
          </p>
        </div>

        {/* Stats rapides */}
        {insights.length > 0 && (
          <div className="flex items-center gap-4">
            {insights.filter(i => i.priority === 'critical').length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                <span className="text-sm font-medium text-gray-700">
                  {insights.filter(i => i.priority === 'critical').length} critique{insights.filter(i => i.priority === 'critical').length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {insights.filter(i => i.priority === 'high').length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                <span className="text-sm font-medium text-gray-700">
                  {insights.filter(i => i.priority === 'high').length} prioritaire{insights.filter(i => i.priority === 'high').length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liste des insights */}
      {insights.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="font-semibold text-green-900 mb-2">Aucune recommandation !</h3>
          <p className="text-green-700 text-sm">
            Sara performe excellemment. Continuez sur cette lancée !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const priorityConfig = getPriorityBadge(insight.priority);
            const PriorityIcon = priorityConfig.icon;
            const CategoryIcon = getCategoryIcon(insight.category);

            return (
              <div
                key={insight.id}
                className={`bg-white border ${priorityConfig.border} rounded-lg p-6 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  {/* Icône de priorité */}
                  <div className={`flex-shrink-0 ${priorityConfig.text}`}>
                    <PriorityIcon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* En-tête */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg text-gray-900">
                            {insight.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${priorityConfig.bg} ${priorityConfig.text}`}>
                              {priorityConfig.label}
                            </span>
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                              <CategoryIcon className="w-3 h-3" />
                              <span className="capitalize">{insight.category === 'capacity' ? 'Capacité' : insight.category === 'script' ? 'Script' : insight.category === 'qualification' ? 'Qualification' : 'Performance'}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{insight.description}</p>
                      </div>

                      {/* Amélioration estimée */}
                      <div className="flex-shrink-0 ml-4 text-right">
                        <div className="text-2xl font-bold text-green-600">
                          +{insight.estimatedImprovement}%
                        </div>
                        <p className="text-xs text-gray-600">gain estimé</p>
                      </div>
                    </div>

                    {/* Impact */}
                    <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Impact :</span>{' '}
                        <span className="text-gray-600">{insight.impact}</span>
                      </p>
                    </div>

                    {/* Actions recommandées */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Actions recommandées :</p>
                      <ul className="space-y-1.5">
                        {insight.actionItems.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 bg-gray-400 rounded-full"></span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Potentiel total */}
      {insights.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🚀</div>
            <div className="flex-1">
              <h4 className="font-bold text-lg text-gray-900 mb-1">Potentiel d'amélioration total</h4>
              <p className="text-gray-700">
                En appliquant ces recommandations, vous pourriez améliorer vos performances de{' '}
                <span className="font-bold text-green-600">
                  +{insights.reduce((sum, i) => sum + i.estimatedImprovement, 0)}%
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
