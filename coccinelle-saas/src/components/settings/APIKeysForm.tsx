'use client';

import { useState, useEffect } from 'react';
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at?: string;
}

export default function APIKeysForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    fetchAPIKeys();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Erreur chargement cles API:', error);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      setMessage('Veuillez entrer un nom pour la cle');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setShowNewKey(true);
        setNewKeyName('');
        fetchAPIKeys();
      } else {
        const error = await res.json();
        setMessage(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setMessage('Erreur lors de la generation de la cle');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Etes-vous sur de vouloir revoquer cette cle ? Cette action est irreversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMessage('Cle revoquee avec succes');
        fetchAPIKeys();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Erreur lors de la revocation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Cle copiee dans le presse-papier');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cles API</h2>
        <p className="text-gray-600">Gerez vos cles d'acces a l'API Coccinelle</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.startsWith('Cle revoquee') || message.startsWith('Cle copiee')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {showNewKey && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-4">
            <Key className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Cle API generee</h3>
              <p className="text-sm text-green-700 mb-4">
                Copiez cette cle maintenant. Elle ne sera plus visible apres.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-white border border-green-200 rounded-lg text-gray-900 font-mono text-sm break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey)}
                  className="px-4 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Generer une nouvelle cle</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nom de la cle (ex: Production API)"
            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            onClick={handleGenerateKey}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Generation...' : 'Generer'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Cles existantes ({apiKeys.length})</h3>

        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune cle API creee pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">Generez une cle pour acceder a l'API Coccinelle</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <h4 className="text-gray-900 font-medium">{key.name}</h4>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>Creee le {new Date(key.created_at).toLocaleDateString('fr-FR')}</span>
                    {key.last_used_at && (
                      <span>Derniere utilisation: {new Date(key.last_used_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <code className="text-xs text-gray-400 font-mono mt-2 block">
                    {key.key.substring(0, 20)}...
                  </code>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Revoquer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
