'use client';

import { useState } from 'react';
import { ArrowLeft, MessageSquare, Mail, Phone, Send, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

interface Message {
  id: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'telegram' | 'voice';
  from: string;
  fromName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  direction: 'inbound' | 'outbound';
}

interface Conversation {
  id: string;
  prospectName: string;
  prospectPhone: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'telegram';
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  status: 'active' | 'closed';
}

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'sms' | 'email' | 'whatsapp' | 'telegram'>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Données de démo
  const demoConversations: Conversation[] = [
    {
      id: '1',
      prospectName: 'Marie Dupont',
      prospectPhone: '+33612345678',
      channel: 'sms',
      lastMessage: 'Merci pour le rappel RDV!',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
      unreadCount: 2,
      status: 'active',
    },
    {
      id: '2',
      prospectName: 'Jean Martin',
      prospectPhone: '+33687654321',
      channel: 'sms',
      lastMessage: 'Je confirme ma visite demain',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
      unreadCount: 0,
      status: 'active',
    },
    {
      id: '3',
      prospectName: 'Sophie Bernard',
      prospectPhone: '+33623456789',
      channel: 'sms',
      lastMessage: 'Besoin d\'annuler le RDV',
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      unreadCount: 1,
      status: 'active',
    },
  ];

  const demoMessages: Message[] = [
    {
      id: '1',
      channel: 'sms',
      from: '+33612345678',
      fromName: 'Marie Dupont',
      content: 'Bonjour, je souhaite prendre RDV',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: true,
      direction: 'inbound',
    },
    {
      id: '2',
      channel: 'sms',
      from: 'Coccinelle.AI',
      fromName: 'Sara (IA)',
      content: 'Bonjour Marie! Avec plaisir. Quelle date vous conviendrait?',
      timestamp: new Date(Date.now() - 1000 * 60 * 28),
      read: true,
      direction: 'outbound',
    },
    {
      id: '3',
      channel: 'sms',
      from: '+33612345678',
      fromName: 'Marie Dupont',
      content: 'Demain après-midi si possible',
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      read: true,
      direction: 'inbound',
    },
    {
      id: '4',
      channel: 'sms',
      from: 'Coccinelle.AI',
      fromName: 'Sara (IA)',
      content: 'Parfait! RDV confirmé demain 15h. Vous recevrez un rappel 24h avant.',
      timestamp: new Date(Date.now() - 1000 * 60 * 23),
      read: true,
      direction: 'outbound',
    },
    {
      id: '5',
      channel: 'sms',
      from: '+33612345678',
      fromName: 'Marie Dupont',
      content: 'Merci pour le rappel RDV!',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
      direction: 'inbound',
    },
  ];

  const filteredConversations = demoConversations.filter(conv => {
    if (activeTab !== 'all' && conv.channel !== activeTab) return false;
    if (searchQuery && !conv.prospectName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const selectedConv = demoConversations.find(c => c.id === selectedConversation);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'telegram': return <Send className="w-4 h-4" />;
      case 'voice': return <Phone className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'sms': return 'text-blue-600 bg-blue-50';
      case 'email': return 'text-green-600 bg-green-50';
      case 'whatsapp': return 'text-emerald-600 bg-emerald-50';
      case 'telegram': return 'text-sky-600 bg-sky-50';
      case 'voice': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    return `Il y a ${days}j`;
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    // TODO: Envoyer le message via l'API
    console.log('Envoi message:', messageInput);
    setMessageInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inbox Omnicanal</h1>
              <p className="text-sm text-gray-600">Tous vos messages en un seul endroit</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Liste des conversations */}
          <div className="w-96 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            {/* Tabs canaux */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setActiveTab('sms')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'sms'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => setActiveTab('email')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'email'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Email
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            {/* Liste des conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full p-4 border-b border-gray-200 text-left hover:bg-gray-50 transition-colors ${
                    selectedConversation === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getChannelColor(conv.channel)}`}>
                      {getChannelIcon(conv.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conv.prospectName}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      {conv.unreadCount > 0 && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                            {conv.unreadCount} nouveau{conv.unreadCount > 1 ? 'x' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zone de conversation */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            {selectedConv ? (
              <>
                {/* Header conversation */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getChannelColor(selectedConv.channel)}`}>
                        {getChannelIcon(selectedConv.channel)}
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">{selectedConv.prospectName}</h2>
                        <p className="text-sm text-gray-600">{selectedConv.prospectPhone}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Filter className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {demoMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.direction === 'outbound'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input message */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Tapez votre message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Envoyer
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Canal: <span className="font-medium capitalize">{selectedConv.channel}</span> •
                    Pressez Entrée pour envoyer
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Sélectionnez une conversation</p>
                  <p className="text-sm">Choisissez une conversation pour commencer à échanger</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
