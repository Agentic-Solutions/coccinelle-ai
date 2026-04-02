'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Search, ChevronDown, ChevronUp, Edit3, Trash2, Save, X, Loader2, Bot } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  synced: boolean;
}

const CATEGORIES = [
  'Général',
  'Horaires',
  'Tarifs',
  'Services',
  'Contact',
  'Rendez-vous',
  'Autre',
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('Général');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFAQs();
  }, []);

  async function loadFAQs() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/knowledge/documents'), {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      // Transform knowledge documents into FAQ format
      const docs = data.documents || [];
      const faqItems: FAQItem[] = docs
        .filter((d: any) => d.type === 'faq' || d.title?.startsWith('FAQ:'))
        .map((d: any) => ({
          id: d.id,
          question: d.title?.replace('FAQ: ', '') || d.title,
          answer: d.content || '',
          category: d.metadata?.category || 'Général',
          synced: true,
        }));
      setFaqs(faqItems);
    } catch {
      // Fallback with demo data
      setFaqs([
        { id: '1', question: "Quels sont vos horaires d'ouverture ?", answer: "Nous sommes ouverts du lundi au vendredi de 9h à 18h, et le samedi de 10h à 16h.", category: 'Horaires', synced: true },
        { id: '2', question: "Comment prendre rendez-vous ?", answer: "Vous pouvez prendre rendez-vous par téléphone, en ligne sur notre site, ou directement avec notre agent vocal.", category: 'Rendez-vous', synced: true },
        { id: '3', question: "Quels sont vos tarifs ?", answer: "Nos tarifs dépendent du service choisi. Contactez-nous pour un devis personnalisé.", category: 'Tarifs', synced: false },
      ]);
    }
    setLoading(false);
  }

  async function handleAddFAQ() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/knowledge/documents'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `FAQ: ${newQuestion}`,
          content: newAnswer,
          type: 'faq',
          metadata: { category: newCategory },
        }),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewQuestion('');
        setNewAnswer('');
        setNewCategory('Général');
        loadFAQs();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
                FAQ
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Questions fréquentes pour votre agent vocal
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter une FAQ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une FAQ..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
          >
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Nouvelle FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Ex: Quels sont vos horaires ?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Réponse</label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={3}
                  placeholder="La réponse que l'agent vocal donnera..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddFAQ}
                  disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredFAQs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune FAQ trouvée.</p>
            <p className="text-sm mt-1">Ajoutez votre première FAQ pour enrichir votre agent vocal.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFAQs.map(faq => (
              <div
                key={faq.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded flex-shrink-0">
                      {faq.category}
                    </span>
                    <span className="font-medium text-gray-900 text-sm truncate">{faq.question}</span>
                    {faq.synced && (
                      <Bot className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" title="Synchronisé avec l'agent" />
                    )}
                  </div>
                  {expandedId === faq.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedId === faq.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700 mt-3 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
