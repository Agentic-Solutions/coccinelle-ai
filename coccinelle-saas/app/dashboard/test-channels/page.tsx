'use client';

import { useState } from 'react';
import { ArrowLeft, Send, MessageSquare, Mail, Phone, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/Logo';

type ChannelType = 'sms' | 'email' | 'whatsapp' | 'auto';

interface TestResult {
  channel: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: string;
}

export default function TestChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('auto');
  const [phoneNumber, setPhoneNumber] = useState('+33612345678');
  const [email, setEmail] = useState('test@example.com');
  const [message, setMessage] = useState('Bonjour, ceci est un message de test depuis Coccinelle.AI');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const handleTest = async () => {
    setLoading(true);
    setResults([]);

    try {
      const newResults: TestResult[] = [];

      // Mode Auto (Orchestrator)
      if (selectedChannel === 'auto') {
        newResults.push({
          channel: 'Orchestrator',
          status: 'pending',
          message: 'Analyse du meilleur canal...',
        });
        setResults([...newResults]);

        const response = await fetch('/api/channels/auto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneNumber,
            email: email,
            message: message,
            subject: 'Message de test Coccinelle.AI',
            priority: 'normal',
            messageType: 'general',
          }),
        });

        const data = await response.json();

        if (data.success) {
          newResults[newResults.length - 1] = {
            channel: 'Orchestrator',
            status: 'success',
            message: `Canal choisi: ${data.channel.toUpperCase()}`,
            details: `${data.decision.reason}\nConfiance: ${(data.decision.confidence * 100).toFixed(0)}%\nCoût: ${data.decision.estimatedCost}€\nDélai: ${data.decision.estimatedDeliveryTime}s`,
          };

          // Ajouter le résultat d'envoi
          newResults.push({
            channel: data.channel.toUpperCase(),
            status: 'success',
            message: `Message envoyé via ${data.channel}`,
            details: `ID: ${data.messageId}\nStatut: ${data.status}${data.fallbackUsed ? `\n⚠️ Fallback utilisé: ${data.fallbackChannel}` : ''}`,
          });
        } else {
          newResults[newResults.length - 1] = {
            channel: 'Orchestrator',
            status: 'error',
            message: data.error || 'Erreur de routage',
            details: data.details,
          };
        }
        setResults([...newResults]);
      }

      // Mode SMS
      if (selectedChannel === 'sms') {
        newResults.push({
          channel: 'SMS',
          status: 'pending',
          message: 'Envoi en cours...',
        });
        setResults([...newResults]);

        const response = await fetch('/api/channels/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phoneNumber, message }),
        });

        const data = await response.json();

        if (data.success) {
          newResults[newResults.length - 1] = {
            channel: 'SMS',
            status: 'success',
            message: 'SMS envoyé avec succès',
            details: `Envoyé au ${data.to}\nDe: ${data.from}\nID: ${data.messageId}`,
          };
        } else {
          newResults[newResults.length - 1] = {
            channel: 'SMS',
            status: 'error',
            message: data.error || 'Erreur d\'envoi',
            details: data.details,
          };
        }
        setResults([...newResults]);
      }

      // Mode Email
      if (selectedChannel === 'email') {
        newResults.push({
          channel: 'Email',
          status: 'pending',
          message: 'Envoi en cours...',
        });
        setResults([...newResults]);

        const response = await fetch('/api/channels/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: 'Message de test Coccinelle.AI',
            message,
          }),
        });

        const data = await response.json();

        if (data.success) {
          newResults[newResults.length - 1] = {
            channel: 'Email',
            status: 'success',
            message: 'Email envoyé avec succès',
            details: `Envoyé à ${data.to}\nSujet: ${data.subject}\nID: ${data.messageId}`,
          };
        } else {
          newResults[newResults.length - 1] = {
            channel: 'Email',
            status: 'error',
            message: data.error || 'Erreur d\'envoi',
            details: data.details,
          };
        }
        setResults([...newResults]);
      }

      // Mode WhatsApp
      if (selectedChannel === 'whatsapp') {
        newResults.push({
          channel: 'WhatsApp',
          status: 'pending',
          message: 'Envoi en cours...',
        });
        setResults([...newResults]);

        const response = await fetch('/api/channels/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phoneNumber, message }),
        });

        const data = await response.json();

        if (data.success) {
          newResults[newResults.length - 1] = {
            channel: 'WhatsApp',
            status: 'success',
            message: 'Message WhatsApp envoyé',
            details: `Envoyé au ${data.to}\nDe: ${data.from}\nID: ${data.messageId}`,
          };
        } else {
          newResults[newResults.length - 1] = {
            channel: 'WhatsApp',
            status: 'error',
            message: data.error || 'Erreur d\'envoi',
            details: data.details,
          };
        }
        setResults([...newResults]);
      }
    } catch (error) {
      setResults([
        {
          channel: 'Error',
          status: 'error',
          message: 'Erreur lors de l\'envoi',
          details: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
    }
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
              <h1 className="text-2xl font-bold text-gray-900">Test des Canaux</h1>
              <p className="text-sm text-gray-600">Testez l'envoi de messages sur tous les canaux</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Configuration */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration du Test</h2>

              {/* Canal */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canal de Communication
                </label>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => setSelectedChannel('auto')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedChannel === 'auto'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Send className="w-6 h-6" />
                      <span className="text-sm font-medium">Auto</span>
                      <span className="text-xs text-gray-500">Orchestrator</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedChannel('sms')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedChannel === 'sms'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="w-6 h-6" />
                      <span className="text-sm font-medium">SMS</span>
                      <span className="text-xs text-gray-500">0.05€/msg</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedChannel('email')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedChannel === 'email'
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Mail className="w-6 h-6" />
                      <span className="text-sm font-medium">Email</span>
                      <span className="text-xs text-gray-500">0.001€/msg</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedChannel('whatsapp')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      selectedChannel === 'whatsapp'
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Phone className="w-6 h-6" />
                      <span className="text-sm font-medium">WhatsApp</span>
                      <span className="text-xs text-gray-500">0.01€/msg</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Coordonnées */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+33612345678"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message de test
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Votre message de test..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length} caractères {message.length > 160 && '(multiple SMS)'}
                </p>
              </div>

              {/* Info canal sélectionné */}
              {selectedChannel === 'auto' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">🤖 Mode Automatique (Orchestrator)</h3>
                  <p className="text-sm text-gray-600">
                    L'Orchestrator analysera le message et choisira automatiquement le meilleur canal
                    selon 9 critères (urgence, coût, longueur, type de contenu, etc.)
                  </p>
                </div>
              )}

              {selectedChannel === 'sms' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">📱 SMS (Twilio)</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Taux d'ouverture: 98%</li>
                    <li>• Délai de livraison: ~10 secondes</li>
                    <li>• Coût: ~0.05€ par message</li>
                    <li>• Idéal pour: Messages urgents, rappels RDV</li>
                  </ul>
                </div>
              )}

              {selectedChannel === 'email' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">✉️ Email (Resend)</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Taux d'ouverture: 20-30%</li>
                    <li>• Délai de livraison: ~1-5 minutes</li>
                    <li>• Coût: ~0.0006€ par message</li>
                    <li>• Idéal pour: Marketing, documents, contenu détaillé</li>
                  </ul>
                </div>
              )}

              {selectedChannel === 'whatsapp' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">💬 WhatsApp (Twilio)</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Taux d'ouverture: 90%</li>
                    <li>• Délai de livraison: ~30 secondes</li>
                    <li>• Coût: ~0.01€ par message</li>
                    <li>• Idéal pour: Rich media, documents, conversations</li>
                    <li>• Note: Nécessite sandbox Twilio ou numéro Business approuvé</li>
                  </ul>
                </div>
              )}

              {/* Bouton envoyer */}
              <button
                onClick={handleTest}
                disabled={loading || !message.trim()}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer le Test
                  </>
                )}
              </button>
            </div>

            {/* Résultats */}
            {results.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Résultats</h2>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900">{result.channel}</h3>
                            <span className="text-xs text-gray-500">
                              {new Date().toLocaleTimeString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{result.message}</p>
                          {result.details && (
                            <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions de configuration */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            ✅ Routes API Opérationnelles
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Les 4 routes API sont maintenant créées et fonctionnelles :</strong>
            </p>
            <ul className="list-none space-y-1 ml-2">
              <li>✅ <code className="bg-white px-2 py-1 rounded">/api/channels/sms/send</code></li>
              <li>✅ <code className="bg-white px-2 py-1 rounded">/api/channels/email/send</code></li>
              <li>✅ <code className="bg-white px-2 py-1 rounded">/api/channels/whatsapp/send</code></li>
              <li>✅ <code className="bg-white px-2 py-1 rounded">/api/channels/auto</code> (Orchestrator)</li>
            </ul>

            <div className="mt-4 pt-4 border-t border-green-300">
              <p className="font-semibold text-gray-900 mb-2">⚙️ Pour envoyer de vrais messages :</p>
              <p className="mb-2">Ajoutez vos clés API dans <code className="bg-white px-2 py-1 rounded">.env.local</code> :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>SMS:</strong> TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER</li>
                <li><strong>Email:</strong> RESEND_API_KEY, FROM_EMAIL, FROM_NAME</li>
                <li><strong>WhatsApp:</strong> TWILIO_WHATSAPP_NUMBER</li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">
                Sans clés API, vous verrez un message d'erreur clair indiquant quelle configuration manque.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
