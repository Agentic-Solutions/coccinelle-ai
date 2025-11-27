'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Save, CheckCircle, AlertCircle, Settings as SettingsIcon, Info } from 'lucide-react';
import Logo from '@/components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function SMSConfigPage() {
  const [config, setConfig] = useState({
    enabled: false,
    configured: false,
    templates: {
      rdvConfirmation: true,
      rdvRappel: true,
      promotions: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testNumber, setTestNumber] = useState('');

  // Charger la config depuis l'API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_URL}/api/v1/channels/sms`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.channel) {
            setConfig(prev => ({
              ...prev,
              enabled: data.channel.enabled,
              configured: data.channel.configured,
              templates: data.channel.config?.templates || prev.templates
            }));
          }
        } else {
          // Fallback localStorage
          const savedConfig = localStorage.getItem('sms_client_config');
          if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
          }
        }
      } catch (e) {
        console.error('Error loading SMS config:', e);
        const savedConfig = localStorage.getItem('sms_client_config');
        if (savedConfig) {
          setConfig(JSON.parse(savedConfig));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Validation
    if (config.enabled && !config.configured) {
      setError('Le canal SMS doit d\'abord être configuré par un administrateur. Contactez le support.');
      setSaving(false);
      return;
    }

    // Sauvegarder via l'API
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/sms`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { templates: config.templates },
          enabled: config.enabled
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      localStorage.setItem('sms_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error('Error saving SMS config:', e);
      localStorage.setItem('sms_client_config', JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testNumber) {
      setError('Veuillez entrer un numéro de téléphone pour le test');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/v1/channels/sms/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toNumber: testNumber })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`SMS de test envoyé avec succès à ${testNumber} !`);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi du SMS de test');
      }
    } catch (e: any) {
      setError('Erreur lors de l\'envoi du SMS: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings/channels">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configuration SMS</h1>
              <p className="text-sm text-gray-600">Configuration du canal SMS via Twilio</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : (
        <>
        {/* Bientôt disponible */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-blue-900 mb-2">Bientôt disponible</h3>
          <p className="text-blue-800 mb-4">
            Le canal SMS est en cours de développement et sera disponible très prochainement.
          </p>
          <p className="text-sm text-blue-700">
            Vous serez notifié dès que cette fonctionnalité sera activée pour votre compte.
          </p>
        </div>

        {/* Hidden original content for future use */}
        {false && saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Configuration SMS enregistrée avec succès !</p>
          </div>
        )}

        {false && error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        )}

        {/* Statut de configuration - hidden for now */}
        {false && !config.configured && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <p className="text-orange-900 font-medium mb-1">Configuration requise</p>
              <p className="text-sm text-orange-800">
                Le canal SMS doit être configuré par un administrateur avant utilisation.
                Contactez <a href="mailto:support@coccinelle.ai" className="underline font-medium">support@coccinelle.ai</a> pour activer ce service.
              </p>
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <div className="flex justify-center">
          <Link href="/dashboard/settings/channels">
            <button className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              Retour aux canaux
            </button>
          </Link>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
