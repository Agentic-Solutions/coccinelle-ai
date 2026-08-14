'use client';

/**
 * « Ce que sait votre assistant » — page 2 du chantier CX-2.
 *
 * Fidèle à design/cx2/ce-que-sait.html : grille 60/40, chips en pilules, fil de
 * test, colonne droite en trois cartes.
 *
 * GAUCHE = vérification. Le fil part VIDE (le brief l'impose ; la maquette
 * montre deux échanges parce que c'est son état de démonstration) et se remplit
 * des questions posées, via `/voixia/knowledge` — la VRAIE route de l'agent.
 * Ce qui s'affiche ici est ce que l'assistant dira au téléphone.
 *
 * DROITE = alimentation. Ajouter · Vos informations · Historique.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CX2, LIEN_POLICES, POLICE_TEXTE, STYLE_CARTE } from '@/components/cx2/theme';
import { BulleAssistant, BulleClient } from '@/components/cx2/Bulle';
import ChipsSuggestions from '@/components/cx2/ChipsSuggestions';
import OngletsAssistant from '@/components/cx2/OngletsAssistant';
import { CarteAjouter, CarteHistorique, CarteInformations } from '@/components/cx2/CartesSavoir';
import {
  ajouterDocument, chargerConfigAssistant, chargerSuggestions, corrigerFiche, demander,
  importerDepuisSite, listerDocuments, listerHistorique, listerSupprimees, previsualiser,
  remplacerDocument, restaurerDocument, restaurerVersion, supprimerFiche,
  type DocumentKb, type Modification, type ReponseAssistant, type SourceReponse, type Suggestion,
} from '@/lib/cx2-api';

interface Echange {
  cle: number;
  question: string;
  reponse: ReponseAssistant | null;
  /** Vrai pendant l'appel — la bulle précédente reste lisible, en retrait. */
  enCours: boolean;
  edition?: boolean;
}

/** Trait — INTITULÉ — trait, repris des séparateurs de scénario de la page 1. */
function Separateur({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '10px 0 4px' }}>
      <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
      <span style={{
        fontSize: '11.5px', fontWeight: 500, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: CX2.texteDiscret, whiteSpace: 'nowrap',
      }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: CX2.bordureFine, display: 'block' }} />
    </div>
  );
}

export default function PageSavoir() {
  const [agent, setAgent] = useState('Assistant');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [restantes, setRestantes] = useState(0);
  const [servies, setServies] = useState<string[]>([]);
  const [fiches, setFiches] = useState(0);
  const [categories, setCategories] = useState<{ label: string; count: number }[]>([]);
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [separateurs, setSeparateurs] = useState<Record<number, string>>({});
  const [question, setQuestion] = useState('');
  const [brouillon, setBrouillon] = useState('');
  const [historique, setHistorique] = useState<Modification[]>([]);
  const [corbeille, setCorbeille] = useState<{ id: string; title: string; deleted_at: string }[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Le document tabulaire du tenant : la cible qu'un import remplacerait. */
  const [cible, setCible] = useState<DocumentKb | null>(null);
  const [diff, setDiff] = useState<{
    prixModifies: number;
    apercu: boolean;
    modifications: { libelle: string; avant: string | null; apres: string | null; type: string }[];
  } | null>(null);
  const compteur = useRef(0);
  const finDuFil = useRef<HTMLDivElement>(null);

  const rafraichirSuggestions = useCallback(async (exclus: string[]) => {
    try {
      const s = await chargerSuggestions(exclus);
      setSuggestions(s.suggestions);
      setRestantes(s.restantes);
      setFiches(s.fiches ?? 0);
      setCategories(s.categories ?? []);
    } catch { /* les chips sont un confort, jamais un bloquant */ }
  }, []);

  const rafraichirHistorique = useCallback(async () => {
    try { setHistorique((await listerHistorique(5)).modifications); } catch { /* idem */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const c = await chargerConfigAssistant();
        setAgent(c.agent_name || 'Assistant');
      } catch { /* l'initiale n'empêche pas d'utiliser la page */ }
    })();
    (async () => {
      try {
        const d = await listerDocuments();
        setCible(d.documents.find((x) => (x.chunkCount || 0) > 0) || null);
      } catch { /* sans cible, le bandeau d'import reste simplement absent */ }
    })();
    rafraichirSuggestions([]);
    rafraichirHistorique();
  }, [rafraichirSuggestions, rafraichirHistorique]);

  // ── Bandeau « Import détecté » ──
  // Le brouillon est comparé au document tabulaire existant PAR LE SERVEUR
  // (`/knowledge/preview`, aucune écriture) : c'est le même normalisateur qui
  // fera l'ingestion, donc l'aperçu ne peut pas mentir sur le résultat.
  useEffect(() => {
    const contenu = brouillon.trim();
    if (!cible || contenu.length < 40) { setDiff(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await previsualiser(contenu, cible.id);
        setDiff(r.modifications.length
          ? { prixModifies: r.prix_modifies, apercu: false, modifications: r.modifications }
          : null);
      } catch { setDiff(null); }
    }, 700);
    return () => clearTimeout(t);
  }, [brouillon, cible]);

  useEffect(() => {
    finDuFil.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [echanges.length]);

  /** Pose une question et empile l'échange. */
  const poser = useCallback(async (texte: string, titreSeparateur?: string) => {
    const propre = texte.trim();
    if (!propre) return;
    const cle = ++compteur.current;
    if (titreSeparateur) setSeparateurs((s) => ({ ...s, [cle]: titreSeparateur }));
    setEchanges((e) => [...e, { cle, question: propre, reponse: null, enCours: true }]);
    try {
      const r = await demander(propre);
      setEchanges((e) => e.map((x) => (x.cle === cle ? { ...x, reponse: r, enCours: false } : x)));
    } catch (err) {
      setEchanges((e) => e.map((x) => (x.cle === cle ? {
        ...x, enCours: false,
        reponse: { answer: `Impossible d'interroger votre assistant : ${(err as Error).message}`, found: false, source: null },
      } : x)));
    }
  }, []);

  const choisirChip = async (s: Suggestion) => {
    const exclus = [...servies, s.id];
    setServies(exclus);
    await poser(s.label);
    // Une chip utilisée est remplacée : le serveur tient la réserve.
    rafraichirSuggestions(exclus);
  };

  /** Rejoue la question d'un échange — c'est la vraie réponse qui fait foi. */
  const rejouer = useCallback(async (cle: number) => {
    setEchanges((e) => e.map((x) => (x.cle === cle ? { ...x, enCours: true } : x)));
    const ech = echanges.find((x) => x.cle === cle);
    if (!ech) return;
    try {
      const r = await demander(ech.question);
      setEchanges((e) => e.map((x) => (x.cle === cle ? { ...x, reponse: r, enCours: false, edition: false } : x)));
    } catch {
      setEchanges((e) => e.map((x) => (x.cle === cle ? { ...x, enCours: false } : x)));
    }
  }, [echanges]);

  /** Correction d'un montant depuis la bulle. */
  const corriger = async (ech: Echange, valeur: string) => {
    const chunk = ech.reponse?.source?.chunk_id;
    if (!chunk) return;
    setOccupe(true);
    try {
      // Le document stocke « 15 EUR » : on renvoie la même écriture, sinon la
      // fiche reconstruite dirait « 18 € » là où toutes les autres disent EUR.
      const prix = normaliserPrix(valeur);
      await corrigerFiche(chunk, { prix });
      await rejouer(ech.cle);
      await Promise.all([rafraichirHistorique(), rafraichirSuggestions(servies)]);
      setMessage(null);
    } catch (err) {
      setMessage((err as Error).message);
    } finally { setOccupe(false); }
  };

  const supprimer = async (ech: Echange) => {
    const chunk = ech.reponse?.source?.chunk_id;
    if (!chunk) return;
    if (!window.confirm('Supprimer cette information ? Elle reste restaurable pendant 30 jours.')) return;
    setOccupe(true);
    try {
      await supprimerFiche(chunk);
      await rejouer(ech.cle);
      await Promise.all([rafraichirHistorique(), rafraichirSuggestions(servies)]);
    } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
  };

  /** Enregistre le brouillon puis rejoue 2 questions : « voici ce que je réponds ». */
  const enregistrerBrouillon = async () => {
    const contenu = brouillon.trim();
    if (!contenu) return;
    setOccupe(true);
    try {
      const titre = contenu.split('\n')[0].slice(0, 60) || 'Information ajoutée';
      await ajouterDocument(titre, contenu);
      setBrouillon('');
      const s = await chargerSuggestions([]);
      setSuggestions(s.suggestions); setRestantes(s.restantes);
      setFiches(s.fiches ?? 0); setCategories(s.categories ?? []);
      await rafraichirHistorique();
      const aRejouer = s.suggestions.slice(0, 2);
      for (let i = 0; i < aRejouer.length; i++) {
        await poser(aRejouer[i].label, i === 0 ? 'Voici ce que je réponds maintenant' : undefined);
      }
    } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
  };

  const importerSite = async (url: string) => {
    setOccupe(true);
    try {
      const r = await importerDepuisSite(url);
      setMessage(`${r.pages.length} page(s) importée(s) depuis ${url}.`);
      const s = await chargerSuggestions([]);
      setSuggestions(s.suggestions); setRestantes(s.restantes);
      setFiches(s.fiches ?? 0); setCategories(s.categories ?? []);
      await rafraichirHistorique();
      if (s.suggestions[0]) await poser(s.suggestions[0].label, 'Voici ce que je réponds maintenant');
    } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
  };

  const restaurer = async (versionId: number) => {
    setOccupe(true);
    try {
      await restaurerVersion(versionId);
      await Promise.all([rafraichirHistorique(), rafraichirSuggestions(servies)]);
      if (echanges.length) await rejouer(echanges[echanges.length - 1].cle);
    } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
  };

  /** Remplace le document tabulaire par le brouillon, après aperçu. */
  const appliquerImport = async () => {
    if (!cible) return;
    setOccupe(true);
    try {
      await remplacerDocument(cible.id, brouillon.trim());
      setBrouillon(''); setDiff(null);
      const s = await chargerSuggestions([]);
      setSuggestions(s.suggestions); setRestantes(s.restantes);
      setFiches(s.fiches ?? 0); setCategories(s.categories ?? []);
      await rafraichirHistorique();
      if (s.suggestions[0]) await poser(s.suggestions[0].label, 'Voici ce que je réponds maintenant');
    } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
  };

  const ouvrirCorbeille = async () => {
    try { setCorbeille((await listerSupprimees()).documents); }
    catch (err) { setMessage((err as Error).message); }
  };

  const initiale = (agent || 'A').charAt(0).toUpperCase();

  return (
    <>
      {/* Chargées par <link> et non par next/font : next/font télécharge à la
          compilation, ce qui ferait dépendre `npm run build` du réseau. */}
      <link rel="stylesheet" href={LIEN_POLICES} />

      <div style={{
        fontFamily: POLICE_TEXTE, color: CX2.encre, background: CX2.fond,
        minHeight: '100%', padding: '36px 40px 56px',
      }}>
        <header style={{
          maxWidth: 1320, margin: '0 auto 24px', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 600, letterSpacing: '-0.02em' }}>
              Mon assistant
            </h1>
            <p style={{ margin: 0, fontSize: '14.5px', color: CX2.texteSecondaire }}>
              Posez une question, corrigez la réponse
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 14px',
              border: `1px solid ${CX2.bordure}`, borderRadius: 999, background: CX2.surface,
              whiteSpace: 'nowrap',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: CX2.encre, display: 'block' }} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{fiches} informations actives</span>
            </span>
            <button
              type="button"
              onClick={enregistrerBrouillon}
              disabled={!brouillon.trim() || occupe}
              title={brouillon.trim() ? 'Enregistrer l’information saisie à droite' : 'Rien à enregistrer'}
              style={{
                padding: '11px 24px', border: 'none', borderRadius: '10px',
                background: CX2.encre, color: CX2.surface, fontSize: '14.5px', fontWeight: 500,
                cursor: brouillon.trim() && !occupe ? 'pointer' : 'default',
                opacity: brouillon.trim() && !occupe ? 1 : 0.45,
              }}
            >
              {occupe ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </header>

        {/* Voir OngletsAssistant : deux pages, deux URL, un habillage commun. */}
        <div style={{ maxWidth: 1320, margin: '0 auto 20px' }}>
          <OngletsAssistant />
        </div>

        {message && (
          <div style={{
            maxWidth: 1320, margin: '0 auto 14px', padding: '11px 15px',
            border: `1px solid ${CX2.importBordure}`, background: CX2.importFond,
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
          maxWidth: 1320, margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'minmax(0, 60fr) minmax(0, 40fr)', gap: '20px', alignItems: 'start',
        }}>
          {/* ── GAUCHE : vérification ── */}
          <section style={{ ...STYLE_CARTE, padding: '26px 28px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em' }}>
              Vérifiez ce que répond votre assistant
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: CX2.texteTertiaire }}>
              Cliquez sur une valeur surlignée pour la corriger
            </p>

            <ChipsSuggestions
              suggestions={suggestions}
              restantes={restantes}
              occupe={occupe}
              onChoisir={choisirChip}
              onRenouveler={() => rafraichirSuggestions([...servies, ...suggestions.map((s) => s.id)])}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '22px 0 20px' }}>
              {echanges.length === 0 && (
                <p style={{ margin: 0, fontSize: '14px', color: CX2.texteDiscret }}>
                  Choisissez une question ci-dessus, ou posez la vôtre : la réponse
                  affichée est exactement celle que votre assistant donnera au téléphone.
                </p>
              )}

              {echanges.map((ech) => (
                <div key={ech.cle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {separateurs[ech.cle] && <Separateur>{separateurs[ech.cle]}</Separateur>}
                  <BulleClient texte={ech.question} />
                  {ech.reponse ? (
                    <>
                      <BulleAssistant
                        texte={ech.reponse.answer || "Je n'ai pas encore cette information. Ajoutez-la à droite et je pourrai répondre à vos clients."}
                        initiale={initiale}
                        source={ech.reponse.found ? ech.reponse.source : null}
                        enCours={ech.enCours}
                        onCorriger={(v) => corriger(ech, v)}
                        onModifier={() => setEchanges((e) => e.map((x) => (x.cle === ech.cle ? { ...x, edition: !x.edition } : x)))}
                        onSupprimer={() => supprimer(ech)}
                      />
                      {ech.edition && ech.reponse.source?.chunk_id && (
                        <FormulaireFiche
                          source={ech.reponse.source}
                          onAnnuler={() => setEchanges((e) => e.map((x) => (x.cle === ech.cle ? { ...x, edition: false } : x)))}
                          onEnregistrer={async (champs) => {
                            setOccupe(true);
                            try {
                              await corrigerFiche(ech.reponse!.source!.chunk_id!, champs);
                              await rejouer(ech.cle);
                              await Promise.all([rafraichirHistorique(), rafraichirSuggestions(servies)]);
                            } catch (err) { setMessage((err as Error).message); } finally { setOccupe(false); }
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: CX2.texteDiscret, fontSize: '13.5px' }}>
                      <Loader2 size={14} className="animate-spin" /> Votre assistant réfléchit…
                    </div>
                  )}
                </div>
              ))}
              <div ref={finDuFil} />
            </div>

            <div style={{ display: 'flex', gap: '10px', borderTop: `1px solid ${CX2.separateur}`, paddingTop: '18px' }}>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { poser(question); setQuestion(''); } }}
                placeholder="Posez une question comme le ferait un client..."
                style={{
                  flex: 1, border: `1px solid ${CX2.bordure}`, borderRadius: '10px',
                  padding: '13px 15px', fontSize: '15px', background: CX2.champFond, color: CX2.encre,
                }}
              />
              <button
                type="button"
                onClick={() => { poser(question); setQuestion(''); }}
                style={{
                  padding: '0 22px', border: 'none', borderRadius: '10px', background: CX2.encre,
                  color: CX2.surface, fontSize: '14.5px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Envoyer
              </button>
            </div>
          </section>

          {/* ── DROITE : alimentation ── */}
          <aside style={{
            display: 'flex', flexDirection: 'column', gap: '14px',
            position: 'sticky', top: 24, alignSelf: 'start',
          }}>
            <CarteAjouter
              brouillon={brouillon}
              setBrouillon={setBrouillon}
              onImporterSite={importerSite}
              occupe={occupe}
            />
            <CarteInformations
              total={fiches}
              filtres={categories}
              diff={diff}
              onPrevisualiser={() => setDiff((d) => (d ? { ...d, apercu: !d.apercu } : d))}
              onAppliquer={appliquerImport}
              onAnnuler={() => { setDiff(null); setBrouillon(''); }}
            />
            <CarteHistorique
              modifications={historique}
              onRestaurer={restaurer}
              onVoirCorbeille={ouvrirCorbeille}
              occupe={occupe}
            />
          </aside>
        </div>

        {corbeille && (
          <Corbeille
            documents={corbeille}
            onFermer={() => setCorbeille(null)}
            onRestaurer={async (id) => {
              await restaurerDocument(id);
              setCorbeille((await listerSupprimees()).documents);
              await Promise.all([rafraichirHistorique(), rafraichirSuggestions(servies)]);
            }}
          />
        )}
      </div>
    </>
  );
}

/** « 18 » ou « 18 € » → « 18 EUR », l'écriture du document. */
function normaliserPrix(saisie: string): string {
  const v = saisie.trim().replace(/€/g, 'EUR').replace(/\beuros?\b/gi, 'EUR');
  return /EUR/i.test(v) ? v.replace(/\s*EUR/i, ' EUR') : `${v} EUR`;
}

function FormulaireFiche({ source, onEnregistrer, onAnnuler }: {
  source: SourceReponse;
  onEnregistrer: (champs: { libelle?: string; prix?: string; details?: string }) => void;
  onAnnuler: () => void;
}) {
  const [libelle, setLibelle] = useState(source.libelle || '');
  const [prix, setPrix] = useState(source.prix || '');

  const champ: React.CSSProperties = {
    border: `1px solid ${CX2.bordureFine}`, borderRadius: '9px', padding: '9px 12px',
    fontSize: '14px', background: CX2.champFond, color: CX2.encre,
  };

  return (
    <div style={{
      marginLeft: 42, padding: '14px 16px', border: `1px solid ${CX2.bordureFine}`,
      borderRadius: '10px', background: CX2.champFond, display: 'flex',
      flexDirection: 'column', gap: '10px', maxWidth: '82%',
    }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12.5px', color: CX2.texteSecondaire }}>
        Intitulé
        <input value={libelle} onChange={(e) => setLibelle(e.target.value)} style={champ} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '12.5px', color: CX2.texteSecondaire }}>
        Prix
        <input value={prix} onChange={(e) => setPrix(e.target.value)} style={champ} />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => onEnregistrer({ libelle: libelle.trim(), prix: normaliserPrix(prix) })}
          disabled={!libelle.trim()}
          style={{
            padding: '8px 16px', border: 'none', borderRadius: '8px', background: CX2.encre,
            color: CX2.surface, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >Enregistrer</button>
        <button type="button" onClick={onAnnuler} style={{
          border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500,
          color: CX2.texteSecondaire, cursor: 'pointer', textDecoration: 'underline',
        }}>Annuler</button>
      </div>
    </div>
  );
}

function Corbeille({ documents, onFermer, onRestaurer }: {
  documents: { id: string; title: string; deleted_at: string }[];
  onFermer: () => void;
  onRestaurer: (id: string) => void;
}) {
  return (
    <div
      onClick={onFermer}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,26,25,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...STYLE_CARTE, padding: 24, maxWidth: 520, width: '100%' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>Supprimées récemment</h2>
        <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: CX2.texteSecondaire }}>
          Restaurables pendant 30 jours après leur suppression.
        </p>
        {documents.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13.5px', color: CX2.texteDiscret }}>
            Rien n&apos;a été supprimé récemment.
          </p>
        ) : documents.map((d) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '12px 14px', border: `1px solid ${CX2.bordureFine}`, borderRadius: '10px',
            background: CX2.champFond, marginBottom: 8,
          }}>
            <span style={{ fontSize: '13.5px' }}>
              {d.title}
              <span style={{ color: CX2.texteDiscret }}> — supprimée le {d.deleted_at?.slice(8, 10)}/{d.deleted_at?.slice(5, 7)}</span>
            </span>
            <button type="button" onClick={() => onRestaurer(d.id)} style={{
              border: `1px solid #dcdbd6`, background: CX2.surface, borderRadius: '8px',
              padding: '6px 12px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer',
            }}>Restaurer</button>
          </div>
        ))}
        <button type="button" onClick={onFermer} style={{
          marginTop: 12, border: 'none', background: 'transparent', padding: 0,
          fontSize: '13px', fontWeight: 500, color: CX2.encre, cursor: 'pointer',
          textDecoration: 'underline', textUnderlineOffset: '3px',
        }}>Fermer</button>
      </div>
    </div>
  );
}
