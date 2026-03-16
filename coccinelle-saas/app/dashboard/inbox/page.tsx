'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Inbox, Mail, Send, Loader2, AlertCircle, CheckCircle,
  User, Clock, RefreshCw, ChevronRight, MessageSquare, Settings, Bot, Sparkles
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
}

interface SaraReply {
  reply: string;
  processedAt: string;
  status: string;
}

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [saraReply, setSaraReply] = useState<SaraReply | null>(null);
  const [loadingSaraReply, setLoadingSaraReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingAutoReply, setProcessingAutoReply] = useState(false);
  
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEmails();
  }, []);

  const getToken = () => localStorage.getItem('auth_token');

  const loadEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/email/inbox`, {
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (!response.ok) throw new Error('Erreur lors du chargement');
      
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const selectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setSaraReply(null);
    setError(null);
    
    // Charger la réponse de Sara si elle existe
    try {
      setLoadingSaraReply(true);
      const response = await fetch(`${API_URL}/api/v1/email/conversation/${email.id}`, {
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.saraReply) {
          setSaraReply(data.saraReply);
        }
      }
    } catch (err) {
      console.error('Erreur chargement réponse Sara:', err);
    } finally {
      setLoadingSaraReply(false);
    }
  };

  const handleAutoReply = async () => {
    try {
      setProcessingAutoReply(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/v1/email/auto-reply`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`L'assistant a traité ${data.processed} email(s) !`);
        // Recharger la conversation si un email est sélectionné
        if (selectedEmail) {
          selectEmail(selectedEmail);
        }
      } else {
        throw new Error(data.error || 'Erreur lors du traitement');
      }
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessingAutoReply(false);
    }
  };

  const extractSenderName = (from: string): string => {
    if (!from) return 'Inconnu';
    const match = from.match(/^(.+?)\s*<.+>$/);
    if (match) return match[1].trim();
    return from.split('@')[0];
  };

  const extractSenderEmail = (from: string): string => {
    if (!from) return '';
    const match = from.match(/<(.+)>/);
    if (match) return match[1];
    return from;
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedEmail) return;
    
    try {
      setSending(true);
      setError(null);
      
      const toEmail = extractSenderEmail(selectedEmail.from);
      
      const response = await fetch(`${API_URL}/api/v1/email/send`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${getToken()}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          to: toEmail,
          subject: `Re: ${selectedEmail.subject}`,
          message: replyMessage
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
      
      setSuccess('Email envoyé !');
      setReplyMessage('');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setSending(false); 
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Hier';
      } else if (days < 7) {
        return date.toLocaleDateString('fr-FR', { weekday: 'long' });
      } else {
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      }
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Inbox Email</h1>
                  <p className="text-sm text-gray-500">{emails.length} email{emails.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleAutoReply}
                disabled={processingAutoReply}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                title="L'assistant répond automatiquement"
              >
                {processingAutoReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">IA répond</span>
              </button>
              <button 
                onClick={loadEmails}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Actualiser"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link 
                href="/dashboard/channels/email"
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Configuration"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Messages d'état */}
      <div className="max-w-7xl mx-auto px-4">
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="flex h-full">
            {/* Liste des emails */}
            <div className={`${selectedEmail ? 'hidden md:block' : ''} w-full md:w-1/3 border-r border-gray-200 overflow-y-auto`}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <Mail className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Aucun email reçu</p>
                  <p className="text-sm text-center mt-2">
                    Les emails envoyés à votre adresse Gmail apparaîtront ici.
                  </p>
                  <Link 
                    href="/dashboard/channels/email"
                    className="mt-4 text-blue-600 hover:underline text-sm"
                  >
                    Configurer votre email →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {emails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {extractSenderName(email.from)}
                            </p>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatDate(email.date)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{extractSenderEmail(email.from)}</p>
                          <p className="text-sm font-medium text-gray-800 mt-1 truncate">
                            {email.subject || '(Sans objet)'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {truncateText(email.body, 80)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Détail de l'email */}
            <div className={`${selectedEmail ? '' : 'hidden md:flex'} flex-1 flex flex-col`}>
              {!selectedEmail ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Sélectionnez un email</p>
                  <p className="text-sm">Cliquez sur un email pour voir les détails</p>
                </div>
              ) : (
                <>
                  {/* Header email */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedEmail(null)}
                        className="md:hidden p-2 hover:bg-gray-200 rounded-lg"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {extractSenderName(selectedEmail.from)}
                        </p>
                        <p className="text-sm text-gray-500">{extractSenderEmail(selectedEmail.from)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatDate(selectedEmail.date)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold text-gray-900">{selectedEmail.subject || '(Sans objet)'}</p>
                    </div>
                  </div>

                  {/* Contenu de la conversation */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Email reçu */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                          <p className="whitespace-pre-wrap text-sm text-gray-900">{selectedEmail.body}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(selectedEmail.date)}
                        </div>
                      </div>
                    </div>

                    {/* Réponse de l'assistant */}
                    {loadingSaraReply ? (
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Chargement...</span>
                        </div>
                      </div>
                    ) : saraReply ? (
                      <div className="flex gap-3 justify-end">
                        <div className="flex-1 flex flex-col items-end">
                          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
                            <p className="whitespace-pre-wrap text-sm">{saraReply.reply}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Bot className="w-3 h-3" />
                            Assistant • {formatDate(saraReply.processedAt)}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center py-4">
                        <div className="text-center text-gray-500">
                          <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">L&apos;assistant n&apos;a pas encore répondu</p>
                          <button
                            onClick={handleAutoReply}
                            disabled={processingAutoReply}
                            className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            Cliquez sur &quot;IA répond&quot; pour traiter cet email
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply form */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <form onSubmit={handleSendReply} className="flex gap-3">
                      <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Écrivez votre réponse..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={sending || !replyMessage.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {sending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
