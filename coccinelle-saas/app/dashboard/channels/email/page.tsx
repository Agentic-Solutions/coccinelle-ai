'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, CheckCircle, XCircle, Send, RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface EmailConfig {
  from_name: string;
  from_email: string;
  reply_to: string;
  signature: string;
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string;
}

export default function EmailPage() {
  const [config, setConfig] = useState<EmailConfig>({ from_name: '', from_email: '', reply_to: '', signature: '' });
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [resendOk, setResendOk] = useState(false);
  /**
   * Réception : une boîte est-elle reliée ? Vient de /channels/etat, qui
   * CONSTATE (un jeton OAuth en base) au lieu de lire `channel_configurations`
   * — table fantôme dont on a établi qu'elle ne pilote rien (chantier 2).
   */
  const [receptionActive, setReceptionActive] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const showSuccess = (msg: string) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 4000); };
  const showError = (msg: string) => { setError(msg); setSuccess(''); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [configRes, logsRes, etatRes] = await Promise.all([
        fetch(buildApiUrl('/api/v1/email/config'), { headers }),
        fetch(buildApiUrl('/api/v1/email/logs'), { headers }),
        fetch(buildApiUrl('/api/v1/channels/etat'), { headers }),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig({
          from_name: data.config?.from_name || '',
          from_email: data.config?.from_email || '',
          reply_to: data.config?.reply_to || '',
          signature: data.config?.signature || '',
        });
        setResendOk(!!data.resend_configured);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }

      if (etatRes.ok) {
        const data = await etatRes.json();
        const mail = (data.canaux || []).find((c: { type: string }) => c.type === 'email');
        setReceptionActive(!!mail?.actif);
      }
    } catch {
      showError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/v1/email/config'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showSuccess('Configuration sauvegardée');
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      showError('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  // `handleToggleChannel` a été retiré le 14/08/2026.
  //
  // Il appelait POST /channels/email/enable, qui exige une ligne
  // `channel_configurations` avec `configured = 1`. Cinq tenants sur sept n'en
  // ont aucune : la route répondait 400 « Canal non configuré » — et le code
  // ne testait que `res.ok`, sans `else`. Le client cliquait, rien ne bougeait,
  // AUCUN message n'apparaissait.
  //
  // Même en cas de succès, la colonne ne pilote rien : ni `sms-envoi.js`, ni
  // `resolve-phone`, ni l'agent vocal ne la lisent. Il n'y a donc rien à
  // activer ici — l'envoi marche au niveau plateforme (Resend), et la réception
  // s'active en reliant une boîte, ce que fait le bouton Gmail plus bas.
  //
  // Les routes enable/disable restent en place : d'autres pages `channels/*`
  // s'en servent, et ce lot ne touche qu'à l'e-mail.

  const handleTestSend = async () => {
    if (!testEmail.trim()) { showError('Saisissez une adresse email'); return; }
    setTesting(true);
    setError('');
    try {
      const res = await fetch(buildApiUrl('/api/v1/email/test'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showSuccess('Email de test envoyé !');
        setTestEmail('');
        // Rafraîchir les logs après envoi
        setTimeout(() => loadAll(), 2000);
      } else {
        showError(data.error || 'Échec de l\'envoi');
      }
    } catch {
      showError('Erreur réseau');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-gray-700" />
                Canal Email
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">Configuration de l&apos;envoi email via Resend</p>
            </div>
            <button
              onClick={loadAll}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-800">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-gray-100 border border-gray-400 rounded-lg text-sm text-gray-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* SECTION 1 — Statut, en DEUX SENS (14/08/2026)
            ─────────────────────────────────────────────
            Un badge unique « Actif / Inactif » ne pouvait pas dire la vérité :
            l'envoi et la réception ne s'activent pas de la même façon et
            n'étaient pas dans le même état. La page affichait « Inactif » sur
            un canal dont l'ENVOI fonctionnait — et proposait un bouton qui
            échouait en 400 sans le moindre message.

            L'envoi dépend de Resend, au niveau plateforme. La réception dépend
            d'un jeton OAuth par tenant, lu par /channels/etat. Deux faits, deux
            lignes — et aucun interrupteur, puisqu'il n'y a rien à basculer. */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Statut du canal</h2>
          <div className="space-y-3">
            <EtatCanal
              titre="Envoi"
              actif={resendOk}
              detail={resendOk
                ? 'Vos e-mails partent normalement.'
                : 'Clé Resend absente — aucun e-mail ne peut partir.'}
            />
            <EtatCanal
              titre="Réception"
              actif={receptionActive}
              detail={receptionActive
                ? 'Une boîte est reliée : votre assistant lit les messages qui vous arrivent.'
                : 'Aucune boîte reliée. Connectez-en une ci-dessous pour que votre assistant lise vos e-mails.'}
            />
          </div>
        </div>

        {/* SECTION 1bis — RÉCEPTION : connecter une boîte (14/08/2026)
            ────────────────────────────────────────────────────────────
            Cette page ne réglait que l'ENVOI (expéditeur Resend, test, logs).
            Relier une boîte pour LIRE les e-mails n'existait nulle part dans
            l'interface : aucune page n'appelait /api/v1/oauth/google/authorize,
            alors que la route fonctionne (GOOGLE_CLIENT_ID et REDIRECT_URI en
            vars, CLIENT_SECRET en secret, 302 vérifié en production). Le canal
            e-mail était donc inactivable depuis le produit.

            Gmail seul : Outlook et Yahoo ne sont pas fonctionnels à 100 %
            (CLAUDE.md § b), et un bouton qui mène à une déception coûte plus
            cher qu'un bouton absent.

            ⚠️ DETTE — la route attend le JWT dans l'URL (`?token=`). Un jeton de
            30 jours atterrit donc dans l'historique du navigateur, dans les
            journaux de tout intermédiaire, et dans le `Referer` envoyé à Google.
            C'est le contrat existant du backend, pas un choix de cette page.
            Remplacement par un jeton court à usage unique : backlog, PRIORITAIRE
            (0,5 j, cf. PLAN-NAVIGATION.md § 13). */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Recevoir les e-mails</h2>
          <p className="text-sm text-gray-500 mb-4">
            Reliez votre boîte pour que votre assistant lise les messages qui vous arrivent.
          </p>
          <a
            href={urlConnexionGmail()}
            onClick={(e) => {
              // Recalculé au clic : `useAuth` rafraîchit le jeton en arrière-plan,
              // et une URL figée au montage partirait avec l'ancien — donc un 401
              // silencieux au retour de Google.
              e.preventDefault();
              window.location.href = urlConnexionGmail();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Connecter ma boîte Gmail
          </a>
          <p className="text-xs text-gray-400 mt-3">
            Vous serez redirigé vers Google, puis ramené ici.
          </p>
        </div>

        {/* SECTION 2 — Configuration expéditeur */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Configuration expéditeur</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;expéditeur</label>
              <input
                type="text"
                value={config.from_name}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                placeholder="Sara — Coccinelle.ai"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email d&apos;envoi</label>
              <input
                type="email"
                value={config.from_email}
                onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                placeholder="sara@coccinelle.ai"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de réponse (reply-to)</label>
              <input
                type="email"
                value={config.reply_to}
                onChange={(e) => setConfig({ ...config, reply_to: e.target.value })}
                placeholder="contact@monentreprise.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <input
                type="text"
                value={config.signature}
                onChange={(e) => setConfig({ ...config, signature: e.target.value })}
                placeholder="L'équipe Coccinelle.ai"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* SECTION 3 — Test d'envoi */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Test d&apos;envoi</h2>
          <p className="text-sm text-gray-600 mb-3">Envoyez un email de test pour vérifier la configuration Resend.</p>
          <div className="flex items-center gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleTestSend()}
            />
            <button
              onClick={handleTestSend}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {testing ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>

        {/* SECTION 4 — Historique */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold text-gray-900">Historique des envois</h2>
            <p className="text-sm text-gray-500 mt-1">Les 20 derniers emails envoyés via Resend</p>
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Aucun email envoyé pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinataire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-900 font-mono text-xs">{log.recipient}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 max-w-[200px] truncate">{log.subject}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'sent' || log.status === 'delivered'
                            ? 'bg-gray-100 text-gray-800'
                            : log.status === 'failed'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-gray-50 text-gray-500'
                        }`}>
                          {log.status === 'sent' || log.status === 'delivered' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {log.status === 'sent' ? 'Envoyé' : log.status === 'delivered' ? 'Délivré' : log.status === 'failed' ? 'Échoué' : log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {new Date(log.sent_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Emails envoyés via Resend &middot; {logs.length} envoi(s) dans l&apos;historique
        </p>
      </div>
    </div>
  );
}

/**
 * URL de connexion Gmail.
 *
 * Le jeton voyage en paramètre parce que la route l'attend ainsi : c'est une
 * navigation de page, pas un `fetch` — aucun en-tête `Authorization` ne peut
 * l'accompagner. Le `redirect` ramène ici après le passage chez Google.
 *
 * Appelée au rendu (pour l'attribut `href`, qui garde le lien réel) ET au clic,
 * qui seul fait foi : `useAuth` rafraîchit le jeton en arrière-plan, et une URL
 * figée au montage partirait avec l'ancien.
 */
function urlConnexionGmail(): string {
  const jeton = typeof window !== 'undefined'
    ? (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '')
    : '';
  const retour = encodeURIComponent('/dashboard/channels/email');
  return buildApiUrl(`/api/v1/oauth/google/authorize?token=${encodeURIComponent(jeton)}&redirect=${retour}`);
}

/**
 * Une ligne d'état : un fait, sa conséquence pour le client.
 *
 * On ne dit pas « configuré » (mot d'administrateur) mais ce que ça change :
 * « vos e-mails partent normalement ». Un statut que le client ne sait pas
 * traduire ne lui apprend rien.
 */
function EtatCanal({ titre, actif, detail }: { titre: string; actif: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
        actif ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {actif ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {titre}
      </span>
      <p className="text-sm text-gray-600 pt-1">{detail}</p>
    </div>
  );
}
