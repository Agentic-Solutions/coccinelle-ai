'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Globe, Plus, Trash2, CheckCircle, AlertCircle,
  Loader2, Copy, Check, RefreshCw, Mail, HelpCircle, Send, TestTube,
  ChevronDown, ChevronUp, ExternalLink, Inbox, LogOut
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  description: string;
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

interface ProviderStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

export default function EmailConfigPage() {
  const [activeTab, setActiveTab] = useState<'gmail' | 'outlook' | 'yahoo' | 'domain' | 'test'>('gmail');
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [fromEmail, setFromEmail] = useState('contact');
  const [fromName, setFromName] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test depuis Coccinelle.AI');
  const [testMessage, setTestMessage] = useState('Ceci est un email de test.');
  const [sending, setSending] = useState(false);
  
  // OAuth states for each provider
  const [gmailStatus, setGmailStatus] = useState<ProviderStatus>({ connected: false });
  const [outlookStatus, setOutlookStatus] = useState<ProviderStatus>({ connected: false });
  const [yahooStatus, setYahooStatus] = useState<ProviderStatus>({ connected: false });
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => { 
    loadDomains(); 
    loadAllProviderStatus();
    
    // Check URL params for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const provider = urlParams.get('provider');
    const connected = urlParams.get('connected') === 'true';
    const email = urlParams.get('email');
    
    if (connected && provider) {
      setSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} connecté avec succès ! (${email})`);
      if (provider === 'gmail' || provider === 'google') setGmailStatus({ connected: true, email: email || undefined });
      if (provider === 'outlook') setOutlookStatus({ connected: true, email: email || undefined });
      if (provider === 'yahoo') setYahooStatus({ connected: true, email: email || undefined });
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Legacy support for gmail_connected
    if (urlParams.get('gmail_connected') === 'true') {
      setSuccess(`Gmail connecté avec succès ! (${email})`);
      setGmailStatus({ connected: true, email: email || undefined });
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (urlParams.get('error')) {
      setError('Erreur lors de la connexion. Veuillez réessayer.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  useEffect(() => {
    const pendingDomain = domains.find(d => d.status !== 'verified');
    if (pendingDomain && !expandedDomain) {
      setExpandedDomain(pendingDomain.id);
    }
  }, [domains]);

  const getToken = () => localStorage.getItem('auth_token');

  const loadAllProviderStatus = async () => {
    loadProviderStatus('google', setGmailStatus);
    loadProviderStatus('outlook', setOutlookStatus);
    loadProviderStatus('yahoo', setYahooStatus);
  };

  const loadProviderStatus = async (provider: string, setStatus: (s: ProviderStatus) => void) => {
    try {
      setProviderLoading(provider);
      const response = await fetch(`${API_URL}/api/v1/oauth/${provider}/status`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error(`Erreur chargement status ${provider}:`, err);
    } finally {
      setProviderLoading(null);
    }
  };

  const handleConnectProvider = (provider: 'google' | 'outlook' | 'yahoo') => {
    const token = getToken();
    window.location.href = `${API_URL}/api/v1/oauth/${provider}/authorize?redirect=/dashboard/channels/email&token=${token}`;
  };

  const handleDisconnectProvider = async (provider: 'google' | 'outlook' | 'yahoo', setStatus: (s: ProviderStatus) => void, providerName: string) => {
    if (!confirm(`Déconnecter ${providerName} ? Sara ne pourra plus lire ni envoyer d'emails depuis ce compte.`)) return;
    try {
      setDisconnecting(provider);
      const response = await fetch(`${API_URL}/api/v1/oauth/${provider}/disconnect`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setStatus({ connected: false });
        setSuccess(`${providerName} déconnecté`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDisconnecting(null);
    }
  };

  const loadDomains = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/v1/channels/email/domains`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setDomains(data.domains || []);
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      setAdding(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v1/channels/email/domains`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain.trim().toLowerCase(),
          fromEmail: `${fromEmail}@${newDomain.trim().toLowerCase()}`,
          fromName: fromName || newDomain.trim()
        })
      });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Erreur'); }
      setSuccess('Domaine ajouté ! Configurez les DNS ci-dessous.');
      setNewDomain(''); setFromEmail('contact'); setFromName('');
      await loadDomains();
    } catch (err: any) { setError(err.message); } 
    finally { setAdding(false); }
  };

  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);
      const response = await fetch(`${API_URL}/api/v1/channels/email/domains/${domainId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.verified) setSuccess('Domaine vérifié !');
      else setError('DNS non propagés. Réessayez dans quelques minutes.');
      await loadDomains();
    } catch (err: any) { setError(err.message); } 
    finally { setVerifying(null); }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Supprimer ce domaine ?')) return;
    try {
      await fetch(`${API_URL}/api/v1/channels/email/domains/${domainId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      setSuccess('Domaine supprimé');
      await loadDomains();
    } catch (err: any) { setError(err.message); }
  };

  const copyToClipboard = (value: string, fieldId: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    try {
      setSending(true); setError(null); setSuccess(null);
      const response = await fetch(`${API_URL}/api/v1/channels/email/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: testEmail.trim(), subject: testSubject, message: testMessage })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur');
      setSuccess(`Email envoyé à ${testEmail} !`);
      setTestEmail('');
    } catch (err: any) { setError(err.message); } 
    finally { setSending(false); }
  };

  const getFullDnsRecords = (domain: string): DnsRecord[] => [
    { type: 'MX', name: '@', value: 'coccinelle-api.youssef-amrouche.workers.dev', priority: 10, description: '📥 Réception - Pour recevoir les emails' },
    { type: 'TXT', name: '@', value: 'v=spf1 include:amazonses.com ~all', description: '📤 SPF - Autorisation d\'envoi' },
    { type: 'CNAME', name: 'resend._domainkey', value: `resend._domainkey.${domain}.at.resend.dev`, description: '📤 DKIM - Signature des emails' },
    { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none;', description: '🔒 DMARC - Politique de sécurité' }
  ];

  // Composant réutilisable pour chaque provider
  const ProviderCard = ({ 
    provider, 
    providerName, 
    status, 
    icon, 
    bgColor,
    onConnect,
    onDisconnect
  }: {
    provider: 'google' | 'outlook' | 'yahoo';
    providerName: string;
    status: ProviderStatus;
    icon: React.ReactNode;
    bgColor: string;
    onConnect: () => void;
    onDisconnect: () => void;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-xl ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Connecter {providerName}</h2>
          <p className="text-gray-500">Permettez à Sara de lire et répondre aux emails de votre compte {providerName}</p>
        </div>
      </div>

      {providerLoading === provider ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : status.connected ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-green-800">{providerName} connecté</p>
                <p className="text-green-700">{status.email}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Sara peut maintenant :</h3>
            <ul className="space-y-1 text-blue-800 text-sm">
              <li>📥 Lire les emails reçus sur {status.email}</li>
              <li>📤 Répondre aux emails au nom de {status.email}</li>
              <li>🤖 Traiter automatiquement les demandes clients</li>
            </ul>
          </div>

          <button
            onClick={onDisconnect}
            disabled={disconnecting === provider}
            className="w-full px-6 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
          >
            {disconnecting === provider ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Déconnexion...</>
            ) : (
              <><LogOut className="w-5 h-5" />Déconnecter {providerName}</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">En connectant {providerName}, Sara pourra :</h3>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li>✓ Lire les emails de votre boîte de réception</li>
              <li>✓ Répondre aux clients automatiquement</li>
              <li>✓ Envoyer des emails au nom de votre adresse</li>
            </ul>
          </div>

          <button
            onClick={onConnect}
            className="w-full px-6 py-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all flex items-center justify-center gap-3"
          >
            {icon}
            <span className="font-medium text-gray-700">Continuer avec {providerName}</span>
          </button>

          <p className="text-xs text-gray-500 text-center">
            Vos données sont sécurisées. Coccinelle n'a accès qu'aux emails et ne stocke pas vos identifiants.
          </p>
        </div>
      )}
    </div>
  );

  // Icons pour chaque provider
  const GmailIcon = ({ size = 'w-8 h-8' }: { size?: string }) => (
    <svg className={`${size} text-red-500`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  );

  const OutlookIcon = ({ size = 'w-8 h-8' }: { size?: string }) => (
    <svg className={size} viewBox="0 0 24 24">
      <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.59.234h-8.86v-6.9l1.26.915c.097.064.202.096.318.096a.53.53 0 00.318-.096l7.37-5.345c.096-.074.18-.106.25-.096.075.01.126.064.152.16v-.022zM23.082 5.906L15.59 11.39l-.276.2-1.002.727V5.906h8.77zm-9.77 12.844V5.906H1.75c-.23 0-.426.078-.59.234a.806.806 0 00-.234.59v10.478c0 .23.078.426.234.59.164.156.36.234.59.234h11.562zM7.5 9c.656 0 1.22.234 1.69.703.47.47.704 1.034.704 1.69 0 .47-.117.898-.352 1.286a2.426 2.426 0 01-.937.937 2.469 2.469 0 01-1.29.352c-.656 0-1.22-.235-1.69-.704a2.307 2.307 0 01-.703-1.69c0-.656.234-1.22.703-1.69.47-.47 1.034-.704 1.69-.704h.185zm0 1.172a1.2 1.2 0 00-.879.363 1.2 1.2 0 00-.363.879c0 .343.121.636.363.879.242.242.536.363.879.363.343 0 .636-.121.879-.363.242-.243.363-.536.363-.88 0-.342-.121-.636-.363-.878a1.2 1.2 0 00-.879-.363z"/>
    </svg>
  );

  const YahooIcon = ({ size = 'w-8 h-8' }: { size?: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="#6001D2">
      <path d="M10.816 8.194l-3.354 7.774-1.236 5.056h-3.79l1.236-5.056L0 8.194h4.106l2.035 5.152 2.035-5.152h2.64zm2.397 12.83V8.194h3.79v12.83h-3.79zm5.45-9.31c.666 0 1.234.236 1.702.71.468.473.702 1.044.702 1.713 0 .669-.234 1.24-.702 1.713-.468.474-1.036.71-1.702.71-.666 0-1.233-.236-1.7-.71a2.333 2.333 0 01-.703-1.713c0-.669.234-1.24.702-1.713.468-.474 1.035-.71 1.701-.71z"/>
    </svg>
  );

  const GoogleColorIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  const MicrosoftColorIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z"/>
      <path fill="#00A4EF" d="M1 13h10v10H1z"/>
      <path fill="#7FBA00" d="M13 1h10v10H13z"/>
      <path fill="#FFB900" d="M13 13h10v10H13z"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/channels" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Configuration Email</h1>
                  <p className="text-sm text-gray-500">Envoyez et recevez des emails professionnels</p>
                </div>
              </div>
            </div>
            <Link href="/dashboard/inbox" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Inbox className="w-4 h-4" />
              Voir l'Inbox
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            <button onClick={() => setActiveTab('gmail')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'gmail' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <div className="flex items-center gap-2">
                <GmailIcon size="w-4 h-4" />
                Gmail
                {gmailStatus.connected && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
              </div>
            </button>
            
            <button onClick={() => setActiveTab('outlook')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'outlook' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <div className="flex items-center gap-2">
                <OutlookIcon size="w-4 h-4" />
                Outlook
                {outlookStatus.connected && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
              </div>
            </button>
            
            <button onClick={() => setActiveTab('yahoo')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'yahoo' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <div className="flex items-center gap-2">
                <YahooIcon size="w-4 h-4" />
                Yahoo
                {yahooStatus.connected && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
              </div>
            </button>
            
            <button onClick={() => setActiveTab('domain')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'domain' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4" />Domaine personnalisé</div>
            </button>
            
            <button onClick={() => setActiveTab('test')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'test' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <div className="flex items-center gap-2"><TestTube className="w-4 h-4" />Tester l'envoi</div>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500">×</button>
          </div>
        )}

        {activeTab === 'gmail' && (
          <div className="space-y-6">
            <ProviderCard
              provider="google"
              providerName="Gmail"
              status={gmailStatus}
              icon={<GoogleColorIcon />}
              bgColor="bg-red-50"
              onConnect={() => handleConnectProvider('google')}
              onDisconnect={() => handleDisconnectProvider('google', setGmailStatus, 'Gmail')}
            />
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <button onClick={() => setShowHelp(!showHelp)} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Questions fréquentes</span>
                </div>
                <span className="text-blue-600">{showHelp ? '−' : '+'}</span>
              </button>
              {showHelp && (
                <div className="mt-4 space-y-4 text-sm text-blue-800">
                  <div>
                    <p className="font-medium">Pourquoi connecter Gmail ?</p>
                    <p>Sara peut lire et répondre aux emails de vos clients automatiquement, directement depuis votre adresse Gmail professionnelle.</p>
                  </div>
                  <div>
                    <p className="font-medium">Mes données sont-elles sécurisées ?</p>
                    <p>Oui. Nous utilisons OAuth2 (la méthode officielle de Google). Nous n'avons jamais accès à votre mot de passe.</p>
                  </div>
                  <div>
                    <p className="font-medium">Puis-je déconnecter à tout moment ?</p>
                    <p>Oui, vous pouvez déconnecter Gmail à tout moment depuis cette page ou depuis les paramètres de votre compte Google.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'outlook' && (
          <div className="space-y-6">
            <ProviderCard
              provider="outlook"
              providerName="Outlook"
              status={outlookStatus}
              icon={<MicrosoftColorIcon />}
              bgColor="bg-blue-50"
              onConnect={() => handleConnectProvider('outlook')}
              onDisconnect={() => handleDisconnectProvider('outlook', setOutlookStatus, 'Outlook')}
            />
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">À propos d'Outlook</span>
              </div>
              <p className="text-sm text-blue-800">
                Compatible avec les adresses <strong>@outlook.com</strong>, <strong>@hotmail.com</strong>, <strong>@live.com</strong> et les comptes Microsoft 365 professionnels.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'yahoo' && (
          <div className="space-y-6">
            <ProviderCard
              provider="yahoo"
              providerName="Yahoo"
              status={yahooStatus}
              icon={<YahooIcon size="w-6 h-6" />}
              bgColor="bg-purple-50"
              onConnect={() => handleConnectProvider('yahoo')}
              onDisconnect={() => handleDisconnectProvider('yahoo', setYahooStatus, 'Yahoo')}
            />
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">À propos de Yahoo</span>
              </div>
              <p className="text-sm text-purple-800">
                Compatible avec les adresses <strong>@yahoo.com</strong>, <strong>@yahoo.fr</strong>, <strong>@ymail.com</strong> et <strong>@rocketmail.com</strong>.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'domain' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
            ) : (
              <>
                {domains.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter votre domaine</h2>
                    <p className="text-gray-600 mb-4">Configurez votre domaine pour <strong>envoyer ET recevoir</strong> des emails professionnels.</p>
                    <form onSubmit={handleAddDomain} className="space-y-4">
                      <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="exemple: salon-marie.fr" className="w-full px-4 py-3 border rounded-lg" required />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
                          <div className="flex">
                            <input type="text" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contact" className="flex-1 px-3 py-2 border rounded-l-lg" />
                            <span className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-gray-500 text-sm">@{newDomain || 'domaine.fr'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'expéditeur</label>
                          <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Salon Marie" className="w-full px-3 py-2 border rounded-lg" />
                        </div>
                      </div>
                      <button type="submit" disabled={adding} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">
                        {adding ? 'Ajout...' : 'Ajouter le domaine'}
                      </button>
                    </form>
                  </div>
                )}

                {domains.map((domain) => {
                  const isExpanded = expandedDomain === domain.id;
                  const dnsRecords = getFullDnsRecords(domain.domain);
                  return (
                    <div key={domain.id} className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                      <button onClick={() => setExpandedDomain(isExpanded ? null : domain.id)} className="w-full p-6 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${domain.status === 'verified' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            {domain.status === 'verified' ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Globe className="w-6 h-6 text-yellow-600" />}
                          </div>
                          <div className="text-left">
                            <h3 className="font-bold text-gray-900">{domain.domain}</h3>
                            <p className="text-sm text-gray-500">{domain.fromEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${domain.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {domain.status === 'verified' ? '✓ Vérifié' : '⏳ En attente'}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                          {domain.status !== 'verified' && (
                            <div className="mt-6">
                              <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">📋</span>
                                <h4 className="font-bold text-gray-900">Configurez ces 4 enregistrements DNS</h4>
                              </div>
                              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-amber-800 text-sm"><strong>⚠️ Important :</strong> L'enregistrement <strong>MX</strong> est nécessaire pour <strong>recevoir</strong> les emails.</p>
                              </div>
                              <div className="space-y-4">
                                {dnsRecords.map((record, index) => (
                                  <div key={index} className={`rounded-lg p-4 border ${record.type === 'MX' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${record.type === 'MX' ? 'bg-blue-600 text-white' : record.type === 'TXT' ? 'bg-gray-600 text-white' : 'bg-purple-100 text-purple-800'}`}>{record.type}</span>
                                      <span className="text-sm text-gray-600">{record.description}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Nom {record.priority !== undefined && `| Priorité: ${record.priority}`}</label>
                                        <div className="flex items-center gap-2">
                                          <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">{record.name}</code>
                                          <button onClick={() => copyToClipboard(record.name, `${index}-name`)} className="p-2 hover:bg-blue-100 rounded">
                                            {copiedField === `${index}-name` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                          </button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Valeur</label>
                                        <div className="flex items-center gap-2">
                                          <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono truncate" title={record.value}>{record.value}</code>
                                          <button onClick={() => copyToClipboard(record.value, `${index}-value`)} className="p-2 hover:bg-blue-100 rounded">
                                            {copiedField === `${index}-value` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => handleVerify(domain.id)} disabled={verifying === domain.id} className="mt-6 w-full px-6 py-3 bg-gray-900 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                {verifying === domain.id ? <><Loader2 className="w-5 h-5 animate-spin" />Vérification...</> : <><RefreshCw className="w-5 h-5" />Vérifier la configuration DNS</>}
                              </button>
                            </div>
                          )}
                          {domain.status === 'verified' && (
                            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-green-800">✅ <strong>Domaine vérifié !</strong></p>
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t flex justify-end">
                            <button onClick={() => handleDelete(domain.id)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm">
                              <Trash2 className="w-4 h-4" />Supprimer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {activeTab === 'test' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Envoyer un email de test</h2>
            <form onSubmit={handleSendTest} className="space-y-4">
              <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="votre-email@exemple.com" className="w-full px-4 py-3 border rounded-lg" required />
              <input type="text" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} placeholder="Sujet" className="w-full px-4 py-3 border rounded-lg" />
              <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={4} className="w-full px-4 py-3 border rounded-lg" />
              <button type="submit" disabled={sending} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-5 h-5 animate-spin" />Envoi...</> : <><Send className="w-5 h-5" />Envoyer</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
