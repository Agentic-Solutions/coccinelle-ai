'use client';

import { useEffect, useState } from 'react';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  TrendingUp,
  FileText,
  Zap,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  ArrowRight,
  Activity,
  BarChart3,
  X
} from 'lucide-react';
import {
  analyzeKnowledgeBase,
  getHealthScoreLabel,
  getHealthScoreColor,
  type AutoKnowledgeAnalysis,
  type KnowledgeGap,
  type ContentSuggestion
} from '../../../lib/auto-knowledge';

interface KnowledgeBuilderProps {
  documents: any[];
  calls: any[];
  appointments: any[];
  onDocumentDelete?: (docId: string) => void;
}

interface Document {
  id: string;
  title: string;
  content?: string;
  created_at: string;
  sourceType?: string;
}

export default function KnowledgeBuilder({
  documents,
  calls,
  appointments,
  onDocumentDelete
}: KnowledgeBuilderProps) {
  const [analysis, setAnalysis] = useState<AutoKnowledgeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'suggestions' | 'questions'>('overview');

  useEffect(() => {
    // Analyser la KB
    const result = analyzeKnowledgeBase({ documents, calls, appointments });
    setAnalysis(result);
    setLoading(false);
  }, [documents, calls, appointments]);

  if (loading || !analysis) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
          <div>
            <h3 className="font-semibold text-gray-900">Auto-Knowledge Builder</h3>
            <p className="text-sm text-gray-600">Analyse en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  const { healthScore, gaps, suggestions, topQuestions, insights } = analysis;

  return (
    <div className="space-y-6">
      {/* Header avec Score de Santé */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-lg">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Auto-Knowledge Builder
                <Sparkles className="w-5 h-5" />
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Analyse intelligente et optimisation automatique de votre KB
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${getHealthScoreColor(healthScore.overall)} font-bold text-lg`}>
              <Activity className="w-5 h-5" />
              {healthScore.overall}/100
            </div>
            <p className="text-sm text-blue-100 mt-1">{getHealthScoreLabel(healthScore.overall)}</p>
          </div>
        </div>

        {/* Métriques de santé */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-blue-100">Coverage</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{healthScore.coverage}%</p>
            <p className="text-xs text-blue-100 mt-1">Questions couvertes</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-blue-100">Qualité</span>
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{healthScore.quality}%</p>
            <p className="text-xs text-blue-100 mt-1">Score qualité</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-blue-100">Fraîcheur</span>
              <RefreshCw className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{healthScore.freshness}%</p>
            <p className="text-xs text-blue-100 mt-1">Docs récents</p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-blue-100">Usage</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{healthScore.usage}%</p>
            <p className="text-xs text-blue-100 mt-1">Taux utilisation</p>
          </div>
        </div>
      </div>

      {/* Insights principaux */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Insights Clés</h3>
          </div>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Navigation tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'gaps', label: `Lacunes (${gaps.length})`, icon: AlertTriangle },
              { id: 'suggestions', label: `Suggestions (${suggestions.length})`, icon: Sparkles },
              { id: 'questions', label: 'Top Questions', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <OverviewTab healthScore={healthScore} documents={documents} onDocumentDelete={onDocumentDelete} />
          )}

          {activeTab === 'gaps' && (
            <GapsTab gaps={gaps} />
          )}

          {activeTab === 'suggestions' && (
            <SuggestionsTab suggestions={suggestions} />
          )}

          {activeTab === 'questions' && (
            <QuestionsTab questions={topQuestions} />
          )}
        </div>
      </div>
    </div>
  );
}

// Onglet Vue d'ensemble
function OverviewTab({ healthScore, documents, onDocumentDelete }: { healthScore: any; documents: Document[]; onDocumentDelete?: (docId: string) => void }) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const getSourceBadge = (sourceType?: string) => {
    switch (sourceType) {
      case 'assistant':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">Assistant Sara</span>;
      case 'manual':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">Manuel</span>;
      case 'crawl':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Crawler</span>;
      case 'upload':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">Fichier</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">Autre</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">État de la Knowledge Base</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Documents totaux</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{healthScore.breakdown.totalDocuments}</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Documents actifs</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{healthScore.breakdown.activeDocuments}</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Docs obsolètes</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{healthScore.breakdown.outdatedDocuments}</p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Lacunes critiques</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{healthScore.breakdown.gapCount}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Recommandation IA</h4>
            <p className="text-sm text-gray-700">
              {healthScore.overall >= 80
                ? "Votre KB est en excellente santé ! Maintenez ce niveau en mettant régulièrement à jour vos documents."
                : healthScore.overall >= 60
                ? "Quelques améliorations sont nécessaires. Concentrez-vous sur les lacunes prioritaires."
                : "Votre KB nécessite une attention urgente. Commencez par traiter les gaps critiques."}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des documents existants */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents existants ({documents.length})</h3>
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucun document dans votre Knowledge Base</p>
            <p className="text-sm text-gray-500 mt-1">Ajoutez des documents pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                      {getSourceBadge(doc.sourceType)}
                    </div>
                    <p className="text-xs text-gray-500">
                      Créé le {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {onDocumentDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer "${doc.title}" ?`)) {
                            onDocumentDelete(doc.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Supprimer ce document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                {doc.content && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                    {doc.content.substring(0, 150)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal pour afficher le contenu complet */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDoc(null)}>
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <h2 className="text-2xl font-bold text-gray-900">{selectedDoc.title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      {getSourceBadge(selectedDoc.sourceType)}
                      <span className="text-sm text-gray-600">
                        Créé le {new Date(selectedDoc.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedDoc.content || 'Aucun contenu disponible'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Onglet Lacunes
function GapsTab({ gaps }: { gaps: KnowledgeGap[] }) {
  const getGapIcon = (type: KnowledgeGap['type']) => {
    switch (type) {
      case 'missing_content':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'outdated_content':
        return <RefreshCw className="w-5 h-5 text-yellow-500" />;
      case 'low_quality':
        return <Info className="w-5 h-5 text-gray-500" />;
      case 'frequent_question':
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const getGapBg = (priority: KnowledgeGap['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (gaps.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune lacune détectée</h3>
        <p className="text-gray-600">Votre Knowledge Base est complète et à jour !</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gaps.map((gap) => (
        <div
          key={gap.id}
          className={`p-4 rounded-lg border ${getGapBg(gap.priority)} transition-all hover:shadow-md`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getGapIcon(gap.type)}</div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{gap.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{gap.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      gap.priority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : gap.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : gap.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {gap.priority === 'critical'
                      ? 'Critique'
                      : gap.priority === 'high'
                      ? 'Élevé'
                      : gap.priority === 'medium'
                      ? 'Moyen'
                      : 'Faible'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      gap.estimatedImpact === 'high'
                        ? 'bg-purple-100 text-purple-700'
                        : gap.estimatedImpact === 'medium'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Impact {gap.estimatedImpact === 'high' ? 'Élevé' : gap.estimatedImpact === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                </div>
              </div>

              {gap.affectedQueries && gap.affectedQueries.length > 0 && (
                <div className="mb-3 p-2 bg-white/50 rounded text-sm text-gray-600 italic">
                  "{gap.affectedQueries[0]}"
                </div>
              )}

              <div className="flex items-center justify-between">
                {gap.metadata && (
                  <div className="text-xs text-gray-500">
                    {gap.metadata.questionCount && (
                      <span>Posée {gap.metadata.questionCount} fois</span>
                    )}
                  </div>
                )}

                <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                  {gap.suggestedAction}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Onglet Suggestions
function SuggestionsTab({ suggestions }: { suggestions: ContentSuggestion[] }) {
  const getSuggestionIcon = (type: ContentSuggestion['type']) => {
    switch (type) {
      case 'new_document':
        return <Plus className="w-5 h-5 text-green-500" />;
      case 'update_document':
        return <Edit className="w-5 h-5 text-blue-500" />;
      case 'merge_documents':
        return <Copy className="w-5 h-5 text-purple-500" />;
      case 'delete_document':
        return <Trash2 className="w-5 h-5 text-red-500" />;
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune suggestion</h3>
        <p className="text-gray-600">Votre KB est optimale pour le moment !</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getSuggestionIcon(suggestion.type)}</div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{suggestion.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      suggestion.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {suggestion.priority === 'high' ? 'Haute' : suggestion.priority === 'medium' ? 'Moyenne' : 'Basse'} priorité
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Raison:</span> {suggestion.reason}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">+{suggestion.impact} impact</span>
                  </div>
                  <button className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                    Appliquer
                  </button>
                </div>
              </div>

              {suggestion.suggestedContent && (
                <details className="mt-3">
                  <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                    Voir le template suggéré
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                    {suggestion.suggestedContent}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Onglet Top Questions
function QuestionsTab({ questions }: { questions: any[] }) {
  return (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border transition-all ${
            q.covered
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-start gap-3">
            {q.covered ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{q.question}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Posée <span className="font-medium">{q.count}</span> fois
                  </p>
                </div>

                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    q.covered ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {q.covered ? '✓ Couverte' : '✗ Non couverte'}
                </span>
              </div>

              {!q.covered && (
                <button className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
                  <Plus className="w-4 h-4" />
                  Créer un document
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
