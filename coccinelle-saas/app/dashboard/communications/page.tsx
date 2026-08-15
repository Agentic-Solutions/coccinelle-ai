'use client';

/**
 * « Mes communications » — chantier CX-3, dernier de la série CX.
 *
 * LE MANQUE QU'ELLE COMBLE
 * « Mon activité » ne montrait que les appels. Les SMS partaient déjà — devis,
 * confirmations, rappels J-1 — et n'apparaissaient nulle part : le commerçant ne
 * voyait pas la moitié de ce que son assistant faisait pour lui.
 *
 * CE QU'ELLE MONTRE : la frise du voyage client, chaque étage portant le
 * DERNIER MESSAGE RÉELLEMENT PARTI. Pas un gabarit, pas un spécimen. Une étape
 * sans message dit « aucun encore envoyé » — c'est une information, et un
 * exemple à cet endroit se lirait comme un message déjà reçu par un client.
 *
 * TROIS ÉCARTS ASSUMÉS À design/cx3/mes-communications.html, tous pour la même
 * raison — la maquette montre des briques qui n'existent pas côté serveur :
 *
 *   1. LES INTERRUPTEURS DE « MES CANAUX » n'y sont pas. `/channels/etat` est un
 *      CONSTAT : le SMS est une capacité plateforme (`env.TWILIO_PHONE_NUMBER`,
 *      le même pour tous), il n'existe aucun réglage par tenant. Les colonnes
 *      `voixia_configs.sms_enabled / email_enabled / whatsapp_enabled` existent,
 *      valent 0 chez les sept tenants, et ne sont lues par AUCUNE ligne de code
 *      — les brancher afficherait « désactivé » sur un canal qui envoie. C'est
 *      le « 0 canal actif » du chantier NAVIGATION 2, refait.
 *
 *   2. LE BLOC « EMAIL · RÉPONSE AUTOMATIQUE » n'y est pas, pas même en
 *      « bientôt disponible ». `email/inbound.js` stocke l'e-mail entrant et
 *      s'arrête là : il n'existe aucune réponse automatique. Dans une frise, un
 *      « bientôt » se lit comme une étape en route. L'étage e-mail montre donc
 *      les e-mails RÉELLEMENT envoyés, qui existent (`channel_messages_log`).
 *
 *   3. LE BOUTON « ÉCOUTER » du message hors horaires n'y est pas.
 *      `voixia_configs.after_hours_message` est écrit par « Mon assistant » et
 *      lu par PERSONNE : zéro occurrence dans `voixia/`, `sector-prompts.js` et
 *      l'agent Python. L'assistant ne prononce jamais ce texte. L'écouter,
 *      ce serait écouter une fiction.
 *
 * La charte est celle de CX-2 (`components/cx2/theme.ts`) : la maquette CX-3
 * reprend les mêmes hex au caractère près. Une seule source, pas une copie.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, MessageSquare, Phone } from 'lucide-react';
import { CX2, LIEN_POLICES, POLICE_MONO, POLICE_TEXTE, STYLE_CARTE } from '@/components/cx2/theme';
import { useEcranLarge } from '@/components/cx2/useEcranLarge';
import {
  chargerEtatCanaux, chargerFrise, chargerMessages,
  type Canal, type EtapeFrise, type Frise, type Message,
} from '@/lib/cx3-api';

const NOM_CANAL: Record<string, string> = {
  phone: 'Téléphone', sms: 'SMS', email: 'E-mail', whatsapp: 'WhatsApp',
};

/**
 * Ce qui rend un canal actif, en français. Les clés viennent de `pourquoi`
 * renvoyé par `/channels/etat` — on ne les invente pas et on n'en devine aucune.
 */
const POURQUOI: Record<string, string> = {
  numero_dedie: 'Votre numéro dédié',
  numero_essai: 'Numéro d’essai partagé',
  aucun_numero: 'Aucun numéro rattaché',
  plateforme: 'Inclus, rien à activer',
  boite_reliee: 'Boîte reliée',
  aucune_boite: 'Aucune boîte reliée',
  gele: 'Pas encore ouvert',
};

/** Où mène une pastille de canal. `null` = nulle part (WhatsApp est gelé). */
function cibleCanal(c: Canal): string | null {
  switch (c.type) {
    case 'phone': return '/dashboard/channels/numbers';
    case 'sms': return '/dashboard/channels/sms';
    case 'email': return '/dashboard/channels/email';
    default: return null;
  }
}

/**
 * « il y a 3 h », « hier », « le 11 août ».
 *
 * ⚠️ Le `Z` ajouté est CORRECT ici, et c'est le contraire de la règle 10quinquies :
 * `omni_messages.created_at` et `channel_messages_log.sent_at` sont écrits par
 * `datetime('now')`, donc en UTC. C'est `appointments.scheduled_at` qui est une
 * date-heure NAÏVE et déjà locale — la relire comme de l'UTC ajoutait deux heures
 * en été, et ce défaut a vécu dans deux fichiers. Les deux familles de colonnes
 * existent : il faut savoir laquelle on lit avant de convertir.
 */
function ilYA(iso: string): string {
  const t = Date.parse(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(t)) return '';
  const minutes = Math.round((Date.now() - t) / 60000);
  if (minutes < 2) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 8) return `il y a ${jours} jours`;
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Trait — INTITULÉ — trait, comme les séparateurs de scénario de CX-2. */
function Separateur({ titre }: { titre: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 16px' }}>
      <span style={{
        fontSize: '11.5px', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: CX2.texteDiscret, whiteSpace: 'nowrap',
      }}>{titre}</span>
      <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
    </div>
  );
}

/** Un étage de la frise : la puce, le fil, la bulle. */
function Etage({ etape, dernier }: { etape: EtapeFrise; dernier: boolean }) {
  return (
    <>
      <Separateur titre={etape.titre} />
      <div style={{ display: 'flex', gap: '14px', paddingLeft: '6px' }}>
        <div style={{
          flex: '0 0 auto', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '6px',
        }}>
          <span style={{
            width: 9, height: 9, borderRadius: 999, display: 'block',
            background: etape.message ? CX2.encre : CX2.bordure,
          }} />
          {!dernier && (
            <span style={{ flex: 1, width: 1, background: CX2.bordureFine, display: 'block' }} />
          )}
        </div>
        <div style={{
          flex: 1, paddingBottom: dernier ? 0 : '30px',
          display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0,
        }}>
          <span style={{ fontSize: '12px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
            {etape.quand}
            {etape.message && <> · {ilYA(etape.message.date)}</>}
          </span>

          {etape.message ? (
            <>
              <div style={{
                maxWidth: 460, background: CX2.bulleAssistant, borderRadius: '16px',
                borderBottomLeftRadius: '5px', padding: '14px 17px',
                fontSize: '15px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}>
                {etape.message.contenu}
              </div>
              <span style={{ fontSize: '12.5px', color: CX2.texteDiscret }}>
                Envoyé à {etape.message.contact || etape.message.adresse || 'un client'}
              </span>
            </>
          ) : (
            /* Pas de spécimen. Le vide est l'information : rien n'est parti. */
            <div style={{
              maxWidth: 460, border: `1px dashed ${CX2.bordure}`, borderRadius: '14px',
              padding: '14px 17px', fontSize: '14px', color: CX2.texteTertiaire,
            }}>
              Aucun message encore envoyé à cette étape.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function PageCommunications() {
  const [frise, setFrise] = useState<Frise | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [parCanal, setParCanal] = useState({ sms: 0, email: 0 });
  const [canaux, setCanaux] = useState<Canal[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<'tous' | 'sms' | 'email'>('tous');
  // Une colonne sur téléphone : les artisans consultent d'abord là.
  const large = useEcranLarge();

  const charger = useCallback(async () => {
    try {
      // Les trois en parallèle : aucune ne dépend des autres, et « Mes canaux »
      // ne doit pas attendre la frise pour s'afficher.
      const [f, m] = await Promise.all([chargerFrise(), chargerMessages({ limite: 50 })]);
      setFrise(f);
      setMessages(m.messages);
      setParCanal(m.par_canal);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Lecture impossible');
    } finally {
      setChargement(false);
    }
    // Les pastilles absentes ne doivent pas rendre la page inutilisable.
    try { setCanaux((await chargerEtatCanaux()).canaux); } catch { /* page utilisable sans */ }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const visibles = filtre === 'tous' ? messages : messages.filter((m) => m.canal === filtre);

  return (
    <>
      {/* Chargées par <link> et non par next/font : next/font télécharge à la
          compilation, ce qui ferait dépendre `npm run build` du réseau. */}
      <link rel="stylesheet" href={LIEN_POLICES} />

      <div style={{
        fontFamily: POLICE_TEXTE, color: CX2.encre, background: CX2.fond,
        minHeight: '100%',
        padding: large ? '36px 40px 56px' : '24px 16px 40px',
      }}>
        <header style={{
          maxWidth: 1320, margin: '0 auto 24px', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Mes communications
            </h1>
            <p style={{ margin: 0, fontSize: '14.5px', color: CX2.texteSecondaire }}>
              Les messages que vos clients ont reçus, du premier appel au rendez-vous
            </p>
          </div>
          {/* Compteurs RÉELS : le nombre de lignes lues, rien d'autre. */}
          {!chargement && !erreur && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 14px',
              border: `1px solid ${CX2.bordure}`, borderRadius: 999, background: CX2.surface,
              whiteSpace: 'nowrap', fontSize: '13px',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: CX2.encre, display: 'block' }} />
              <span style={{ fontWeight: 500 }}>{parCanal.sms} SMS</span>
              <span style={{ color: CX2.texteDiscret }}>·</span>
              <span style={{ fontWeight: 500 }}>{parCanal.email} e-mail{parCanal.email > 1 ? 's' : ''}</span>
            </span>
          )}
        </header>

        <div style={{
          maxWidth: 1320, margin: '0 auto', display: 'grid',
          gridTemplateColumns: large ? 'minmax(0, 60fr) minmax(0, 40fr)' : 'minmax(0, 1fr)',
          gap: large ? '20px' : '14px', alignItems: 'start',
        }}>
          {/* ══ GAUCHE : la frise du voyage client ══ */}
          <section style={{ ...STYLE_CARTE, padding: large ? '26px 28px' : '20px 16px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Ce que vos clients ont reçu
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: CX2.texteTertiaire }}>
              Le dernier message parti à chaque étape. Rien n’est simulé.
            </p>

            {chargement && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '30px 0', color: CX2.texteTertiaire }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span style={{ fontSize: '14px' }}>Lecture de vos messages…</span>
              </div>
            )}

            {erreur && (
              <p style={{ fontSize: '14px', color: CX2.texteSecondaire, padding: '20px 0' }}>
                {erreur}
              </p>
            )}

            {frise && !chargement && (
              <>
                {frise.etapes.map((e, i) => (
                  <Etage key={e.cle} etape={e} dernier={i === frise.etapes.length - 1 && !frise.email} />
                ))}

                {/* ── L'e-mail : étage à part, source différente, pas de type ── */}
                {frise.email && (
                  <>
                    <div style={{ marginTop: '30px' }}>
                      <Separateur titre="S’il écrit un e-mail" />
                    </div>
                    <div style={{ display: 'flex', gap: '14px', paddingLeft: '6px' }}>
                      <span style={{
                        flex: '0 0 auto', width: 9, height: 9, borderRadius: 999,
                        background: CX2.encre, display: 'block',
                      }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '12px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
                          E-mail · envoyé · {ilYA(frise.email.date)}
                          {/* Le statut journalisé : un envoi échoué n'est pas un envoi. */}
                          {frise.email.statut && frise.email.statut !== 'sent' && <> · {frise.email.statut}</>}
                        </span>
                        <div style={{
                          maxWidth: 520, background: CX2.surface,
                          border: `1px solid ${CX2.bordure}`, borderRadius: '12px', overflow: 'hidden',
                        }}>
                          <div style={{
                            padding: '12px 16px', borderBottom: `1px solid ${CX2.separateur}`,
                            background: CX2.champFond, display: 'flex', flexDirection: 'column', gap: '3px',
                          }}>
                            <span style={{ fontSize: '13px', color: CX2.texteSecondaire, fontFamily: POLICE_MONO }}>
                              À : {frise.email.adresse || '—'}
                            </span>
                            {frise.email.objet && (
                              <span style={{ fontSize: '13px', color: CX2.texteSecondaire }}>
                                Objet : {frise.email.objet}
                              </span>
                            )}
                          </div>
                          <div style={{
                            padding: '16px 18px', fontSize: '15px', lineHeight: 1.65,
                            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                          }}>
                            {frise.email.contenu}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {/* ══ DROITE ══ */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* ── Mes canaux : CONSTAT, aucun interrupteur ── */}
            <section style={{ ...STYLE_CARTE, padding: large ? '22px' : '18px 16px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Mes canaux
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: CX2.texteTertiaire }}>
                Ce qui fonctionne, constaté — pas ce qui est coché
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {canaux.map((c, i) => {
                  const Icone = c.type === 'phone' ? Phone : c.type === 'email' ? Mail : MessageSquare;
                  const ligne = (
                    <>
                      <span style={{
                        width: 34, height: 34, flex: '0 0 auto',
                        border: `1px solid ${CX2.bordureFine}`, borderRadius: '9px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icone className="w-4 h-4" strokeWidth={1.7} />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 500 }}>
                          {NOM_CANAL[c.type] || c.type}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          {/* Gelé : aucun point. Un point orange dirait « en panne »,
                              or WhatsApp n'est pas en panne — il n'est pas ouvert. */}
                          {!c.bientot && (
                            <span style={{
                              width: 7, height: 7, borderRadius: 999, display: 'block',
                              background: c.actif ? CX2.vert : CX2.orange,
                            }} />
                          )}
                          <span style={{ fontSize: '12.5px', color: CX2.texteSecondaire }}>
                            {c.bientot ? 'Bientôt disponible' : (POURQUOI[c.pourquoi || ''] || (c.actif ? 'Actif' : 'Inactif'))}
                          </span>
                        </span>
                      </span>
                    </>
                  );
                  const style: React.CSSProperties = {
                    display: 'grid', gridTemplateColumns: '34px 1fr', alignItems: 'center',
                    gap: '12px', padding: '13px 4px', textDecoration: 'none', color: CX2.encre,
                    borderBottom: i === canaux.length - 1 ? 'none' : `1px solid ${CX2.separateur}`,
                  };
                  const cible = cibleCanal(c);
                  if (!cible || c.bientot) return <span key={c.type} style={style}>{ligne}</span>;
                  return <Link key={c.type} href={cible} style={style}>{ligne}</Link>;
                })}
              </div>
            </section>

            {/* ── Le journal ── */}
            <section style={{ ...STYLE_CARTE, padding: large ? '22px' : '18px 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                gap: '12px', flexWrap: 'wrap', marginBottom: '14px',
              }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Tout l’historique
                </h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {([['tous', 'Tout'], ['sms', 'SMS'], ['email', 'E-mail']] as const).map(([cle, label]) => (
                    <button
                      key={cle}
                      type="button"
                      onClick={() => setFiltre(cle)}
                      style={{
                        border: `1px solid ${filtre === cle ? CX2.encre : CX2.bordure}`,
                        background: filtre === cle ? CX2.encre : CX2.surface,
                        color: filtre === cle ? CX2.surface : CX2.texteSecondaire,
                        borderRadius: 999, padding: '4px 11px', fontSize: '12.5px',
                        fontWeight: 500, cursor: 'pointer', font: 'inherit',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibles.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13.5px', color: CX2.texteTertiaire, padding: '10px 0' }}>
                  {chargement ? 'Lecture…' : 'Aucun message pour l’instant.'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {visibles.map((m, i) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '5px',
                        borderBottom: i === visibles.length - 1 ? 'none' : `1px solid ${CX2.separateur}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 500, letterSpacing: '0.05em',
                          textTransform: 'uppercase', color: CX2.texteDiscret,
                        }}>
                          {m.canal === 'sms' ? 'SMS' : 'E-mail'} · {m.sens === 'recu' ? 'reçu' : 'envoyé'}
                        </span>
                        <span style={{ fontSize: '12px', color: CX2.texteDiscret, fontFamily: POLICE_MONO }}>
                          {ilYA(m.date)}
                        </span>
                        {m.contact || m.adresse ? (
                          <span style={{ fontSize: '12.5px', color: CX2.texteSecondaire }}>
                            {m.contact || m.adresse}
                          </span>
                        ) : null}
                      </div>
                      <span style={{
                        fontSize: '13.5px', lineHeight: 1.5, color: CX2.encre,
                        overflowWrap: 'anywhere',
                      }}>
                        {m.contenu}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
