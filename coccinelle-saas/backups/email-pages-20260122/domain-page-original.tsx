'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Globe, Plus, Trash2, CheckCircle, AlertCircle,
  Loader2, Copy, Check, RefreshCw, ExternalLink
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
}

interface EmailDomain {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'failed';
  fromEmail: string;
  fromName: string;
  dnsRecords: DnsRecord[];
  verifiedAt: string | null;
  createdAt: string;
}

export default function EmailDomainPage() {
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [adding, setAdding] = useState(false);
  
  // Verification state
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const getToken = () => localStorage.getItem('auth_token');

  const loadDomains = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/channels/email/domains`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des domaines');
      }

      const data = await response.json();
      setDomains(data.domains || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    try {
      setAdding(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/channels/email/domains`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: newDomain.trim(),
          fromEmail: fromEmail.trim() || `contact@${newDomain.trim()}`,
          fromName: fromName.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ajout du domaine');
      }

      setSuccess('Domaine ajouté ! Configurez maintenant vos DNS.');
      setNewDomain('');
      setFromEmail('');
      setFromName('');
      setShowAddForm(false);
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/channels/email/domains/${domainId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la vérification');
      }

      if (data.verified) {
        setSuccess('Domaine vérifié avec succès !');
      } else {
        setError('Les DNS ne sont pas encore propagés. Réessayez dans quelques minutes.');
      }

      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(null);
    }
  };

  const handleDelete = async (domainId: string, domainName: string) => {
    if (!confirm(`Supprimer le domaine ${domainName} ?`)) return;

    try {
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/channels/email/domains/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      setSuccess('Domaine supprimé');
      await loadDomains();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard/channels/email" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la configuration Email
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Domaine personnalisé
          </h1>
          <p className="text-gray-600 mt-1">
            Envoyez des emails depuis votre propre domaine (ex: contact@votre-entreprise.fr)
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {success}
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">×</button>
          </div>
        )}

        {/* Add Domain Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter un domaine
          </button>
        )}

        {/* Add Domain Form */}
        {showAddForm && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow border">
            <h2 className="text-lg font-semibold mb-4">Ajouter un domaine</h2>
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domaine *
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="votre-entreprise.fr"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez votre domaine sans "www" ni "http"
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email d'envoi
                </label>
                <input
                  type="text"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder={`contact@${newDomain || 'votre-domaine.fr'}`}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'affichage
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Mon Entreprise"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={adding || !newDomain.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                  {adding ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Domains List */}
        {!loading && domains.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-white rounded-lg shadow border">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun domaine configuré</h3>
            <p className="text-gray-500 mb-4">
              Ajoutez votre domaine pour envoyer des emails professionnels
            </p>
          </div>
        )}

        {!loading && domains.map((domain) => (
          <div key={domain.id} className="mb-4 p-6 bg-white rounded-lg shadow border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {domain.domain}
                  {domain.status === 'verified' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Vérifié
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      En attente
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  Emails envoyés depuis: {domain.fromEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {domain.status !== 'verified' && (
                  <button
                    onClick={() => handleVerify(domain.id)}
                    disabled={verifying === domain.id}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1"
                  >
                    {verifying === domain.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Vérifier
                  </button>
                )}
                <button
                  onClick={() => handleDelete(domain.id, domain.domain)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DNS Records */}
            {domain.status !== 'verified' && domain.dnsRecords && domain.dnsRecords.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Enregistrements DNS à ajouter
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Nom</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Valeur</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Statut</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {domain.dnsRecords.map((record, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {record.type}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs max-w-[200px] truncate">
                            {record.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs max-w-[300px] truncate">
                            {record.value}
                          </td>
                          <td className="px-3 py-2">
                            {record.status === 'verified' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => copyToClipboard(record.value)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Copier"
                            >
                              {copiedValue === record.value ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Ajoutez ces enregistrements dans la configuration DNS de votre hébergeur (OVH, Cloudflare, etc.)
                  puis cliquez sur "Vérifier". La propagation DNS peut prendre jusqu'à 48h.
                </p>
              </div>
            )}

            {domain.status === 'verified' && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Ce domaine est vérifié et prêt à envoyer des emails !
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Help Section */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">Comment ça marche ?</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
            <li>Ajoutez votre domaine ci-dessus</li>
            <li>Copiez les enregistrements DNS fournis</li>
            <li>Ajoutez-les dans votre hébergeur DNS (OVH, Cloudflare, GoDaddy...)</li>
            <li>Attendez la propagation (quelques minutes à 48h)</li>
            <li>Cliquez sur "Vérifier" pour confirmer</li>
            <li>Vos emails seront envoyés depuis votre domaine !</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
