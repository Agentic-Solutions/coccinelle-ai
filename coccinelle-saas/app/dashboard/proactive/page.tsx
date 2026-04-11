'use client';

import { useState, useEffect } from 'react';
import {
  Bell, Send, Clock, CheckCircle, XCircle, Loader2,
  ToggleLeft, ToggleRight, MessageSquare
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface ProactiveSettings {
  is_active: number;
  hours_start: number;
  hours_end: number;
  preferred_channel: string;
}

interface ProactiveTemplate {
  id: number;
  sector: string;
  trigger_type: string;
  message_vocal: string;
  message_sms: string;
}

interface ProactiveLog {
  id: number;
  client_phone: string;
  client_name: string | null;
  trigger_type: string;
  sector: string;
  channel: string;
  status: string;
  message_sent: string;
  sent_at: string;
}

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function sectorLabel(sector: string): string {
  const map: Record<string, string> = {
    garage: 'Garage automobile',
    notaire: 'Notaire',
    veterinaire: 'Veterinaire',
    comptable: 'Comptable',
    immobilier: 'Immobilier',
    agence_voyage: 'Agence de voyage',
    generic: 'Generique',
  };
  return map[sector] || sector;
}

function triggerLabel(trigger: string): string {
  const map: Record<string, string> = {
    pret: 'Vehicule pret',
    devis: 'Devis disponible',
    signature: 'Acte pret pour signature',
    document_recu: 'Document recu',
    resultats: 'Resultats disponibles',
  };
  return map[trigger] || trigger;
}

export default function ProactivePage() {
  const [settings, setSettings] = useState<ProactiveSettings>({ is_active: 0, hours_start: 8, hours_end: 19, preferred_channel: 'auto' });
  const [templates, setTemplates] = useState<ProactiveTemplate[]>([]);
  const [logs, setLogs] = useState<ProactiveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulaire envoi test
  const [testPhone, setTestPhone] = useState('');
  const [testName, setTestName] = useState('');
  const [testSector, setTestSector] = useState('garage');
  const [testTrigger, setTestTrigger] = useState('pret');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const headers = authHeaders();

    const [settingsRes, templatesRes, logsRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/proactive/settings`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/api/v1/proactive/templates`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${API_URL}/api/v1/proactive/logs`, { headers }).then(r => r.json()).catch(() => null),
    ]);

    if (settingsRes?.settings) setSettings(settingsRes.settings);
    if (templatesRes?.templates) setTemplates(templatesRes.templates);
    if (logsRes?.logs) setLogs(logsRes.logs);
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    await fetch(`${API_URL}/api/v1/proactive/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    setSaving(false);
  }

  async function sendTest() {
    if (!testPhone) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/proactive/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VoixIA-Key': '813f882e34f8b033e398e9a3c0ed38070e98a88e50eeee485ac0e8e06de11cc9',
          'X-VoixIA-Tenant': localStorage.getItem('tenant_id') || '',
        },
        body: JSON.stringify({
          client_phone: testPhone,
          client_name: testName || undefined,
          trigger_type: testTrigger,
          sector: testSector,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success ? `SMS envoye : ${data.message_sent?.substring(0, 80)}...` : (data.error || 'Echec'),
      });
      // Recharger les logs
      const logsRes = await fetch(`${API_URL}/api/v1/proactive/logs`, { headers: authHeaders() }).then(r => r.json()).catch(() => null);
      if (logsRes?.logs) setLogs(logsRes.logs);
    } catch {
      setTestResult({ success: false, message: 'Erreur reseau' });
    }

    setTestSending(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Titre */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-2xl font-bold text-gray-900">Notifications proactives</h1>
        <p className="text-sm text-gray-500 mt-1">Envoyez des SMS automatiques a vos clients selon les evenements metier</p>
      </div>

      {/* SECTION 1 — Statut et configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
          </div>
          <button
            onClick={() => {
              setSettings(s => ({ ...s, is_active: s.is_active ? 0 : 1 }));
            }}
            className="flex items-center gap-2"
          >
            {settings.is_active ? (
              <ToggleRight className="w-8 h-8 text-gray-900" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-300" />
            )}
            <span className={`text-sm font-medium ${settings.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
              {settings.is_active ? 'Active' : 'Desactive'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Heure de debut</label>
            <select
              value={settings.hours_start}
              onChange={e => setSettings(s => ({ ...s, hours_start: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}h00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Heure de fin</label>
            <select
              value={settings.hours_end}
              onChange={e => setSettings(s => ({ ...s, hours_end: parseInt(e.target.value) }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}h00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Canal prefere</label>
            <select
              value={settings.preferred_channel}
              onChange={e => setSettings(s => ({ ...s, preferred_channel: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="auto">Automatique</option>
              <option value="sms">SMS uniquement</option>
            </select>
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* SECTION 2 — Envoyer une notification test */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Send className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Envoyer une notification</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Telephone client</label>
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="+33612345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nom client (optionnel)</label>
            <input
              type="text"
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="Marie Martin"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Secteur</label>
            <select
              value={testSector}
              onChange={e => setTestSector(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="garage">Garage automobile</option>
              <option value="notaire">Notaire</option>
              <option value="veterinaire">Veterinaire</option>
              <option value="comptable">Comptable</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Type de declencheur</label>
            <select
              value={testTrigger}
              onChange={e => setTestTrigger(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="pret">Vehicule pret</option>
              <option value="devis">Devis disponible</option>
              <option value="signature">Acte pret pour signature</option>
              <option value="document_recu">Document recu</option>
              <option value="resultats">Resultats disponibles</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={sendTest}
            disabled={testSending || !testPhone}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>

          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-700' : 'text-red-600'}`}>
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 — Templates disponibles */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Templates disponibles</h2>
        </div>

        {templates.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Aucun template configure
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {sectorLabel(t.sector)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600">
                    {triggerLabel(t.trigger_type)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{t.message_sms}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4 — Historique */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Historique des notifications</h2>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">
            Aucune notification envoyee
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDate(log.sent_at)}</td>
                    <td className="px-6 py-3">
                      <div className="text-gray-900">{log.client_name || 'Inconnu'}</div>
                      <div className="text-xs text-gray-400">{log.client_phone}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{sectorLabel(log.sector)}</td>
                    <td className="px-6 py-3 text-gray-600">{triggerLabel(log.trigger_type)}</td>
                    <td className="px-6 py-3 text-gray-600 uppercase">{log.channel}</td>
                    <td className="px-6 py-3">
                      {log.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Envoye
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="w-3.5 h-3.5" /> Echoue
                        </span>
                      )}
                      {log.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Clock className="w-3.5 h-3.5" /> En attente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
