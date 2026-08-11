-- ============================================================================
-- Re-ingestion des fiches — documents deja en base
-- Genere par scripts/generer_reingestion_fiches.mjs depuis shared/kb-fiches.js
--
-- Un document tabulaire engendre une fiche par ligne dans knowledge_chunks.
-- Les documents rediges ne produisent rien : ils restent servis par la
-- recherche prose, inchangee. Aucun knowledge_documents n'est modifie,
-- hormis son compteur chunk_count.
-- ============================================================================

-- ── CONTROLE AVANT ──
SELECT COUNT(*) AS fiches_avant FROM knowledge_chunks;

-- ── Presentation Agentic Solutions (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_demo_agentic_001';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_demo_agentic_001';

-- ── Horaires et contact (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_demo_agentic_003';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_demo_agentic_003';

-- ── Questions frequentes (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_demo_agentic_004';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_demo_agentic_004';

-- ── Tarifs et offres Agentic Solutions avril 2026 (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_text_1777299491153_hp51d';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_text_1777299491153_hp51d';

-- ── Comportement par defaut de l assistant (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_text_1777299505879_hudlfh';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_text_1777299505879_hudlfh';

-- ── Adresse et localisation (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_adresse_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_adresse_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';

-- ── Nos services et prestations (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_services_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_services_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';

-- ── Nos tarifs (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_tarifs_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_tarifs_tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';

-- ── Que faire en cas de fuite d eau (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_maze_001';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_maze_001';

-- ── Quand a lieu l assemblee generale (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_maze_002';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_maze_002';

-- ── Comment sont calculees les charges (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_maze_003';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_maze_003';

-- ── Comment signaler un sinistre (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_maze_004';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_maze_004';

-- ── Quels travaux sont prevus (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_maze_005';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_maze_005';

-- ── Horaires (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_manual_1779104033221_wuy1z';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_manual_1779104033221_wuy1z';

-- ── Horaires et contact du syndic (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_001';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_001';

-- ── Paiement des charges de copropriété (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_002';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_002';

-- ── Comprendre le montant des charges (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_003';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_003';

-- ── Entretien de l'ascenseur (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_004';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_004';

-- ── Signaler une fuite d'eau ou un dégât des eaux (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_005';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_005';

-- ── Travaux dans les parties communes (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_006';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_006';

-- ── Assemblée générale des copropriétaires (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_007';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_007';

-- ── Rôle du gardien de l'immeuble (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_008';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_008';

-- ── Litiges et nuisances entre voisins (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_009';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_009';

-- ── Vendre ou louer son logement dans la copropriété (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_010';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_010';

-- ── Demander un rendez-vous avec le syndic (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'kb_syndic_011';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'kb_syndic_011';

-- ── Adresse et localisation (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_adresse_tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_adresse_tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';

-- ── Nos services et prestations (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_services_tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_services_tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp';

-- ── Adresse et localisation (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_adresse_tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_adresse_tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t';

-- ── Nos services et prestations (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_services_tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_services_tenant_eS5hbXJvdWNoZXRlc3RAZ21haWwuY29t';

-- ── Adresse et localisation (prose, 0 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_adresse_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t';
UPDATE knowledge_documents SET chunk_count = 0 WHERE id = 'doc_adresse_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t';

-- ── Nos services et prestations (tableau, 29 fiche(s))
DELETE FROM knowledge_chunks WHERE document_id = 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t';
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_0', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 0, 'Horaires : Lun-ven 8h-19h, samedi 9h-17h, ferme dimanche.', 15, '{"type":"fiche","libelle":"Horaires","prix":"","details":"Lun-ven 8h-19h, samedi 9h-17h, ferme dimanche","categorie":"Infos"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_1', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 1, 'Adresse : 45 avenue des Minimes, 31200 Toulouse, parking client gratuit.', 18, '{"type":"fiche","libelle":"Adresse","prix":"","details":"45 avenue des Minimes, 31200 Toulouse, parking client gratuit","categorie":"Infos"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_2', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 2, 'Vehicule de courtoisie : Sur reservation, intervention >4h, 3 vehicules disponibles.', 21, '{"type":"fiche","libelle":"Vehicule de courtoisie","prix":"","details":"Sur reservation, intervention >4h, 3 vehicules disponibles","categorie":"Infos"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_3', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 3, 'Vidange essence (filtre inclus) : 89 euros.', 11, '{"type":"fiche","libelle":"Vidange essence (filtre inclus)","prix":"89 EUR","details":"","categorie":"Entretien"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_4', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 4, 'Vidange diesel (filtre inclus) : 99 euros.', 11, '{"type":"fiche","libelle":"Vidange diesel (filtre inclus)","prix":"99 EUR","details":"","categorie":"Entretien"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_5', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 5, 'Revision complete citadine : 189 euros.', 10, '{"type":"fiche","libelle":"Revision complete citadine","prix":"189 EUR","details":"","categorie":"Entretien"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_6', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 6, 'Revision complete berline : 229 euros.', 10, '{"type":"fiche","libelle":"Revision complete berline","prix":"229 EUR","details":"","categorie":"Entretien"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_7', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 7, 'Revision complete SUV/4x4 : 269 euros.', 10, '{"type":"fiche","libelle":"Revision complete SUV/4x4","prix":"269 EUR","details":"","categorie":"Entretien"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_8', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 8, 'Forfait plaquettes avant (main d oeuvre incluse) : 149 euros.', 16, '{"type":"fiche","libelle":"Forfait plaquettes avant (main d oeuvre incluse)","prix":"149 EUR","details":"","categorie":"Freinage"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_9', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 9, 'Plaquettes + disques avant : 289 euros.', 10, '{"type":"fiche","libelle":"Plaquettes + disques avant","prix":"289 EUR","details":"","categorie":"Freinage"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_10', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 10, 'Courroie de distribution + pompe a eau : 450 à 750 euros (Sur devis selon modele).', 21, '{"type":"fiche","libelle":"Courroie de distribution + pompe a eau","prix":"450-750 EUR","details":"Sur devis selon modele","categorie":"Distribution"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_11', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 11, 'Montage equilibrage : 15 euros (Par pneu).', 11, '{"type":"fiche","libelle":"Montage equilibrage","prix":"15 EUR","details":"Par pneu","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_12', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 12, 'Pneu entree de gamme : à partir de 59 euros.', 11, '{"type":"fiche","libelle":"Pneu entree de gamme","prix":"des 59 EUR","details":"","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_13', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 13, 'Pneu Michelin/Continental : à partir de 89 euros.', 13, '{"type":"fiche","libelle":"Pneu Michelin/Continental","prix":"des 89 EUR","details":"","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_14', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 14, 'Pneu hiver : à partir de 79 euros.', 9, '{"type":"fiche","libelle":"Pneu hiver","prix":"des 79 EUR","details":"","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_15', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 15, 'Permutation : 25 euros.', 6, '{"type":"fiche","libelle":"Permutation","prix":"25 EUR","details":"","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_16', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 16, 'Reparation crevaison : 25 euros (Si reparable).', 12, '{"type":"fiche","libelle":"Reparation crevaison","prix":"25 EUR","details":"Si reparable","categorie":"Pneus"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_17', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 17, 'Recharge gaz R134a : 79 euros.', 8, '{"type":"fiche","libelle":"Recharge gaz R134a","prix":"79 EUR","details":"","categorie":"Climatisation"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_18', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 18, 'Recharge gaz R1234yf : 129 euros (Vehicules apres 2017).', 14, '{"type":"fiche","libelle":"Recharge gaz R1234yf","prix":"129 EUR","details":"Vehicules apres 2017","categorie":"Climatisation"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_19', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 19, 'Diagnostic electronique : 59 euros (Offert si reparation au garage).', 17, '{"type":"fiche","libelle":"Diagnostic electronique","prix":"59 EUR","details":"Offert si reparation au garage","categorie":"Divers"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_20', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 20, 'Batterie posee : à partir de 119 euros.', 10, '{"type":"fiche","libelle":"Batterie posee","prix":"des 119 EUR","details":"","categorie":"Divers"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_21', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 21, 'Ampoules et essuie-glaces : Pose offerte si achat au garage.', 15, '{"type":"fiche","libelle":"Ampoules et essuie-glaces","prix":"","details":"Pose offerte si achat au garage","categorie":"Divers"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_22', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 22, 'Forfait pre-controle : 49 euros (Pas de CT sur place, partenaire Autosur a 500m).', 21, '{"type":"fiche","libelle":"Forfait pre-controle","prix":"49 EUR","details":"Pas de CT sur place, partenaire Autosur a 500m","categorie":"Controle technique"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_23', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 23, 'Delai entretien courant : 48h en moyenne.', 11, '{"type":"fiche","libelle":"Delai entretien courant","prix":"","details":"48h en moyenne","categorie":"RDV"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_24', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 24, 'Delai intervention lourde : 1 semaine.', 10, '{"type":"fiche","libelle":"Delai intervention lourde","prix":"","details":"1 semaine","categorie":"RDV"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_25', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 25, 'Depannage urgence : Jour meme selon dispo, majoration 30%.', 15, '{"type":"fiche","libelle":"Depannage urgence","prix":"","details":"Jour meme selon dispo, majoration 30%","categorie":"RDV"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_26', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 26, 'Depot avant 9h : Pret le soir meme (entretien courant).', 14, '{"type":"fiche","libelle":"Depot avant 9h","prix":"","details":"Pret le soir meme (entretien courant)","categorie":"RDV"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_27', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 27, 'Moyens acceptes : CB, especes, cheque, virement, 3x sans frais des 300 EUR.', 19, '{"type":"fiche","libelle":"Moyens acceptes","prix":"","details":"CB, especes, cheque, virement, 3x sans frais des 300 EUR","categorie":"Paiement"}', datetime('now'));
INSERT INTO knowledge_chunks (id, document_id, tenant_id, chunk_index, content, token_count, metadata, created_at)
VALUES ('fiche_doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t_28', 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 'tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t', 28, 'Reparations : 2 ans pieces et main d oeuvre, pieces restituees sur demande.', 19, '{"type":"fiche","libelle":"Reparations","prix":"","details":"2 ans pieces et main d oeuvre, pieces restituees sur demande","categorie":"Garantie"}', datetime('now'));
UPDATE knowledge_documents SET chunk_count = 29 WHERE id = 'doc_services_tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t';

-- ── CONTROLE APRES ──
SELECT COUNT(*) AS fiches_apres FROM knowledge_chunks;
SELECT t.name AS societe, COUNT(*) AS fiches FROM knowledge_chunks kc
  LEFT JOIN tenants t ON t.id = kc.tenant_id GROUP BY kc.tenant_id ORDER BY fiches DESC;
-- Garde-fou : aucune fiche sans libelle exploitable (attendu : 0 ligne)
SELECT id, content FROM knowledge_chunks WHERE content IS NULL OR TRIM(content) = '';
