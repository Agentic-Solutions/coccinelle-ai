'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════
// PAGE IMPORT DE CONTACTS - Upload CSV
// ═══════════════════════════════════════

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

const samplePreview = [
  { first_name: 'Marie', last_name: 'Martin', email: 'marie@acme.com', phone: '+33 6 12 34 56 78', company: 'Acme Corp' },
  { first_name: 'Pierre', last_name: 'Durand', email: 'pierre@tech.com', phone: '+33 6 23 45 67 89', company: 'Tech SAS' },
  { first_name: 'Lucas', last_name: 'Bernard', email: 'lucas@xyz.com', phone: '+33 6 45 67 89 01', company: 'StartupXYZ' },
]

export default function ImportContactsPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    // TODO: Parser le CSV et afficher l'aperçu
    setStep('preview')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file)
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  function startImport() {
    setStep('importing')
    // TODO: Envoyer le fichier au backend
    setTimeout(() => setStep('done'), 2000)
  }

  return (
    <div>
      <Header title="Importer des contacts" subtitle="Importez vos contacts depuis un fichier CSV" />

      <div className="p-6 space-y-6">
        <Link href="/contacts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour aux contacts
        </Link>

        {/* Étape 1 : Upload */}
        {step === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'bg-white rounded-xl border-2 border-dashed p-12 text-center transition-colors',
              isDragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300'
            )}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Glissez votre fichier CSV ici</h2>
            <p className="text-sm text-gray-500 mb-4">ou cliquez pour sélectionner un fichier</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium cursor-pointer">
              <FileText className="w-4 h-4" /> Sélectionner un fichier
              <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
            </label>
            <p className="text-xs text-gray-400 mt-4">Format requis : CSV avec colonnes first_name, last_name, email, phone, company</p>
          </div>
        )}

        {/* Étape 2 : Aperçu */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{fileName}</p>
                  <p className="text-xs text-gray-500">{samplePreview.length} contacts détectés</p>
                </div>
              </div>
              <button onClick={() => setStep('upload')} className="text-sm text-gray-500 hover:text-gray-700">
                Changer de fichier
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Aperçu des contacts</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Prénom</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Entreprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {samplePreview.map((row, i) => (
                    <tr key={i} className="text-sm text-gray-600">
                      <td className="px-5 py-2">{row.first_name}</td>
                      <td className="px-5 py-2">{row.last_name}</td>
                      <td className="px-5 py-2">{row.email}</td>
                      <td className="px-5 py-2">{row.phone}</td>
                      <td className="px-5 py-2">{row.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={startImport}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
              >
                <Upload className="w-4 h-4" /> Importer {samplePreview.length} contacts
              </button>
              <button onClick={() => setStep('upload')} className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Import en cours */}
        {step === 'importing' && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Loader2 className="w-12 h-12 text-brand-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Import en cours...</h2>
            <p className="text-sm text-gray-500">Veuillez patienter pendant l&apos;import de vos contacts.</p>
          </div>
        )}

        {/* Étape 4 : Terminé */}
        {step === 'done' && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Import terminé</h2>
            <p className="text-sm text-gray-500 mb-6">{samplePreview.length} contacts ont été importés avec succès.</p>
            <Link
              href="/contacts"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              Voir les contacts
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
