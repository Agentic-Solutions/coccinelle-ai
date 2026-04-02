'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, HelpCircle, MessageSquare, Ticket,
  ChevronDown, ChevronUp, Send, Loader2, AlertCircle,
  Check, Clock, Search
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
}

type TabId = 'faq' | 'contact' | 'tickets';

const TABS: { id: TabId; label: string; icon: typeof HelpCircle }[] = [
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Contact', icon: MessageSquare },
  { id: 'tickets', label: 'Mes tickets', icon: Ticket },
];

const CATEGORIES = [
  { value: 'general', label: 'Question generale' },
  { value: 'technique', label: 'Probleme technique' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'fonctionnalite', label: 'Demande de fonctionnalite' },
  { value: 'autre', label: 'Autre' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  waiting: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'Ferme', color: 'bg-gray-100 text-gray-700' },
};

const FAQ_CATEGORY_LABELS: Record<string, string> = {
  prise_en_main: 'Prise en main',
  fonctionnalites: 'Fonctionnalites',
  facturation: 'Facturation',
  equipe: 'Equipe',
  securite: 'Securite',
  support: 'Support',
  general: 'General',
};

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabId>('faq');
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [faqSearch, setFaqSearch] = useState('');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formPriority, setFormPriority] = useState('normal');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }
    return null;
  };

  // Load FAQ
  useEffect(() => {
    loadFaq();
  }, []);

  // Load tickets when tab changes
  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const loadFaq = async () => {
    setFaqLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/faq`);
      const data = await res.json();
      if (data.success) {
        setFaqItems(data.items || []);
      }
    } catch (err) {
      console.error('Error loading FAQ:', err);
    } finally {
      setFaqLoading(false);
    }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      const token = getToken();
      if (!token) {
        setFormError('Non authentifie. Veuillez vous reconnecter.');
        return;
      }

      const res = await fetch(`${API_URL}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formSubject,
          message: formMessage,
          category: formCategory,
          priority: formPriority,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess(true);
        setFormSubject('');
        setFormMessage('');
        setFormCategory('general');
        setFormPriority('normal');
      } else {
        setFormError(data.error || 'Erreur lors de la creation du ticket.');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setFormError('Erreur de connexion au serveur.');
    } finally {
      setFormLoading(false);
    }
  };

  // Filter FAQ by search
  const filteredFaq = faqSearch.trim()
    ? faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
          item.answer.toLowerCase().includes(faqSearch.toLowerCase())
      )
    : faqItems;

  // Group FAQ by category
  const faqByCategory = filteredFaq.reduce<Record<string, FaqItem[]>>((acc, item) => {
    const cat = item.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Aide & Support</h1>
            <p className="text-sm text-gray-500">FAQ, contact et suivi de vos demandes</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab: FAQ */}
        {activeTab === 'faq' && (
          <div>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans la FAQ..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {faqLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredFaq.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <HelpCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>Aucun resultat pour votre recherche.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(faqByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      {FAQ_CATEGORY_LABELS[category] || category}
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                      {items.map((item) => {
                        const isOpen = openFaqId === item.id;
                        return (
                          <div key={item.id}>
                            <button
                              onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900 pr-4">
                                {item.question}
                              </span>
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </button>
                            {isOpen && (
                              <div className="px-5 pb-4">
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {item.answer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Contact */}
        {activeTab === 'contact' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nous contacter</h2>
            <p className="text-sm text-gray-500 mb-6">
              Decrivez votre probleme ou question. Notre equipe vous repondra dans les meilleurs delais.
            </p>

            {formSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Ticket cree avec succes</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Un email de confirmation vous a ete envoye. Suivez votre ticket dans l&apos;onglet &quot;Mes tickets&quot;.
                  </p>
                </div>
                <button onClick={() => setFormSuccess(false)} className="ml-auto text-green-500 hover:text-green-700 text-sm">
                  Fermer
                </button>
              </div>
            )}

            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{formError}</p>
                <button onClick={() => setFormError(null)} className="ml-auto text-red-500 hover:text-red-700 text-sm">
                  Fermer
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                  placeholder="Decrivez brievement votre demande"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorite</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="Decrivez votre probleme en detail..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading || !formSubject.trim() || !formMessage.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Envoyer
              </button>
            </form>
          </div>
        )}

        {/* Tab: Tickets */}
        {activeTab === 'tickets' && (
          <div>
            {ticketsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <Ticket className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">Aucun ticket de support</p>
                <p className="text-gray-400 text-xs mt-1">
                  Vos tickets apparaitront ici une fois crees.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const statusInfo = STATUS_LABELS[ticket.status] || STATUS_LABELS.open;
                  const priorityColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal;
                  return (
                    <div
                      key={ticket.id}
                      className="bg-white border border-gray-200 rounded-xl p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor}`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{ticket.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <span className="text-gray-300">|</span>
                        <span>{ticket.category}</span>
                      </div>
                      {ticket.admin_response && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">Reponse du support :</p>
                          <p className="text-sm text-blue-800">{ticket.admin_response}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
