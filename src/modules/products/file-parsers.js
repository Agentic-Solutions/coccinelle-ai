/**
 * Parsers multi-formats pour l'import de produits
 * Compatible Cloudflare Workers (pas de dépendances externes)
 * Supporte: CSV, JSON (PDF/Excel à venir)
 */

import { analyzeAndCleanCSV, suggestSmartMapping, detectVariantStructure } from './data-cleaner.js';

/**
 * Détecte le format du fichier
 */
export function detectFileFormat(file) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (name.endsWith('.csv') || type.includes('csv')) return 'csv';
  if (name.endsWith('.json') || type.includes('json')) return 'json';
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('spreadsheet')) return 'excel';
  if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf';
  if (name.match(/\.(jpg|jpeg|png|gif)$/i) || type.includes('image')) return 'image';

  return 'unknown';
}

/**
 * Parse un fichier CSV (parsing natif JavaScript) avec nettoyage intelligent
 */
export async function parseCSVFile(file, options = {}) {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    return row;
  });

  // Nettoyage intelligent automatique (activé par défaut)
  const enableCleaning = options.enableCleaning !== false;

  if (enableCleaning) {
    const cleaned = analyzeAndCleanCSV(headers, rows);

    // Détecter si le CSV contient des variantes de produits
    const variantInfo = detectVariantStructure(cleaned.cleanedHeaders, cleaned.cleanedRows);

    return {
      headers: cleaned.cleanedHeaders,
      rows: cleaned.cleanedRows,
      preview: cleaned.cleanedRows.slice(0, 5),
      totalRows: cleaned.cleanedRows.length,
      // Informations de nettoyage
      cleaning: {
        applied: true,
        analysis: cleaned.analysis,
        ignoredColumns: cleaned.ignoredColumns,
        keptColumns: cleaned.keptColumns,
        totalColumns: cleaned.totalColumns
      },
      // Informations sur les variantes
      variants: variantInfo
    };
  }

  // Mode sans nettoyage (legacy)
  return {
    headers,
    rows,
    preview: rows.slice(0, 5),
    totalRows: rows.length,
    cleaning: { applied: false }
  };
}

/**
 * Parse un fichier JSON
 */
export async function parseJSONFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  // Si c'est un tableau
  if (Array.isArray(data)) {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    return {
      headers,
      rows: data,
      preview: data.slice(0, 5),
      totalRows: data.length
    };
  }

  // Si c'est un objet avec une clé contenant les données
  const possibleKeys = ['data', 'items', 'products', 'records'];
  for (const key of possibleKeys) {
    if (Array.isArray(data[key])) {
      const headers = data[key].length > 0 ? Object.keys(data[key][0]) : [];
      return {
        headers,
        rows: data[key],
        preview: data[key].slice(0, 5),
        totalRows: data[key].length
      };
    }
  }

  throw new Error('Invalid JSON format. Expected an array or object with data array.');
}

/**
 * Parse un fichier selon son format
 */
export async function parseFile(file, env) {
  const format = detectFileFormat(file);

  switch (format) {
    case 'csv':
      return { format, ...(await parseCSVFile(file)) };

    case 'json':
      return { format, ...(await parseJSONFile(file)) };

    case 'excel':
      throw new Error('Excel files are not yet supported. Please convert to CSV or JSON.');

    case 'pdf':
      throw new Error('PDF files are not yet supported. Please convert to CSV or JSON.');

    case 'image':
      throw new Error('Image files are not yet supported. Please use CSV or JSON.');

    default:
      throw new Error(`Unsupported file format: ${file.name}. Please use CSV or JSON files.`);
  }
}

/**
 * Utilise l'IA Workers AI pour suggérer le meilleur mapping de colonnes
 * + Mapping intelligent basé sur l'analyse de contenu
 */
export async function suggestMappingWithAI(headers, preview, env, cleaningAnalysis = null) {
  // Si on a une analyse de nettoyage, l'utiliser en priorité
  if (cleaningAnalysis) {
    const smartMapping = suggestSmartMapping(cleaningAnalysis);

    // Si le mapping intelligent a trouvé au moins 3 champs utiles, l'utiliser
    const mappedFields = Object.values(smartMapping);
    const hasTitle = mappedFields.includes('title');
    const hasPrice = mappedFields.includes('price');
    const hasUsefulFields = mappedFields.length >= 3;

    if (hasUsefulFields || (hasTitle && hasPrice)) {
      return {
        mapping: smartMapping,
        confidence: 'high',
        explanations: Object.entries(cleaningAnalysis).reduce((acc, [header, info]) => {
          if (smartMapping[header]) {
            acc[header] = `Détecté automatiquement comme ${info.detectedType} (confiance: ${Math.round(info.confidence * 100)}%)`;
          }
          return acc;
        }, {}),
        aiGenerated: false,
        method: 'smart_content_analysis'
      };
    }
  }

  // Sinon, utiliser l'IA comme fallback
  const systemFields = [
    { key: 'category', label: 'Catégorie', required: true, description: 'Type ou catégorie du produit (ex: real_estate, service, etc.)' },
    { key: 'title', label: 'Titre', required: true, description: 'Nom ou titre du produit' },
    { key: 'description', label: 'Description', required: false, description: 'Description détaillée du produit' },
    { key: 'price', label: 'Prix', required: false, description: 'Prix du produit (nombre)' },
    { key: 'price_currency', label: 'Devise', required: false, description: 'Monnaie (EUR, USD, etc.)' },
    { key: 'available', label: 'Disponible', required: false, description: 'Disponibilité: 1/0, true/false, oui/non' },
    { key: 'city', label: 'Ville', required: false, description: 'Ville ou localisation' },
    { key: 'postal_code', label: 'Code postal', required: false, description: 'Code postal' },
    { key: 'address', label: 'Adresse', required: false, description: 'Adresse complète' }
  ];

  const prompt = `Tu es un expert en analyse de données. Analyse ces colonnes et propose le meilleur mapping.

COLONNES DU FICHIER:
${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

APERÇU DES DONNÉES (3 premières lignes):
${JSON.stringify(preview.slice(0, 3), null, 2)}

CHAMPS CIBLES DISPONIBLES:
${systemFields.map(f => `- ${f.key}: ${f.description}${f.required ? ' (REQUIS)' : ''}`).join('\n')}

INSTRUCTIONS IMPORTANTES:
1. Identifie quelle colonne du fichier correspond à quel champ cible
2. Les champs "category" et "title" sont OBLIGATOIRES - trouve-les dans les colonnes
3. Si une colonne ne correspond à rien, ignore-la
4. Retourne UNIQUEMENT un JSON valide sans markdown, sans explications, avec exactement ce format:
{
  "mapping": {
    "nom_colonne_fichier": "champ_cible"
  },
  "confidence": "high",
  "explanations": {
    "nom_colonne_fichier": "raison du choix"
  }
}

RÉPONDS UNIQUEMENT AVEC LE JSON BRUT, RIEN D'AUTRE.`;

  try {
    const result = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: 'Tu retournes UNIQUEMENT du JSON valide, sans markdown (pas de ```json), sans texte avant ou après.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024
    });

    let response = result.response || '';

    // Nettoyer la réponse (enlever markdown si présent)
    response = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Si la réponse commence par du texte avant le JSON, extraire le JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      response = jsonMatch[0];
    }

    const aiSuggestion = JSON.parse(response);

    return {
      mapping: aiSuggestion.mapping || {},
      confidence: aiSuggestion.confidence || 'medium',
      explanations: aiSuggestion.explanations || {},
      aiGenerated: true
    };

  } catch (error) {
    // Fallback: utiliser le mapping basique si l'IA échoue
    console.error('AI mapping failed, using fallback:', error.message);
    return {
      mapping: fallbackMapping(headers),
      confidence: 'low',
      explanations: {},
      aiGenerated: false,
      error: 'AI analysis failed, using basic pattern matching'
    };
  }
}

/**
 * Mapping de secours basique (pattern matching)
 */
function fallbackMapping(headers) {
  const mapping = {};
  const patterns = {
    'category': ['categorie', 'category', 'type', 'cat'],
    'title': ['titre', 'title', 'nom', 'name', 'intitule', 'intitulé', 'libelle', 'libellé'],
    'description': ['description', 'desc', 'descriptif', 'details', 'détails'],
    'price': ['prix', 'price', 'montant', 'amount', 'tarif'],
    'price_currency': ['devise', 'currency', 'monnaie'],
    'available': ['disponible', 'available', 'dispo', 'stock'],
    'city': ['ville', 'city', 'localite', 'localité'],
    'postal_code': ['code_postal', 'postal_code', 'cp', 'zip'],
    'address': ['adresse', 'address', 'rue', 'street']
  };

  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    for (const [systemField, variations] of Object.entries(patterns)) {
      if (variations.some(v => headerLower.includes(v))) {
        mapping[header] = systemField;
        break;
      }
    }
  });

  return mapping;
}
