'use client';

import { useState } from 'react';
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Briefcase,
  Info,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

interface BusinessKnowledgeViewProps {
  documents: any[];
  onDocumentDelete?: (docId: string) => void;
  onStructureWithAI?: () => void;
  onAddInformation?: (category: string, data: any) => void;
}

interface BusinessInfo {
  category: string;
  icon: any;
  title: string;
  items: {
    label?: string;
    value: string;
    source: string;
    sourceType: 'google' | 'crawl' | 'manual';
    docId?: string;
  }[];
}

export default function BusinessKnowledgeView({ documents, onDocumentDelete, onStructureWithAI, onAddInformation }: BusinessKnowledgeViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addCategory, setAddCategory] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  // Vérifier si on a des documents structurés (Google Business ou manuels)
  const hasStructuredDocs = documents.some(doc => doc.sourceType === 'google' || doc.sourceType === 'manual');

  // Fonction pour afficher la vue simple (pages crawlées)
  const renderSimpleView = () => {
    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Pages crawlées</h2>
              <p className="text-sm text-gray-600">
                {documents.length} page(s) importée(s) depuis votre site web
              </p>
            </div>
            <button
              onClick={onStructureWithAI}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2 text-sm font-medium"
            >
              <Briefcase className="w-4 h-4" />
              Structurer avec l'IA
            </button>
          </div>
        </div>

        {/* Liste des pages */}
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc, idx) => (
            <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {doc.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                    {doc.content?.substring(0, 200)}...
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      <Globe className="w-3 h-3" />
                      Site web
                    </span>
                    <span className="text-xs text-gray-400">
                      {doc.content?.length || 0} caractères
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Voir le contenu"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  {onDocumentDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Supprimer cette page ?')) {
                          onDocumentDelete(doc.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message d'aide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">💡 Astuce</p>
              <p>
                Cliquez sur <strong>"Structurer avec l'IA"</strong> pour organiser automatiquement ces pages en catégories
                (Contact, Services, À propos, etc.). Ou importez votre fiche Google Business pour des données déjà structurées.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Si pas de documents structurés (Google ou manuels), afficher la vue simple directement
  if (!hasStructuredDocs && documents.length > 0) {
    return renderSimpleView();
  }

  // Extraire les informations business des documents (uniquement Google Business)
  const extractBusinessInfo = (): BusinessInfo[] => {
    // Définir les champs attendus pour chaque catégorie
    const expectedContactFields = [
      { label: 'Adresse', key: 'address' },
      { label: 'Téléphone', key: 'phone' },
      { label: 'Email', key: 'email' },
      { label: 'Site web', key: 'website' }
    ];

    const expectedDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    const categories: BusinessInfo[] = [
      {
        category: 'contact',
        icon: MapPin,
        title: 'Contact',
        items: []
      },
      {
        category: 'schedule',
        icon: Clock,
        title: 'Horaires',
        items: []
      },
      {
        category: 'services',
        icon: Briefcase,
        title: 'Services',
        items: []
      },
      {
        category: 'about',
        icon: Info,
        title: 'À propos',
        items: []
      }
    ];

    // Filtrer les documents Google Business ET manuels
    const googleBusinessDocs = documents.filter(doc => doc.sourceType === 'google' || doc.sourceType === 'manual');

    googleBusinessDocs.forEach(doc => {
      const category = doc.category || 'about';
      const sourceType = doc.sourceType || 'manual';
      const sourceName = sourceType === 'google' ? 'Google Business' :
                        sourceType === 'crawl' ? 'Site web' :
                        'Ajouté manuellement';

      // Extraire les infos selon la catégorie
      const content = doc.content || '';

      if (category === 'contact' || doc.title?.toLowerCase().includes('contact')) {
        // Extraire adresse, téléphone, email, site web
        const addressMatch = content.match(/\*\*Adresse\*\*:\s*(.+)/i);
        const phoneMatch = content.match(/\*\*Téléphone\*\*:\s*(.+)/i);
        const emailMatch = content.match(/\*\*Email\*\*:\s*(.+)/i);
        const websiteMatch = content.match(/\*\*Site web\*\*:\s*(.+)/i);

        const contactCat = categories.find(c => c.category === 'contact');
        if (addressMatch && contactCat) {
          contactCat.items.push({
            label: 'Adresse',
            value: addressMatch[1].trim(),
            source: sourceName,
            sourceType,
            docId: doc.id
          });
        }
        if (phoneMatch && contactCat) {
          contactCat.items.push({
            label: 'Téléphone',
            value: phoneMatch[1].trim(),
            source: sourceName,
            sourceType,
            docId: doc.id
          });
        }
        if (emailMatch && contactCat) {
          contactCat.items.push({
            label: 'Email',
            value: emailMatch[1].trim(),
            source: sourceName,
            sourceType,
            docId: doc.id
          });
        }
        if (websiteMatch && contactCat) {
          contactCat.items.push({
            label: 'Site web',
            value: websiteMatch[1].trim(),
            source: sourceName,
            sourceType,
            docId: doc.id
          });
        }
      } else if (category === 'schedule' || doc.title?.toLowerCase().includes('horaire')) {
        // Extraire les horaires
        const schedCat = categories.find(c => c.category === 'schedule');
        if (schedCat) {
          // Chercher les lignes de type "**Lundi**: 9h-18h"
          const dayMatches = content.matchAll(/\*\*(.+?)\*\*:\s*(.+?)(?:\n|$)/g);
          for (const match of dayMatches) {
            schedCat.items.push({
              label: match[1].trim(),
              value: match[2].trim(),
              source: sourceName,
              sourceType,
              docId: doc.id
            });
          }
        }
      } else if (category === 'services' || doc.title?.toLowerCase().includes('service')) {
        // Extraire les services
        const servicesCat = categories.find(c => c.category === 'services');
        if (servicesCat) {
          // Chercher les lignes de type "- Service (prix)"
          const serviceMatches = content.matchAll(/[-•]\s*(.+)/g);
          for (const match of serviceMatches) {
            servicesCat.items.push({
              value: match[1].trim(),
              source: sourceName,
              sourceType,
              docId: doc.id
            });
          }
        }
      } else {
        // Catégorie À propos
        const aboutCat = categories.find(c => c.category === 'about');
        if (aboutCat) {
          // Prendre le premier paragraphe significatif
          const firstParagraph = content.split('\n\n')[0]?.trim();
          if (firstParagraph && firstParagraph.length > 20) {
            aboutCat.items.push({
              value: firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph,
              source: sourceName,
              sourceType,
              docId: doc.id
            });
          }
        }
      }
    });

    // Compléter avec les champs manquants
    const contactCat = categories.find(c => c.category === 'contact');
    if (contactCat) {
      expectedContactFields.forEach(field => {
        const exists = contactCat.items.some(item => item.label === field.label);
        if (!exists) {
          contactCat.items.push({
            label: field.label,
            value: 'Non renseigné',
            source: '',
            sourceType: 'manual',
            docId: undefined
          });
        }
      });
    }

    const scheduleCat = categories.find(c => c.category === 'schedule');
    if (scheduleCat) {
      expectedDays.forEach(day => {
        const exists = scheduleCat.items.some(item => item.label === day);
        if (!exists) {
          scheduleCat.items.push({
            label: day,
            value: 'Non renseigné',
            source: '',
            sourceType: 'manual',
            docId: undefined
          });
        }
      });
    }

    // Retourner toutes les catégories (avec ou sans contenu)
    return categories;
  };

  const businessInfo = extractBusinessInfo();

  const getSourceBadgeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'google':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'crawl':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manual':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'google':
        return (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        );
      case 'crawl':
        return <Globe className="w-3 h-3" />;
      case 'manual':
        return <Edit className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune information pour le moment</h3>
        <p className="text-gray-600 mb-6">
          Importez votre fiche Google Business ou crawlez votre site web pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Vos informations business</h2>
            <p className="text-sm text-gray-600">
              {documents.length} source(s) importée(s) • {businessInfo.reduce((sum, cat) => sum + cat.items.length, 0)} information(s)
            </p>
          </div>
          <div className="flex gap-2">
            {documents.some(d => d.sourceType === 'google') && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Google
              </span>
            )}
            {documents.some(d => d.sourceType === 'crawl') && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full border border-purple-200 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Site web
              </span>
            )}
            {documents.some(d => d.sourceType === 'manual') && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full border border-gray-200 flex items-center gap-1">
                <Edit className="w-3 h-3" />
                Manuel
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Catégories business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {businessInfo.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.category} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{category.title}</h3>
                  <p className="text-xs text-gray-500">
                    {category.items.filter(item => item.value !== 'Non renseigné').length} / {category.items.length} renseignée(s)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {category.items.map((item, idx) => {
                  const isMissing = item.value === 'Non renseigné';

                  if (isMissing) {
                    // Affichage pour champ manquant
                    return (
                      <div key={idx} className="group">
                        <div className="p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all">
                          {item.label && (
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              {item.label}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              setAddCategory(category.category);
                              setFormData(item.label ? { type: item.label, day: item.label } : {});
                              setShowAddModal(true);
                            }}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            <Plus className="w-4 h-4" />
                            Ajouter cette information
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Affichage normal pour champ renseigné
                  return (
                    <div key={idx} className="group">
                      <div className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          {item.label && (
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              {item.label}
                            </p>
                          )}
                          <p className="text-sm text-gray-900 font-medium break-words">
                            {item.value}
                          </p>
                          {item.source && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getSourceBadgeColor(item.sourceType)}`}>
                                {getSourceIcon(item.sourceType)}
                                {item.source}
                              </span>
                            </div>
                          )}
                        </div>
                        {item.docId && onDocumentDelete && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                if (confirm('Supprimer cette information ?')) {
                                  onDocumentDelete(item.docId);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Pages crawlées (si présentes) */}
      {(() => {
        const crawledDocs = documents.filter(doc => doc.sourceType === 'crawl');
        if (crawledDocs.length === 0) return null;

        return (
          <div className="space-y-4 mt-8">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Pages crawlées</h2>
                  <p className="text-sm text-gray-600">
                    {crawledDocs.length} page(s) importée(s) depuis votre site web
                  </p>
                </div>
                <button
                  onClick={onStructureWithAI}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center gap-2 text-sm font-medium"
                >
                  <Briefcase className="w-4 h-4" />
                  Structurer avec l'IA
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {crawledDocs.map((doc, idx) => (
                <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {doc.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                        {doc.content?.substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                          <Globe className="w-3 h-3" />
                          Site web
                        </span>
                        <span className="text-xs text-gray-400">
                          {doc.content?.length || 0} caractères
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir le contenu"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      {onDocumentDelete && (
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette page ?')) {
                              onDocumentDelete(doc.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Modal pour ajouter une information */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Ajouter une information - {addCategory === 'contact' ? 'Contact' : addCategory === 'schedule' ? 'Horaires' : addCategory === 'services' ? 'Services' : 'À propos'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Formulaire Contact */}
              {addCategory === 'contact' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type || ''}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionnez un type</option>
                      <option value="Adresse">Adresse</option>
                      <option value="Téléphone">Téléphone</option>
                      <option value="Email">Email</option>
                      <option value="Site web">Site web</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label>
                    <input
                      type="text"
                      value={formData.value || ''}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 123 Rue de la Paix, 75000 Paris"
                    />
                  </div>
                </>
              )}

              {/* Formulaire Horaires */}
              {addCategory === 'schedule' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                    <select
                      value={formData.day || ''}
                      onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Sélectionnez un jour</option>
                      <option value="Lundi">Lundi</option>
                      <option value="Mardi">Mardi</option>
                      <option value="Mercredi">Mercredi</option>
                      <option value="Jeudi">Jeudi</option>
                      <option value="Vendredi">Vendredi</option>
                      <option value="Samedi">Samedi</option>
                      <option value="Dimanche">Dimanche</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horaires</label>
                    <input
                      type="text"
                      value={formData.hours || ''}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 9h00 - 18h00"
                    />
                  </div>
                </>
              )}

              {/* Formulaire Services */}
              {addCategory === 'services' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                  <input
                    type="text"
                    value={formData.service || ''}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Développement web"
                  />
                </div>
              )}

              {/* Formulaire À propos */}
              {addCategory === 'about' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Décrivez votre entreprise..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (onAddInformation) {
                    onAddInformation(addCategory, formData);
                  }
                  setShowAddModal(false);
                  setFormData({});
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
