'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';

interface PreviewData {
  headers: string[];
  preview: any[];
  suggestions: Record<string, string>;
  requiredFields: string[];
  missingRequired: string[];
  totalRows: number;
}

export default function ImportProductsPage() {
  const router = useRouter();
  const { tenantId, loading: tenantLoading } = useTenant();
  const [step, setStep] = useState<'upload' | 'mapping' | 'importing'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<any>(null);

  const systemFields = [
    { key: 'category', label: 'Catégorie', required: true },
    { key: 'title', label: 'Titre', required: true },
    { key: 'description', label: 'Description', required: false },
    { key: 'price', label: 'Prix', required: false },
    { key: 'price_currency', label: 'Devise', required: false },
    { key: 'available', label: 'Disponible', required: false },
    { key: 'city', label: 'Ville', required: false },
    { key: 'postal_code', label: 'Code postal', required: false },
    { key: 'address', label: 'Adresse', required: false },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handlePreview = async () => {
    if (!file || tenantLoading) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/proxy?path=/api/v1/products/preview-import&tenantId=${tenantId}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse du fichier');
      }

      setPreviewData(data);
      setColumnMapping(data.suggestions || {});
      setStep('mapping');

    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse du fichier');
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!file || tenantLoading) return;

    const requiredFields = systemFields.filter(f => f.required);
    const mappedSystemFields = Object.values(columnMapping);
    const missingRequired = requiredFields.filter(f => !mappedSystemFields.includes(f.key));

    if (missingRequired.length > 0) {
      setError(`Champs requis manquants: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setStep('importing');
    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const res = await fetch(`/api/proxy?path=/api/v1/products/import&tenantId=${tenantId}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'import');
      }

      setSuccess(true);
      setResults(data);

      // Rediriger vers la liste après 2 secondes
      setTimeout(() => {
        router.push('/dashboard/products');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'import des produits');
      setStep('mapping'); // Retourner au mapping en cas d'erreur
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import CSV Produits</h1>
              <p className="text-sm text-gray-500 mt-1">
                {step === 'upload' && 'Étape 1: Sélectionnez votre fichier CSV'}
                {step === 'mapping' && 'Étape 2: Mappez les colonnes'}
                {step === 'importing' && 'Import en cours...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && results && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Import réussi</p>
                <p className="text-sm text-green-700 mt-1">
                  {results.imported} produit(s) importé(s) avec succès
                  {results.errors && results.errors.length > 0 && ` - ${results.errors.length} erreur(s)`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Erreur</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Étape 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Sélectionner un fichier CSV</h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Cliquez pour sélectionner un fichier
                  </span>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">CSV uniquement (max 10MB)</p>

                {file && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg inline-block">
                    <p className="text-sm text-gray-700">
                      <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handlePreview}
                disabled={!file || importing}
                className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    Analyser le fichier
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Étape 2: Mapping */}
        {step === 'mapping' && previewData && (
          <div className="space-y-6">
            {/* Mapping des colonnes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Mapper les colonnes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Associez les colonnes de votre fichier CSV aux champs système. Les champs marqués * sont requis.
              </p>

              <div className="space-y-3">
                {systemFields.map(field => (
                  <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <div className="col-span-2">
                      <select
                        value={Object.entries(columnMapping).find(([_, v]) => v === field.key)?.[0] || ''}
                        onChange={(e) => {
                          const newMapping = { ...columnMapping };
                          // Remove old mapping for this system field
                          Object.keys(newMapping).forEach(k => {
                            if (newMapping[k] === field.key) delete newMapping[k];
                          });
                          // Add new mapping
                          if (e.target.value) {
                            newMapping[e.target.value] = field.key;
                          }
                          setColumnMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Ne pas importer --</option>
                        {previewData.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Aperçu ({previewData.totalRows} ligne(s))</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers.map(header => (
                        <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {header}
                          {columnMapping[header] && (
                            <span className="block text-xs text-blue-600 normal-case mt-1">
                              → {systemFields.find(f => f.key === columnMapping[header])?.label}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.preview.map((row, idx) => (
                      <tr key={idx}>
                        {previewData.headers.map(header => (
                          <td key={header} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setPreviewData(null);
                  setColumnMapping({});
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Retour
              </button>
              <button
                onClick={handleImport}
                disabled={importing || previewData.missingRequired.filter(f => !Object.values(columnMapping).includes(f)).length > 0}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                <Upload className="w-5 h-5" />
                Importer {previewData.totalRows} produit(s)
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Importing */}
        {step === 'importing' && !success && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Import en cours...</p>
            <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
          </div>
        )}

        {/* Success state pendant importing */}
        {step === 'importing' && success && results && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Import terminé avec succès !</p>
            <p className="text-sm text-gray-500 mt-2">
              {results.imported} produit(s) importé(s)
            </p>
            <p className="text-xs text-gray-400 mt-4">Redirection en cours...</p>
          </div>
        )}
      </div>
    </div>
  );
}
