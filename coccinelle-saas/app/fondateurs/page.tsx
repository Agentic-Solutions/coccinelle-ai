'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

const WORKER_URL = 'https://formulaire-validation.youssef-amrouche.workers.dev';

const SECTEURS = [
  'Notaire',
  'Avocat',
  'M\u00e9decin',
  'Syndic',
  'Immobilier',
  'Automobile',
  'Dentiste',
  'Restaurant & H\u00f4tellerie',
  'Beaut\u00e9 & Bien-\u00eatre',
  'Fitness & Sport',
  '\u00c9ducation & Formation',
  'E-commerce',
  'Artisan & BTP',
  'Autre',
];

const SITUATIONS = [
  { value: 'rate_appels', label: 'Je rate des appels pendant mon activit\u00e9' },
  { value: 'standard_deborde', label: 'Mon standard est d\u00e9bord\u00e9' },
  { value: 'ameliorer_accueil', label: 'Je veux am\u00e9liorer mon accueil client' },
];

type Step = 'form' | 'result' | 'confirmed';
type Offre = 'fondateur' | 'priorite';

export default function FondateursPage() {
  const [step, setStep] = useState<Step>('form');
  const [secteur, setSecteur] = useState('');
  const [situation, setSituation] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('secteur');
    if (param) {
      const map: Record<string, string> = {
        syndic: 'Syndic', notaire: 'Notaire', medecin: 'M\u00e9decin', avocat: 'Avocat',
        immobilier: 'Immobilier', automobile: 'Automobile', restaurant: 'Restaurant & H\u00f4tellerie',
        beaute: 'Beaut\u00e9 & Bien-\u00eatre', sante: 'M\u00e9decin', juridique: 'Avocat',
      };
      const match = map[param.toLowerCase()];
      if (match && SECTEURS.includes(match)) setSecteur(match);
    }
  }, []);
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [offre, setOffre] = useState<Offre>('fondateur');
  const [remaining, setRemaining] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!secteur || !situation || !nom || !email || !telephone) return;
    setLoading(true);
    setError('');

    try {
      // 1) Submit survey + get offre
      const surveyRes = await fetch(`${WORKER_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secteur, situation }),
      });
      const surveyData = await surveyRes.json();
      const offreType: Offre = surveyData.offre === 'fondateur' ? 'fondateur' : 'priorite';
      setOffre(offreType);
      setRemaining(surveyData.remaining || 0);

      // 2) Insert into waitlist
      await fetch(`${WORKER_URL}/waitlist-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, telephone, secteur, offre: offreType }),
      });

      setStep('result');

      // Brief pause to show badge, then auto-confirm
      setTimeout(() => setStep('confirmed'), 2500);
    } catch {
      setError('Erreur de connexion. Veuillez r\u00e9essayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">
            Coccinelle<span className="text-gray-400">.ai</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Retour au site
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium mb-6">
            Places limit&eacute;es &mdash; 2 par secteur
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Devenez Membre Fondateur
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Acc&egrave;s prioritaire. Tarif garanti &agrave; vie.
          </p>
        </div>
      </section>

      {/* ── Ce que vous obtenez ────────────────────────────────── */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Colonne gauche */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-orange-600 text-xs font-bold mb-4">
                &#9733; Membre Fondateur
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ce que vous obtenez</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  '2 mois gratuits',
                  '\u221220% \u00e0 vie tant que vous restez abonn\u00e9',
                  'Acc\u00e8s \u00e0 toutes les fonctionnalit\u00e9s Pro',
                  'Configuration personnalis\u00e9e par Youssef',
                  'Influence directe sur la roadmap',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-gray-900 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne droite */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Ce qu&rsquo;on vous demande</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Tester l\u2019agent vocal sur vos vrais appels',
                  'Feedback mensuel de 15 minutes',
                  'T\u00e9moignage si vous \u00eates satisfait',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Formulaire / Resultat / Confirmation ──────────────── */}
      <section className="pb-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Formulaire ─────────────────────────────────────── */}
          {step === 'form' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Rejoignez les Fondateurs
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Secteur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Votre secteur d&rsquo;activit&eacute; *
                  </label>
                  <select
                    value={secteur}
                    onChange={(e) => setSecteur(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">-- Choisissez --</option>
                    {SECTEURS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Situation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Votre situation *
                  </label>
                  <div className="space-y-2">
                    {SITUATIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSituation(s.value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-2 rounded-lg text-sm text-left transition-all ${
                          situation === s.value
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          situation === s.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                        }`}>
                          {situation === s.value && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="text-gray-700">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pr&eacute;nom et Nom *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email professionnel *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean@entreprise.fr"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Telephone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    T&eacute;l&eacute;phone *
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !secteur || !situation || !nom || !email || !telephone}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi en cours...' : (
                    <>Rejoindre les Fondateurs <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── Resultat (badge) ────────────────────────────────── */}
          {step === 'result' && (
            <div className="text-center py-8">
              {offre === 'fondateur' ? (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold mb-4">
                    &#9733; Membre Fondateur
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    F&eacute;licitations !
                  </h3>
                  <p className="text-gray-600 text-sm">
                    <strong>2 mois gratuits + &minus;20% &agrave; vie</strong>
                    <br />Il restait {remaining} place{remaining > 1 ? 's' : ''} dans votre secteur.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold mb-4">
                    &#9670; Acc&egrave;s Prioritaire
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Bonne nouvelle !
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Les places Fondateur sont prises, mais vous b&eacute;n&eacute;ficiez de
                    <br /><strong>1 mois gratuit + &minus;10% &agrave; vie</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Confirmation ────────────────────────────────────── */}
          {step === 'confirmed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-gray-900" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Votre demande est enregistr&eacute;e
              </h2>
              <p className="text-gray-500 mb-2">
                {offre === 'fondateur'
                  ? 'Votre place Membre Fondateur est r\u00e9serv\u00e9e.'
                  : 'Votre Acc\u00e8s Prioritaire est confirm\u00e9.'}
              </p>
              <p className="text-gray-900 font-semibold mb-8">
                Youssef vous contacte personnellement dans les 48h.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                D&eacute;couvrir Coccinelle.ai <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>&copy; 2026 Agentic Solutions SASU &mdash; Toulouse, France</span>
          <Link href="/legal/politique-confidentialite" className="hover:text-gray-600 transition-colors">
            Politique de confidentialit&eacute;
          </Link>
        </div>
      </footer>
    </div>
  );
}
