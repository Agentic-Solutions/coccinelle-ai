'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Mail, Phone, Search, User, ExternalLink, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
}

interface Conversation {
  id: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_name: string | null;
  current_channel: string;
  active_channels: string[];
  last_intent: string | null;
  last_sentiment: string | null;
  status: string;
  last_message: string | null;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  created_at: string;
  prospect: Prospect | null;
  customer_id: string | null;
}

interface Message {
  id: string;
  channel: string;
  direction: string;
  content: string;
  content_type: string;
  sender_role: string;
  sentiment: string | null;
  created_at: string;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [linking, setLinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  const fetchConversations = async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    try {
      const params = new URLSearchParams({ status: 'all', limit: '100' });
      if (activeTab !== 'all') params.set('channel', activeTab);

      const res = await fetch(`${API_URL}/api/v1/omnichannel/inbox/conversations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (convId: string) => {
    const token = getToken();
    if (!token) return;

    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/omnichannel/inbox/conversations/${convId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSelectedConv(data.conversation || null);
      }
    } catch (err) {
      console.error('Fetch detail error:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAutoLink = async () => {
    if (!selectedId) return;
    const token = getToken();
    if (!token) return;

    setLinking(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/omnichannel/inbox/conversations/${selectedId}/link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.prospect) {
          setSelectedConv(prev => prev ? { ...prev, prospect: data.prospect } : null);
          setConversations(prev => prev.map(c =>
            c.id === selectedId ? { ...c, prospect: data.prospect } : c
          ));
        }
      }
    } catch (err) {
      console.error('Link error:', err);
    } finally {
      setLinking(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (selectedId) {
      fetchConversationDetail(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.customer_name?.toLowerCase().includes(q) ||
      conv.customer_phone?.includes(q) ||
      conv.customer_email?.toLowerCase().includes(q) ||
      conv.prospect?.first_name?.toLowerCase().includes(q) ||
      conv.prospect?.last_name?.toLowerCase().includes(q) ||
      conv.last_message?.toLowerCase().includes(q)
    );
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'voice': return <Phone className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'sms': return 'text-blue-600 bg-blue-50';
      case 'email': return 'text-green-600 bg-green-50';
      case 'whatsapp': return 'text-emerald-600 bg-emerald-50';
      case 'voice': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Maintenant';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.prospect) {
      return [conv.prospect.first_name, conv.prospect.last_name].filter(Boolean).join(' ');
    }
    if (conv.customer_name) return conv.customer_name;
    return conv.customer_phone || conv.customer_email || 'Inconnu';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard/conversations" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Inbox</h1>
            <p className="text-xs text-gray-500">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className={`w-full sm:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col ${selectedId ? 'hidden sm:flex' : 'flex'}`}>
          {/* Channel tabs */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex gap-1 mb-3">
              {['all', 'sms', 'email', 'whatsapp', 'voice'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'all' ? 'Tous' : tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full p-3 border-b border-gray-100 text-left transition-colors ${
                    selectedId === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${getChannelColor(conv.current_channel)}`}>
                      {getChannelIcon(conv.current_channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {getDisplayName(conv)}
                        </h3>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTimestamp(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message || 'Pas de message'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {conv.prospect && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Prospect lie</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {conv.status === 'active' ? 'Actif' : 'Ferme'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel: messages + prospect info */}
        <div className={`flex-1 flex ${selectedId ? 'flex' : 'hidden sm:flex'}`}>
          {selectedConv ? (
            <>
              {/* Messages area */}
              <div className="flex-1 flex flex-col">
                {/* Conversation header */}
                <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="sm:hidden p-1 hover:bg-gray-100 rounded"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className={`p-1.5 rounded-lg ${getChannelColor(selectedConv.current_channel)}`}>
                      {getChannelIcon(selectedConv.current_channel)}
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900 text-sm">{getDisplayName(selectedConv)}</h2>
                      <p className="text-xs text-gray-500">
                        {selectedConv.customer_phone || selectedConv.customer_email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <p className="text-sm">Aucun message</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.direction === 'outbound'
                              ? 'bg-gray-900 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-1 mt-1 text-gray-400">
                            <span className="text-xs">{msg.sender_role === 'agent' ? 'IA' : ''}</span>
                            <span className="text-xs">{formatTimestamp(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Prospect panel (right sidebar) */}
              <div className="w-72 bg-white border-l border-gray-200 hidden xl:flex flex-col">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Fiche contact</h3>
                </div>

                <div className="p-3 flex-1 overflow-y-auto">
                  {selectedConv.prospect ? (
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {[selectedConv.prospect.first_name, selectedConv.prospect.last_name].filter(Boolean).join(' ')}
                          </span>
                        </div>
                        {selectedConv.prospect.phone && (
                          <p className="text-xs text-blue-700 mb-1">{selectedConv.prospect.phone}</p>
                        )}
                        {selectedConv.prospect.email && (
                          <p className="text-xs text-blue-700 mb-1">{selectedConv.prospect.email}</p>
                        )}
                        {selectedConv.prospect.status && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded capitalize">
                            {selectedConv.prospect.status}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/crm/prospects/${selectedConv.prospect.id}`}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir la fiche
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 mb-1">Aucun prospect lie</p>
                        <p className="text-xs text-gray-400">
                          {selectedConv.customer_phone || selectedConv.customer_email || 'Contact inconnu'}
                        </p>
                      </div>

                      <button
                        onClick={handleAutoLink}
                        disabled={linking}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {linking ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Lier automatiquement
                      </button>

                      <Link
                        href={`/dashboard/crm/prospects/new?phone=${encodeURIComponent(selectedConv.customer_phone || '')}&email=${encodeURIComponent(selectedConv.customer_email || '')}&name=${encodeURIComponent(selectedConv.customer_name || '')}`}
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        Creer un prospect
                      </Link>
                    </div>
                  )}

                  {/* Conversation metadata */}
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <h4 className="text-xs font-medium text-gray-500 uppercase">Info conversation</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Canal</span>
                        <span className="font-medium capitalize">{selectedConv.current_channel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Statut</span>
                        <span className={`font-medium ${selectedConv.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                          {selectedConv.status === 'active' ? 'Actif' : 'Ferme'}
                        </span>
                      </div>
                      {selectedConv.last_sentiment && (
                        <div className="flex justify-between">
                          <span>Sentiment</span>
                          <span className="font-medium capitalize">{selectedConv.last_sentiment}</span>
                        </div>
                      )}
                      {selectedConv.last_intent && (
                        <div className="flex justify-between">
                          <span>Intent</span>
                          <span className="font-medium">{selectedConv.last_intent}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500">Selectionnez une conversation</p>
                <p className="text-sm mt-1">Choisissez une conversation pour voir les messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
