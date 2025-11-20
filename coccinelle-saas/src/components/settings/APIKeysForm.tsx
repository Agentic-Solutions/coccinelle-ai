'use client';

import { useState, useEffect } from 'react';

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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Erreur chargement clés API:', error);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      setMessage('❌ Veuillez entrer un nom pour la clé');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
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
        setMessage(`❌ Erreur: ${error.message}`);
      }
    } catch (error) {
      setMessage('❌ Erreur lors de la génération de la clé');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cette clé ? Cette action est irréversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMessage('✅ Clé révoquée avec succès');
        fetchAPIKeys();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('❌ Erreur lors de la révocation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('✅ Clé copiée dans le presse-papier');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Clés API</h2>
        <p className="text-gray-400">Gérez vos clés d'accès à l'API Coccinelle</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.startsWith('✅') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
          {message}
        </div>
      )}

      {showNewKey && (
        <div className="p-6 bg-green-900/10 border border-green-800 rounded-lg">
          <div className="flex items-start gap-4">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Clé API générée</h3>
              <p className="text-sm text-gray-400 mb-4">
                Copiez cette clé maintenant. Elle ne sera plus visible après.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-white font-mono text-sm break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedKey)}
                  className="px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Générer une nouvelle clé</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nom de la clé (ex: Production API)"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
          />
          <button
            onClick={handleGenerateKey}
            disabled={loading}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Génération...' : 'Générer'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Clés existantes ({apiKeys.length})</h3>
        
        {apiKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune clé API créée pour le moment
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex-1">
                  <h4 className="text-white font-medium">{key.name}</h4>
                  <div className="flex gap-4 mt-1 text-sm text-gray-400">
                    <span>Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}</span>
                    {key.last_used_at && (
                      <span>Dernière utilisation: {new Date(key.last_used_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <code className="text-xs text-gray-500 font-mono mt-2 block">
                    {key.key.substring(0, 20)}...
                  </code>
                </div>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="px-4 py-2 bg-red-900/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-900/30 transition-colors"
                >
                  Révoquer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
