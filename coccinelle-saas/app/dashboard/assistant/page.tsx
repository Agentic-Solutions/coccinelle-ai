'use client';

/**
 * « Mon Assistant » — page 1 du chantier CX-2.
 *
 * Fidèle à design/cx2/mon-assistant.html : grille 65/35, trois conversations
 * témoins séparées par trait—MAJUSCULES—trait, cinq valeurs surlignées qui
 * ouvrent chacune le panneau qui la règle, un seul panneau ouvert à la fois.
 *
 * Le principe de la page : on ne configure pas un assistant dans un formulaire,
 * on corrige ce qu'il DIT. Les modifications sont locales et instantanées dans
 * les bulles, puis persistées par « Enregistrer » — en UN SEUL appel serveur,
 * parce qu'un prénom changé avec un prompt inchangé est exactement la
 * divergence qui a coûté trois mois sur les templates sectoriels.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Phone, Volume2 } from 'lucide-react';
import { VOICE_OPTIONS } from '@/lib/voices';
import { DAY_LABELS, type DayKey, type Horaires } from '@/lib/horaires';
import { CX2, LIEN_POLICES, POLICE_MONO, POLICE_TEXTE, STYLE_CARTE, STYLE_VALEUR_HALO } from '@/components/cx2/theme';
import PanneauAccordeon from '@/components/cx2/PanneauAccordeon';
import OngletsAssistant from '@/components/cx2/OngletsAssistant';
import {
  chargerEtatCanaux, chargerConfigAssistant, ecouterVoix, enregistrerConfigAssistant,
  type Canal, type ConfigAssistant,
} from '@/lib/cx2-api';

type Panneau = 'horaires' | 'voix' | 'transfert' | 'canaux' | null;

/** Les six jours de la maquette. Le dimanche n'y figure pas — voir § 8 du plan. */
const JOURS: DayKey[] = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

/** « 9h », « 12h30 » — rendu de la maquette. */
function hhmm(v: string): string {
  const [h, m] = String(v || '').split(':');
  const heure = parseInt(h, 10);
  if (!Number.isFinite(heure)) return '';
  return m && m !== '00' ? `${heure}h${m}` : `${heure}h`;
}

function Separateur({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '28px 0 18px' }}>
      <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
      <span style={{
        fontSize: '11.5px', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: CX2.texteDiscret, whiteSpace: 'nowrap',
      }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
    </div>
  );
}

/** Valeur surlignée dans une bulle : cliquer ouvre le panneau qui la règle. */
function Valeur({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <span
      style={STYLE_VALEUR_HALO}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      title="Cliquez pour modifier"
    >
      {children}
    </span>
  );
}

const BULLE: React.CSSProperties = {
  borderRadius: '14px', padding: '14px 17px', fontSize: '15.5px', lineHeight: 1.6,
};

function BulleClient({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        ...BULLE, maxWidth: '74%', background: CX2.surface,
        border: `1px solid ${CX2.bordure}`, borderBottomRightRadius: '4px', color: CX2.encreSurvol,
      }}>{children}</div>
    </div>
  );
}

function BulleAssistant({ initiale, children }: { initiale: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '78%' }}>
      <span style={{
        flex: '0 0 auto', width: 30, height: 30, borderRadius: 999, background: CX2.encre,
        color: CX2.surface, fontSize: '12px', fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{initiale}</span>
      <div style={{ ...BULLE, background: CX2.bulleAssistant, borderBottomLeftRadius: '4px' }}>
        {children}
      </div>
    </div>
  );
}

const CHAMP: React.CSSProperties = {
  border: `1px solid ${CX2.bordureFine}`, borderRadius: '9px', padding: '11px 13px',
  fontSize: '14.5px', background: CX2.champFond, color: CX2.encre, width: '100%',
};
const ETIQUETTE: React.CSSProperties = { fontSize: '12.5px', color: CX2.texteSecondaire };

export default function PageAssistant() {
  const [config, setConfig] = useState<ConfigAssistant | null>(null);
  const [canaux, setCanaux] = useState<Canal[]>([]);
  const [ouvert, setOuvert] = useState<Panneau>('horaires');
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lecture, setLecture] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // État local de la page : les bulles montrent ce que l'utilisateur vient de
  // taper, avant même d'enregistrer. C'est tout l'intérêt de cette page.
  const [prenom, setPrenom] = useState('');
  const [societe, setSociete] = useState('');
  const [voix, setVoix] = useState('');
  const [transfert, setTransfert] = useState('');
  const [horsHoraires, setHorsHoraires] = useState<'message' | 'horaires'>('message');
  const [horaires, setHoraires] = useState<Horaires | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await chargerConfigAssistant();
        setConfig(c);
        setPrenom(c.agent_name || 'Assistant');
        setSociete(c.company || '');
        setVoix(c.voice_id || VOICE_OPTIONS[0].id);
        setTransfert(c.transfer_number || '');
        setHorsHoraires(c.after_hours_behavior === 'horaires' ? 'horaires' : 'message');
        setHoraires(c.horaires as Horaires);
      } catch (e) { setMessage((e as Error).message); }
      try { setCanaux((await chargerEtatCanaux()).canaux); } catch { /* pastilles absentes, page utilisable */ }
    })();
    return () => { audio.current?.pause(); };
  }, []);

  const modifie = !!config && (
    prenom !== config.agent_name
    || societe !== config.company
    || voix !== (config.voice_id || '')
    || transfert !== (config.transfer_number || '')
    || horsHoraires !== config.after_hours_behavior
    || JSON.stringify(horaires) !== JSON.stringify(config.horaires)
  );

  const enregistrer = async () => {
    if (!modifie || !horaires) return;
    setEnregistrement(true);
    setMessage(null);
    try {
      const c = await enregistrerConfigAssistant({
        agent_name: prenom.trim(),
        company: societe.trim(),
        voice_id: voix,
        transfer_number: transfert.trim(),
        transfer_enabled: !!transfert.trim(),
        after_hours_behavior: horsHoraires,
        horaires,
      });
      setConfig(c);
      setMessage(c.prompt_regenere
        ? 'Enregistré. Votre assistant parlera ainsi dès le prochain appel.'
        : 'Enregistré.');
    } catch (e) { setMessage((e as Error).message); } finally { setEnregistrement(false); }
  };

  /** Fait entendre la phrase d'accueil avec la voix choisie. */
  const ecouter = useCallback(async (texte: string) => {
    if (!voix) return;
    setLecture(true);
    try {
      const url = await ecouterVoix(voix, texte);
      audio.current?.pause();
      const a = new Audio(url);
      audio.current = a;
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch (e) { setMessage((e as Error).message); } finally { setLecture(false); }
  }, [voix]);

  if (!config || !horaires) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 className="animate-spin" color={CX2.texteDiscret} />
      </div>
    );
  }

  const initiale = (prenom || 'A').charAt(0).toUpperCase();
  // Le premier jour OUVERT, et non le lundi en dur : un garage fermé le lundi
  // annoncerait sinon des horaires d'un jour où il n'ouvre pas.
  const jourRef = JOURS.find((j) => horaires[j]?.ouvert) || 'lun';
  const phraseHoraires = `de ${hhmm(horaires[jourRef].debut)} à ${hhmm(horaires[jourRef].fin)}`;
  // La maquette écrit « …à 19h. je prends votre message » — minuscule après un
  // point. C'est une coquille du gabarit, pas une intention de design : on
  // capitalise, puisque la phrase commence bien une nouvelle phrase.
  const phraseMessage = horsHoraires === 'message'
    ? 'Je prends votre message' : 'Je vous rappelle nos horaires';
  const accueil = `${societe}, bonjour ! ${prenom} à votre écoute, que puis-je faire pour vous ?`;
  const voixChoisie = VOICE_OPTIONS.find((v) => v.id === voix);
  const scenario = config.scenarios || { lieu: 'nos bureaux', demande: 'prendre rendez-vous cette semaine' };

  return (
    <>
      <link rel="stylesheet" href={LIEN_POLICES} />

      <div style={{
        fontFamily: POLICE_TEXTE, color: CX2.encre, background: CX2.fond,
        minHeight: '100%', padding: '36px 40px 56px',
      }}>
        <header style={{
          maxWidth: 1280, margin: '0 auto 26px', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Mon assistant
            </h1>
            <p style={{ margin: 0, fontSize: '14.5px', color: CX2.texteSecondaire }}>
              Cliquez sur un mot surligné pour le modifier
            </p>
          </div>
          <button
            type="button"
            onClick={enregistrer}
            disabled={!modifie || enregistrement}
            style={{
              padding: '11px 24px', border: 'none', borderRadius: '10px', background: CX2.encre,
              color: CX2.surface, fontSize: '14.5px', fontWeight: 500,
              cursor: modifie && !enregistrement ? 'pointer' : 'default',
              opacity: modifie && !enregistrement ? 1 : 0.45,
            }}
          >
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </header>

        {/* Les deux faces de l'assistant — ce qu'il dit, ce qu'il sait.
            Deux pages, deux URL, un seul habillage (chantier NAVIGATION). */}
        <div style={{ maxWidth: 1280, margin: '0 auto 20px' }}>
          <OngletsAssistant />
        </div>

        {message && (
          <div style={{
            maxWidth: 1280, margin: '0 auto 14px', padding: '11px 15px',
            border: `1px solid ${CX2.bordure}`, background: CX2.surface,
            borderRadius: '10px', fontSize: '13.5px',
          }}>
            {message}
            <button type="button" onClick={() => setMessage(null)} style={{
              float: 'right', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '13px', color: CX2.texteSecondaire, textDecoration: 'underline',
            }}>Fermer</button>
          </div>
        )}

        <div style={{
          maxWidth: 1280, margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)', gap: '20px', alignItems: 'start',
        }}>
          {/* ── GAUCHE : la conversation témoin ── */}
          <section style={{ ...STYLE_CARTE, padding: '26px 28px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Votre assistant en action
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: CX2.texteTertiaire }}>
              Trois situations réelles, telles que vos clients les entendent
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 18px' }}>
              <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
              <span style={{
                fontSize: '11.5px', fontWeight: 500, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: CX2.texteDiscret, whiteSpace: 'nowrap',
              }}>Un client appelle</span>
              <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <BulleAssistant initiale={initiale}>
                <Valeur onClick={() => setOuvert('voix')}>{societe}</Valeur>, bonjour !{' '}
                <Valeur onClick={() => setOuvert('voix')}>{prenom}</Valeur> à votre écoute,
                que puis-je faire pour vous ?
                <span
                  onClick={() => ecouter(accueil)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') ecouter(accueil); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px', marginTop: '11px',
                    fontSize: '12.5px', color: CX2.texteSecondaire, cursor: 'pointer',
                  }}
                >
                  {lecture ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                  Écouter
                </span>
              </BulleAssistant>

              <BulleClient>Bonjour, vous êtes ouverts jusqu&apos;à quelle heure aujourd&apos;hui ?</BulleClient>

              <BulleAssistant initiale={initiale}>
                Aujourd&apos;hui nous sommes ouverts{' '}
                <Valeur onClick={() => setOuvert('horaires')}>{phraseHoraires}</Valeur>.
                Souhaitez-vous passer {scenario.lieu === "l'atelier" ? "à l'atelier" : `à ${scenario.lieu}`} ou prendre un rendez-vous ?
              </BulleAssistant>
            </div>

            <Separateur>Appel en dehors des horaires</Separateur>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <BulleClient>Bonsoir, je voudrais {scenario.demande}.</BulleClient>
              <BulleAssistant initiale={initiale}>
                {scenario.lieu === "l'atelier" ? "L'atelier est fermé" : `${majuscule(scenario.lieu)} est fermé`} pour le moment,
                nous ouvrons <Valeur onClick={() => setOuvert('horaires')}>{phraseHoraires}</Valeur>.{' '}
                <Valeur onClick={() => setOuvert('transfert')}>{phraseMessage}</Valeur> et
                l&apos;équipe vous rappelle dès l&apos;ouverture.
              </BulleAssistant>
            </div>

            <Separateur>Le client demande un humain</Separateur>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <BulleClient>
                Je préfère parler à quelqu&apos;un de {scenario.lieu}, c&apos;est possible ?
              </BulleClient>
              <BulleAssistant initiale={initiale}>
                Bien sûr, je vous transfère{' '}
                <Valeur onClick={() => setOuvert('transfert')}>
                  {transfert ? `au ${transfert}` : 'à un conseiller'}
                </Valeur>. Ne quittez pas.
              </BulleAssistant>
            </div>
          </section>

          {/* ── DROITE : les réglages ── */}
          <aside style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            position: 'sticky', top: 24, alignSelf: 'start',
          }}>
            {/* Les horaires ne sont pas un accordéon dans la maquette : carte à
                part, avec son sous-titre et le badge « exemple ». */}
            <section style={{
              background: CX2.surface, borderRadius: '14px', padding: '22px 22px 24px',
              border: `1px solid ${ouvert === 'horaires' ? CX2.encre : CX2.bordure}`,
            }}>
              <button
                type="button"
                onClick={() => setOuvert(ouvert === 'horaires' ? null : 'horaires')}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                  cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px',
                }}
              >
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', width: '100%',
                }}>
                  <span style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    Horaires d&apos;ouverture
                  </span>
                  <span style={{ fontSize: '12px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
                    exemple
                  </span>
                </span>
                <span style={{ fontSize: '13px', color: CX2.texteSecondaire }}>
                  Modifie la réponse de votre assistant en direct
                </span>
              </button>

              {ouvert === 'horaires' && (
                // La maquette dessine cette grille sur une page de 1280 px de
                // large. Dans le dashboard, la barre latérale mange ~260 px et
                // la colonne tombe sous 340 px : à l'identique, la pastille
                // « Ouvert » se faisait couper par l'`overflow: hidden`. On
                // resserre les champs et on autorise un défilement horizontal
                // de secours plutôt que de rogner une information.
                <div style={{
                  marginTop: '18px', border: `1px solid ${CX2.bordureFine}`,
                  borderRadius: '10px', overflow: 'hidden', overflowX: 'auto',
                }}>
                  {JOURS.map((cle) => {
                    const jour = horaires[cle];
                    const label = DAY_LABELS.find((d) => d.key === cle)?.label || cle;
                    return (
                      <div key={cle} style={{
                        display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
                        alignItems: 'center', gap: '6px', padding: '9px 10px',
                        borderBottom: `1px solid ${CX2.separateur}`,
                      }}>
                        <span style={{
                          fontSize: '14px', fontWeight: 500, minWidth: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{label}</span>
                        {(['debut', 'fin'] as const).map((champ) => (
                          <input
                            key={champ}
                            value={jour[champ]}
                            onChange={(e) => setHoraires({
                              ...horaires, [cle]: { ...jour, [champ]: e.target.value },
                            })}
                            style={{
                              width: 58, textAlign: 'center', border: `1px solid ${CX2.bordureFine}`,
                              borderRadius: '7px', padding: '7px 2px', fontSize: '13px',
                              fontFamily: POLICE_MONO, background: CX2.champFond, color: CX2.encre,
                            }}
                            aria-label={`${label} — ${champ === 'debut' ? 'ouverture' : 'fermeture'}`}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => setHoraires({
                            ...horaires, [cle]: { ...jour, ouvert: !jour.ouvert },
                          })}
                          style={{
                            padding: '6px 10px', borderRadius: 999, fontSize: '12px', fontWeight: 500,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            border: `1px solid ${jour.ouvert ? '#dcdbd6' : CX2.bordureFine}`,
                            background: jour.ouvert ? CX2.fond : CX2.surface,
                            color: jour.ouvert ? CX2.encre : CX2.texteDiscret,
                          }}
                        >
                          {jour.ouvert ? 'Ouvert' : 'Fermé'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <PanneauAccordeon
              titre="Voix de l'assistant"
              resume={`${prenom} — ${(voixChoisie?.style || '').toLowerCase()}`}
              ouvert={ouvert === 'voix'}
              onBasculer={() => setOuvert(ouvert === 'voix' ? null : 'voix')}
            >
              <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={ETIQUETTE}>Prénom de l&apos;assistant</span>
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} style={CHAMP} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={ETIQUETTE}>Nom annoncé</span>
                  <input value={societe} onChange={(e) => setSociete(e.target.value)} style={CHAMP} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={ETIQUETTE}>Voix</span>
                  <select
                    value={voix}
                    onChange={(e) => setVoix(e.target.value)}
                    style={{ ...CHAMP, cursor: 'pointer' }}
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} — {v.gender === 'Féminin' ? 'féminine' : 'masculine'}, {v.style.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
                {/* « Voix avec écoute » (brief) : la maquette ne met le lien que
                    sous la bulle d'accueil, on le double ici. */}
                <span
                  onClick={() => ecouter(voixChoisie?.preview_text || accueil)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') ecouter(voixChoisie?.preview_text || accueil); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px',
                    color: CX2.texteSecondaire, cursor: 'pointer',
                  }}
                >
                  {lecture ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                  Écouter cette voix
                </span>
              </div>
            </PanneauAccordeon>

            <PanneauAccordeon
              titre="Transfert vers un humain"
              resume={transfert || 'non configuré'}
              ouvert={ouvert === 'transfert'}
              onBasculer={() => setOuvert(ouvert === 'transfert' ? null : 'transfert')}
            >
              <div style={{ padding: '0 22px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={ETIQUETTE}>Numéro de transfert</span>
                  <input
                    value={transfert}
                    onChange={(e) => setTransfert(e.target.value)}
                    placeholder="06 12 34 56 78"
                    style={{ ...CHAMP, fontFamily: POLICE_MONO }}
                  />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={ETIQUETTE}>Hors horaires, l&apos;assistant</span>
                  <div style={{ display: 'flex', gap: '3px', padding: '3px', background: CX2.bandeau, borderRadius: '9px' }}>
                    {([
                      ['message', 'Prend un message'],
                      ['horaires', 'Annonce les horaires'],
                    ] as const).map(([cle, libelle]) => {
                      const actif = horsHoraires === cle;
                      return (
                        <button
                          key={cle}
                          type="button"
                          onClick={() => setHorsHoraires(cle)}
                          style={{
                            flex: 1, padding: '9px 12px', border: 'none', borderRadius: '7px',
                            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                            background: actif ? CX2.surface : 'transparent',
                            color: actif ? CX2.encre : CX2.texteSecondaire,
                            boxShadow: actif ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          {libelle}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PanneauAccordeon>

            <PanneauAccordeon
              titre="Mes canaux"
              resume={resumeCanaux(canaux)}
              ouvert={ouvert === 'canaux'}
              onBasculer={() => setOuvert(ouvert === 'canaux' ? null : 'canaux')}
            >
              <div style={{ padding: '0 22px 18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {canaux.map((c) => {
                  const contenu = (
                    <>
                      {/* Gelé : aucun point. Un point orange dit « en panne », or
                          WhatsApp n'est pas en panne — il n'est pas ouvert. */}
                      {!c.bientot && (
                        <span style={{
                          width: 7, height: 7, borderRadius: 999, display: 'block',
                          background: c.actif ? CX2.vert : CX2.orange,
                        }} />
                      )}
                      {NOM_CANAL[c.type] || c.type}
                      {c.bientot && (
                        <span style={{ fontSize: '11.5px', color: CX2.texteDiscret }}>· bientôt</span>
                      )}
                    </>
                  );
                  const style: React.CSSProperties = {
                    display: 'flex', alignItems: 'center', gap: '7px',
                    border: `1px solid ${CX2.bordureFine}`, borderRadius: 999,
                    padding: '6px 12px', fontSize: '12.5px',
                    color: c.bientot ? CX2.texteDiscret : CX2.encreSurvol,
                    textDecoration: 'none',
                  };
                  const cible = cibleCanal(c);
                  // WhatsApp est gelé : pas de lien. Une pastille cliquable qui
                  // mène à une page « bientôt disponible » promet deux fois.
                  if (!cible) return <span key={c.type} style={style}>{contenu}</span>;
                  return (
                    <Link
                      key={c.type}
                      href={cible}
                      style={style}
                      title={c.actif ? 'Ouvrir la configuration' : 'Activer ce canal'}
                    >
                      {contenu}
                    </Link>
                  );
                })}
              </div>
            </PanneauAccordeon>
          </aside>
        </div>

        {/* ── Bandeau bas ──
            La maquette annonce un appel SORTANT (« votre assistant vous appelle
            en moins de 10 secondes »). Cette brique n'existe pas : le mécanisme
            en place est l'inverse — l'appelant compose le numéro d'essai et
            resolve-phone le reconnaît à son numéro vérifié. On garde le bloc et
            son titre, on remplace la promesse par ce qui marche vraiment. */}
        <section style={{
          maxWidth: 1280, margin: '20px auto 0', background: CX2.bandeau,
          border: `1px solid ${CX2.bordure}`, borderRadius: '14px', padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Validez en conditions réelles
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: CX2.texteSecondaire }}>
              {config.phone_verified
                ? 'Depuis votre numéro vérifié, votre assistant décroche.'
                : 'Vérifiez votre numéro : c’est ce qui permet à votre assistant de vous reconnaître quand vous appelez.'}
            </p>
          </div>
          {config.phone_verified ? (
            <a
              href={`tel:${(config.trial_phone || '').replace(/\s/g, '')}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '11px', padding: '15px 26px',
                border: 'none', borderRadius: '11px', background: CX2.encre, color: CX2.surface,
                fontSize: '15.5px', fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none',
              }}
            >
              <Phone size={17} />
              Appelez le {formaterNumero(config.trial_phone)}
            </a>
          ) : (
            <a
              href="/dashboard/settings/"
              style={{
                display: 'flex', alignItems: 'center', gap: '11px', padding: '15px 26px',
                border: `1px solid ${CX2.encre}`, borderRadius: '11px', background: 'transparent',
                color: CX2.encre, fontSize: '15.5px', fontWeight: 500, textDecoration: 'none',
              }}
            >
              <Phone size={17} />
              Vérifier mon numéro
            </a>
          )}
        </section>
      </div>
    </>
  );
}

const NOM_CANAL: Record<string, string> = {
  phone: 'Téléphone', sms: 'SMS', whatsapp: 'WhatsApp',
};

/**
 * Où mène une pastille (14/08/2026).
 *
 * Une pastille qui ne mène nulle part constate un problème sans offrir de le
 * régler. La cible dépend de l'ÉTAT : un canal actif s'ouvre sur sa
 * configuration, un canal inactif sur ce qui l'active — ce n'est pas le même
 * geste, et souvent pas la même page.
 *
 * `null` = aucun lien. Réservé à WhatsApp : il est gelé, et une pastille
 * cliquable menant à « bientôt disponible » promettrait deux fois.
 */
function cibleCanal(c: Canal): string | null {
  switch (c.type) {
    case 'phone':
      // Actif : les lignes rattachées. Inactif : l'activation passe par un
      // numéro personnel vérifié, qui vit dans le compte — c'est la condition
      // que resolve-phone applique pour la branche « numéro d'essai ».
      return c.actif ? '/dashboard/channels/numbers' : '/dashboard/settings#joindre';
    case 'sms':
      return '/dashboard/channels/sms';
    case 'email':
      // `null` depuis le 15/08 : l'e-mail est hors périmètre de lancement. La
      // pastille est déjà rendue non cliquable par `c.bientot`, mais laisser une
      // cible ici la rendrait cliquable au premier oubli — et une pastille qui
      // mène à une page « bientôt disponible » promet deux fois.
      return null;
    default:
      return null;
  }
}

/**
 * « 2 canaux actifs » — au singulier quand il n'y en a qu'un, et sans compter
 * WhatsApp, qui est annoncé « bientôt » et non désactivé.
 */
function resumeCanaux(canaux: Canal[]): string {
  const n = canaux.filter((c) => c.actif).length;
  if (n === 0) return 'Aucun canal actif';
  return n === 1 ? '1 canal actif' : `${n} canaux actifs`;
}

function majuscule(t: string) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/**
 * « +33939035761 » → « +33 9 39 03 57 61 ».
 * Le backend renvoie le numéro brut (wrangler.toml) ; un numéro à composer se
 * lit par groupes, sinon on le recopie de travers sur son clavier.
 */
function formaterNumero(numero: string): string {
  const brut = String(numero || '').replace(/\s/g, '');
  const fr = brut.match(/^\+33(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return fr ? `+33 ${fr[1]} ${fr[2]} ${fr[3]} ${fr[4]} ${fr[5]}` : brut;
}
