'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus, RefreshCw, AlertCircle, CheckCircle, XCircle, MessageSquare, Mic } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface PhoneNumber {
  id: string;
  number: string;
  label: string;
  status: 'active' | 'inactive';
  channels: string[];
  tenant: string;
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadNumbers();
  }, []);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/channels/numbers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.numbers && data.numbers.length > 0) {
          setNumbers(data.numbers);
        } else {
          setNumbers(getDefaultNumbers());
        }
      } else {
        setNumbers(getDefaultNumbers());
      }
    } catch {
      setNumbers(getDefaultNumbers());
    } finally {
      setLoading(false);
    }
  };

  function getDefaultNumbers(): PhoneNumber[] {
    return [
      {
        id: 'twilio_fr_1',
        number: '+33 9 39 03 57 60',
        label: 'Ligne principale',
        status: 'active',
        channels: ['Voix', 'SMS'],
        tenant: 'Mon entreprise',
      },
      {
        id: 'twilio_fr_2',
        number: '+33 9 39 03 57 61',
        label: 'Ligne secondaire',
        status: 'inactive',
        channels: ['Voix'],
        tenant: 'Mon entreprise',
      },
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Phone className="w-6 h-6 text-gray-700" />
                Numéros de téléphone
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">Gérez vos numéros professionnels</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadNumbers}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Ajouter un numéro
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Total numéros</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{numbers.length}</p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Actifs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {numbers.filter(n => n.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Canaux configurés</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {new Set(numbers.flatMap(n => n.channels)).size}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Chargement...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canaux</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {numbers.map((num) => (
                  <tr key={num.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 font-mono">{num.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{num.label}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        num.status === 'active'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-50 text-gray-500'
                      }`}>
                        {num.status === 'active' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {num.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {num.channels.map((ch) => (
                          <span
                            key={ch}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                          >
                            {ch === 'Voix' ? <Mic className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{num.tenant}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          {numbers.length} numéro(s) configuré(s)
        </div>
      </div>

      {/* Modal "Prochainement" */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prochainement</h3>
            <p className="text-sm text-gray-600 mb-6">
              L&apos;ajout de numéros supplémentaires sera disponible dans une prochaine mise à jour.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
