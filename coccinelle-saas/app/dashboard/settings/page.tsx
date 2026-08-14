'use client';

/**
 * « Réglages » — une seule page (chantier NAVIGATION, 14/08/2026).
 *
 * Remplace l'ancienne page à onglets. Trois principes tenus de la maquette :
 *   1. tout est sur une page, sections déjà ouvertes ;
 *   2. la VALEUR de chaque réglage est lisible sans cliquer — un réglage qu'il
 *      faut ouvrir pour connaître est un réglage qu'on ne vérifie jamais ;
 *   3. l'édition se fait en place, sans changer de page.
 *
 * La recherche indexe les réglages ET les pages : ~40 pages ne figurent plus
 * dans aucun menu depuis le retrait du mode Avancé, et c'est ici qu'on les
 * retrouve. C'est une exigence, pas un bonus.
 *
 * Les horaires et le transfert ne sont PAS ici : ils vivent dans « Mon
 * assistant », là où on voit leur effet sur ce que l'assistant dit.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';
import { CX2, LIEN_POLICES, POLICE_MONO, POLICE_TEXTE } from '@/components/cx2/theme';
import {
  PAGES_INDEXEES, plier,
  type LigneReglage, type SectionReglages,
} from '@/components/cx2/reglages/types';
import BlocsArret from '@/components/cx2/reglages/BlocsArret';

const SECTEURS = [
  'automobile', 'artisan', 'immobilier', 'syndic', 'sante', 'dentiste',
  'restaurant', 'beaute', 'fitness', 'ecommerce', 'juridique', 'education',
  'generaliste', 'autre',
];

export default function PageReglages() {
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState('');
  /** Deuxième champ, utilisé par le seul réglage qui en demande deux. */
  const [second, setSecond] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [societe, setSociete] = useState<Record<string, string>>({});
  const [compte, setCompte] = useState<Record<string, string>>({});
  const [abo, setAbo] = useState<Record<string, string>>({});
  const [equipe, setEquipe] = useState<number | null>(null);

  const charger = useCallback(async () => {
    try {
      // `/settings` porte déjà le compte, la société ET les notifications :
      // pas besoin d'un appel de plus pour l'utilisateur courant.
      const lire = (url: string) => fetch(buildApiUrl(url), { headers: getAuthHeaders() })
        .then((r) => r.json()).catch(() => null);
      const [reglages, abonnement, membres] = await Promise.all([
        lire('/api/v1/settings'),
        lire('/api/v1/billing/subscription'),
        lire('/api/v1/team/members-with-skills'),
      ]);

      const c = reglages?.company || {};
      setSociete({
        name: c.name || '',
        sector: c.sector || '',
        address: c.address || '',
        phone: c.phone || '',
        email_pro: c.email_pro || '',
      });

      const a = reglages?.account || {};
      setCompte({
        name: [a.first_name, a.last_name].filter(Boolean).join(' '),
        email: a.email || '',
        phone: a.phone || '',
        phone_verified: a.phone_verified ? 'oui' : 'non',
      });

      const s = abonnement?.subscription || {};
      setAbo({
        plan: s.plan || '',
        statut: s.status || '',
        jours: s.trial_days_remaining != null ? String(s.trial_days_remaining) : '',
      });
      setEquipe(Array.isArray(membres?.members) ? membres.members.length : null);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  /** Écrit un champ société, puis relit — on affiche ce qui est en base. */
  const enregistrerSociete = async (cle: string, valeur: string) => {
    setEnregistrement(true);
    try {
      const res = await fetch(buildApiUrl('/api/v1/settings/company'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [cle]: valeur }),
      });
      if (!res.ok) throw new Error('Enregistrement refusé par le serveur');
      setSociete((s) => ({ ...s, [cle]: valeur }));
      setMessage('Enregistré.');
      setEnEdition(null);
    } catch (e) { setMessage((e as Error).message); } finally { setEnregistrement(false); }
  };

  /**
   * Le nom ET le mot de passe passent par la même route. Le nom est découpé en
   * prénom / nom sur le premier espace, comme le fait le serveur en lecture.
   */
  const enregistrerCompte = async (cle: string, valeur: string, second?: string) => {
    setEnregistrement(true);
    try {
      let corps: Record<string, string>;
      if (cle === 'nom') {
        const morceaux = valeur.trim().split(/\s+/);
        corps = { first_name: morceaux[0] || '', last_name: morceaux.slice(1).join(' ') };
      } else {
        // Un mot de passe peut contenir n'importe quoi, espaces compris : les
        // deux valeurs voyagent séparément, jamais concaténées.
        corps = { current_password: valeur, new_password: second || '' };
      }
      const res = await fetch(buildApiUrl('/api/v1/settings/account'), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(corps),
      });
      const retour = await res.json().catch(() => ({}));
      if (!res.ok || retour?.success === false) {
        throw new Error(retour?.error || 'Enregistrement refusé par le serveur');
      }
      if (cle === 'nom') setCompte((c) => ({ ...c, name: valeur.trim() }));
      setMessage(cle === 'nom' ? 'Enregistré.' : 'Mot de passe modifié.');
      setEnEdition(null);
    } catch (e) { setMessage((e as Error).message); } finally { setEnregistrement(false); }
  };

  const PLANS: Record<string, string> = {
    trial: 'Essai', essentiel: 'Essentiel', starter: 'Essentiel', pro: 'Pro', business: 'Business',
  };

  const sections: SectionReglages[] = useMemo(() => [
    {
      id: 'atelier',
      titre: 'Mon entreprise',
      aide: 'Ce que votre assistant annonce à vos clients',
      lignes: [
        {
          id: 'nom', label: 'Nom de l\'entreprise', aide: 'Prononcé à chaque appel',
          valeur: societe.name || '—',
          edition: { type: 'texte', cle: 'name' },
          motsCles: ['raison sociale', 'société', 'garage'],
        },
        {
          id: 'adresse', label: 'Adresse', aide: 'Donnée aux clients qui la demandent',
          valeur: societe.address || '—',
          edition: { type: 'texte', cle: 'address' },
          motsCles: ['où', 'localisation', 'accès'],
        },
        {
          id: 'secteur', label: 'Métier', aide: 'Détermine la façon de parler de votre assistant',
          valeur: societe.sector || '—',
          edition: { type: 'choix', cle: 'sector', options: SECTEURS.map((s) => ({ valeur: s, libelle: s })) },
          motsCles: ['activité', 'secteur'],
        },
        {
          id: 'horaires', label: 'Horaires d\'ouverture',
          aide: 'Se règlent là où l\'on voit ce qu\'ils changent',
          valeur: 'Dans Mon assistant',
          lien: { href: '/dashboard/assistant', libelle: 'Ouvrir' },
          motsCles: ['ouverture', 'fermeture', 'jours'],
        },
      ],
    },
    {
      id: 'joindre',
      titre: 'Comment vos clients vous joignent',
      aide: 'Vos lignes et vos messages',
      lignes: [
        {
          id: 'tel', label: 'Téléphone de l\'entreprise', aide: 'Celui que composent vos clients',
          valeur: societe.phone || '—',
          edition: { type: 'texte', cle: 'phone', placeholder: '+33…' },
          motsCles: ['numéro', 'ligne'],
        },
        {
          id: 'emailpro', label: 'E-mail de l\'entreprise', valeur: societe.email_pro || '—',
          edition: { type: 'texte', cle: 'email_pro' },
          motsCles: ['mail', 'contact'],
        },
        {
          id: 'numeros', label: 'Mes numéros', aide: 'Lignes rattachées à votre compte',
          valeur: 'Voir la liste',
          lien: { href: '/dashboard/channels/numbers', libelle: 'Ouvrir' },
          motsCles: ['numéro', 'twilio', 'ligne'],
        },
        {
          id: 'boite', label: 'Boîte e-mail reliée', aide: 'Pour lire et répondre aux e-mails',
          valeur: 'Voir la connexion',
          lien: { href: '/dashboard/channels/email', libelle: 'Ouvrir' },
          motsCles: ['gmail', 'outlook', 'yahoo', 'oauth'],
        },
      ],
    },
    {
      id: 'equipe',
      titre: 'Mon équipe',
      aide: 'Qui accède au tableau de bord',
      lignes: [
        {
          id: 'membres', label: 'Personnes autorisées',
          aide: 'Chacune avec ses propres droits',
          valeur: equipe != null ? `${equipe} personne${equipe > 1 ? 's' : ''}` : '—',
          lien: { href: '/dashboard/teams', libelle: 'Gérer' },
          motsCles: ['équipe', 'utilisateurs', 'droits', 'rôles', 'collaborateurs'],
        },
      ],
    },
    {
      id: 'abonnement',
      titre: 'Abonnement et documents',
      aide: 'Votre formule et vos copies de données',
      lignes: [
        {
          id: 'plan', label: 'Formule',
          valeur: abo.statut === 'trialing' && abo.jours
            ? `${PLANS[abo.plan] || abo.plan}, ${abo.jours} jours restants`
            : (PLANS[abo.plan] || abo.plan || '—'),
          lien: { href: '/dashboard/billing', libelle: 'Gérer' },
          motsCles: ['plan', 'prix', 'formule', 'essai'],
        },
        {
          id: 'paiement', label: 'Moyen de paiement', valeur: 'Voir',
          lien: { href: '/dashboard/billing/payment', libelle: 'Ouvrir' },
          motsCles: ['carte', 'prélèvement', 'stripe'],
        },
        {
          id: 'factures', label: 'Factures', valeur: 'Voir',
          lien: { href: '/dashboard/billing/invoices', libelle: 'Ouvrir' },
          motsCles: ['facture', 'comptable', 'document'],
        },
        {
          id: 'export', label: 'Exporter mes données', aide: 'Appels et clients, en tableur',
          valeur: 'Télécharger',
          lien: { href: '/dashboard/analytics/export', libelle: 'Ouvrir' },
          motsCles: ['export', 'csv', 'tableur', 'sauvegarde'],
        },
      ],
    },
    {
      id: 'compte',
      titre: 'Mon compte',
      aide: 'Vos informations personnelles',
      lignes: [
        {
          id: 'moi-nom', label: 'Mon nom', valeur: compte.name || '—',
          edition: { type: 'texte', cle: 'nom', placeholder: 'Prénom Nom' },
          motsCles: ['prénom', 'identité'],
        },
        { id: 'moi-mail', label: 'Adresse e-mail de connexion', valeur: compte.email || '—', motsCles: ['identifiant', 'login'] },
        {
          id: 'moi-tel', label: 'Mon téléphone',
          aide: compte.phone_verified === 'oui'
            ? 'Vérifié — c\'est lui qui vous identifie quand vous appelez votre assistant pour l\'essayer'
            : 'Non vérifié — votre assistant ne vous reconnaîtra pas si vous l\'appelez',
          valeur: compte.phone || '—',
          motsCles: ['portable', 'mobile', 'vérification'],
        },
        {
          id: 'motdepasse', label: 'Mot de passe',
          aide: 'Au moins 8 caractères, une majuscule, une minuscule et un chiffre',
          valeur: '••••••••',
          edition: { type: 'motdepasse', cle: 'password' },
          motsCles: ['sécurité', 'connexion', 'changer'],
        },
      ],
    },
  ], [societe, abo, compte, equipe]);

  // ── Recherche : réglages ET pages ──
  const q = plier(recherche.trim());
  const sectionsFiltrees = q
    ? sections
      .map((s) => ({
        ...s,
        lignes: s.lignes.filter((l) =>
          plier(l.label).includes(q)
          || plier(l.aide || '').includes(q)
          || plier(l.valeur).includes(q)
          || (l.motsCles || []).some((m) => plier(m).includes(q))),
      }))
      .filter((s) => s.lignes.length > 0)
    : sections;

  const pagesTrouvees = q
    ? PAGES_INDEXEES.filter((p) => plier(p.titre).includes(q) || p.motsCles.some((m) => plier(m).includes(q)))
    : [];

  const nbReglages = sectionsFiltrees.reduce((n, s) => n + s.lignes.length, 0);

  if (chargement) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 className="animate-spin" color={CX2.texteDiscret} />
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href={LIEN_POLICES} />
      <div style={{
        fontFamily: POLICE_TEXTE, color: CX2.encre, background: CX2.fond,
        minHeight: '100%', padding: '32px 36px 64px',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          <header style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>Réglages</h1>
              <p style={{ margin: 0, fontSize: 14.5, color: CX2.texteSecondaire }}>
                Tout est sur cette page. Cliquez sur une ligne pour la modifier.
              </p>
            </div>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 9,
              border: `1px solid ${recherche ? CX2.encre : CX2.bordure}`,
              borderRadius: 10, background: CX2.surface, padding: '0 13px',
            }}>
              <Search size={15} color={CX2.texteSecondaire} strokeWidth={1.8} />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un réglage ou une page"
                style={{
                  border: 'none', background: 'transparent', padding: '11px 0',
                  fontSize: 14, color: CX2.encre, width: 240, outline: 'none',
                }}
              />
              {recherche && (
                <span style={{ fontSize: 12.5, color: CX2.texteDiscret, fontFamily: POLICE_MONO, whiteSpace: 'nowrap' }}>
                  {nbReglages + pagesTrouvees.length}
                </span>
              )}
            </span>
          </header>

          {message && (
            <div style={{
              marginBottom: 14, padding: '11px 15px', border: `1px solid ${CX2.bordure}`,
              background: CX2.surface, borderRadius: 10, fontSize: 13.5,
            }}>
              {message}
              <button type="button" onClick={() => setMessage(null)} style={{
                float: 'right', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: CX2.texteSecondaire, textDecoration: 'underline',
              }}>Fermer</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

            {/* Sommaire collant — un repère, pas une obligation */}
            <nav style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 13.5,
                    color: CX2.texteSecondaire, textDecoration: 'none',
                  }}
                >
                  {s.titre}
                </a>
              ))}
              <span style={{ marginTop: 10, padding: '8px 10px', fontSize: 12.5, color: '#c2c1ba' }}>
                Le sommaire suit votre défilement
              </span>
            </nav>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Pages trouvées — la contrepartie du retrait du mode Avancé */}
              {pagesTrouvees.length > 0 && (
                <section style={{ background: CX2.surface, border: `1px solid ${CX2.bordure}`, borderRadius: 14, padding: '24px 26px' }}>
                  <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Pages</h2>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: CX2.texteTertiaire }}>
                    Ces écrans ne sont pas dans le menu, mais ils existent.
                  </p>
                  {pagesTrouvees.map((p) => (
                    <Link
                      key={p.href}
                      href={p.href}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 15px', alignItems: 'center', gap: 18,
                        padding: '15px 0', borderTop: `1px solid ${CX2.separateur}`,
                        textDecoration: 'none', color: CX2.encre, fontSize: 15,
                      }}
                    >
                      {p.titre}
                      <ChevronRight size={14} color="#c2c1ba" strokeWidth={1.8} />
                    </Link>
                  ))}
                </section>
              )}

              {sectionsFiltrees.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  style={{ background: CX2.surface, border: `1px solid ${CX2.bordure}`, borderRadius: 14, padding: '24px 26px', scrollMarginTop: 24 }}
                >
                  <h2 style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.titre}</h2>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: CX2.texteTertiaire }}>{s.aide}</p>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {s.lignes.map((l) => (
                      <Ligne
                        key={l.id}
                        ligne={l}
                        edition={enEdition === l.id}
                        brouillon={brouillon}
                        setBrouillon={setBrouillon}
                        second={second}
                        setSecond={setSecond}
                        occupe={enregistrement}
                        onOuvrir={() => {
                          setEnEdition(l.id);
                          setSecond('');
                          setBrouillon(
                            l.edition?.type === 'texte' && l.valeur !== '—' ? l.valeur : '',
                          );
                        }}
                        onAnnuler={() => { setEnEdition(null); setSecond(''); }}
                        onEnregistrer={(valeur, deuxieme) => {
                          if (!l.edition) return;
                          if (s.id === 'compte') return enregistrerCompte(l.edition.cle, valeur, deuxieme);
                          return enregistrerSociete(l.edition.cle, valeur);
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}

              {q && nbReglages === 0 && pagesTrouvees.length === 0 && (
                <p style={{ fontSize: 14, color: CX2.texteDiscret, padding: '8px 2px' }}>
                  Rien ne correspond à « {recherche} ».
                </p>
              )}

              {!q && <BlocsArret />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Une ligne : en lecture, ou dépliée en édition. */
function Ligne({
  ligne, edition, brouillon, setBrouillon, second, setSecond,
  occupe, onOuvrir, onAnnuler, onEnregistrer,
}: {
  ligne: LigneReglage;
  edition: boolean;
  brouillon: string;
  setBrouillon: (v: string) => void;
  second: string;
  setSecond: (v: string) => void;
  occupe: boolean;
  onOuvrir: () => void;
  onAnnuler: () => void;
  onEnregistrer: (valeur: string, second?: string) => void;
}) {
  const bordure = { borderTop: `1px solid ${CX2.separateur}`, padding: '15px 0' };

  if (ligne.lien) {
    return (
      <Link href={ligne.lien.href} style={{ ...bordure, textDecoration: 'none', color: CX2.encre, display: 'block' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 15px', gap: 18, alignItems: 'center' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 15 }}>{ligne.label}</span>
            {ligne.aide && <span style={{ fontSize: 12.5, color: CX2.texteDiscret }}>{ligne.aide}</span>}
          </span>
          <span style={{ fontSize: 13.5, color: CX2.texteSecondaire, whiteSpace: 'nowrap' }}>{ligne.valeur}</span>
          <ChevronRight size={14} color="#c2c1ba" strokeWidth={1.8} />
        </div>
      </Link>
    );
  }

  if (!ligne.edition) {
    return (
      <div style={bordure}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 15 }}>{ligne.label}</span>
            {ligne.aide && <span style={{ fontSize: 12.5, color: CX2.texteDiscret }}>{ligne.aide}</span>}
          </span>
          <span style={{ fontSize: 13.5, color: CX2.texteSecondaire, fontFamily: POLICE_MONO }}>{ligne.valeur}</span>
        </div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div
        style={{ ...bordure, cursor: 'pointer' }}
        onClick={onOuvrir}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onOuvrir(); }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 15px', gap: 18, alignItems: 'center' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 15 }}>{ligne.label}</span>
            {ligne.aide && <span style={{ fontSize: 12.5, color: CX2.texteDiscret }}>{ligne.aide}</span>}
          </span>
          <span style={{ fontSize: 13.5, color: CX2.texteSecondaire, fontFamily: POLICE_MONO }}>{ligne.valeur}</span>
          <ChevronRight size={14} color="#c2c1ba" strokeWidth={1.8} />
        </div>
      </div>
    );
  }

  const champ = ligne.edition;
  // Le mot de passe exige ses deux champs ; les autres, leur unique valeur.
  const pret = champ.type === 'motdepasse' ? Boolean(brouillon && second) : Boolean(brouillon);
  return (
    <div style={{ ...bordure, background: CX2.champFond, borderRadius: 10, padding: '16px 14px', margin: '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{ligne.label}</span>
          <span style={{ fontSize: 12, color: CX2.texteDiscret }}>Modification en cours</span>
        </span>

        {champ.type === 'choix' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {champ.options.map((o) => {
              const actif = brouillon === o.valeur;
              return (
                <button
                  key={o.valeur}
                  type="button"
                  onClick={() => setBrouillon(o.valeur)}
                  style={{
                    padding: '9px 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 500,
                    cursor: 'pointer',
                    border: `1px solid ${actif ? CX2.encre : CX2.bordure}`,
                    background: actif ? CX2.encre : CX2.surface,
                    color: actif ? CX2.surface : CX2.encreSurvol,
                  }}
                >
                  {o.libelle}
                </button>
              );
            })}
          </div>
        ) : champ.type === 'motdepasse' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={brouillon}
              placeholder="Mot de passe actuel"
              onChange={(e) => setBrouillon(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') onAnnuler(); }}
              style={styleChamp}
            />
            <input
              type="password"
              autoComplete="new-password"
              value={second}
              placeholder="Nouveau mot de passe"
              onChange={(e) => setSecond(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEnregistrer(brouillon, second);
                if (e.key === 'Escape') onAnnuler();
              }}
              style={styleChamp}
            />
          </div>
        ) : (
          <input
            autoFocus
            value={brouillon}
            placeholder={champ.placeholder}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onEnregistrer(brouillon); if (e.key === 'Escape') onAnnuler(); }}
            style={styleChamp}
          />
        )}

        {ligne.aide && <span style={{ fontSize: 13, color: CX2.texteSecondaire }}>{ligne.aide}</span>}

        <span style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={occupe || !pret}
            onClick={() => onEnregistrer(brouillon, second)}
            style={{
              padding: '9px 16px', border: 'none', borderRadius: 9, background: CX2.encre,
              color: CX2.surface, fontSize: 13.5, fontWeight: 500,
              cursor: occupe || !pret ? 'default' : 'pointer',
              opacity: occupe || !pret ? 0.45 : 1,
            }}
          >
            {occupe ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={onAnnuler}
            style={{
              padding: '9px 16px', border: `1px solid ${CX2.bordure}`, borderRadius: 9,
              background: CX2.surface, fontSize: 13.5, fontWeight: 500,
              color: CX2.encreSurvol, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </span>
      </div>
    </div>
  );
}

/** Un seul style de champ pour toute la page. */
const styleChamp: React.CSSProperties = {
  border: `1px solid ${CX2.bordure}`,
  borderRadius: 9,
  padding: '11px 13px',
  fontSize: 14.5,
  background: CX2.surface,
  color: CX2.encre,
  width: '100%',
};
