'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Trash2, Bot, Loader2, File, CheckCircle, AlertCircle } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '@/lib/config';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  synced: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('auth_token');
        const res = await fetch(buildApiUrl('/api/v1/knowledge/documents/upload'), {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setDocuments(prev => [...prev, {
            id: data.id || Date.now().toString(),
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            synced: false,
            syncStatus: 'pending',
          }]);
        }
      } catch {
        // Upload error
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSync(docId: string) {
    setSyncingId(docId);
    try {
      // Trigger sync with agent knowledge base
      await fetch(buildApiUrl(`/api/v1/knowledge/documents/${docId}/sync`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, synced: true, syncStatus: 'synced' as const } : d
      ));
    } catch {
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, syncStatus: 'error' as const } : d
      ));
    }
    setSyncingId(null);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function getFileIcon(type: string) {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('text')) return 'TXT';
    return 'FILE';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="pl-10 lg:pl-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
                Documents
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Uploadez des documents pour enrichir la base de connaissances de votre agent
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-all mb-6"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          {uploading ? (
            <div>
              <Loader2 className="w-10 h-10 text-gray-500 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-gray-600">Upload en cours...</p>
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="font-medium text-gray-700">Cliquez ou glissez vos fichiers ici</p>
              <p className="text-xs text-gray-500 mt-1">PDF, Word, TXT — Max 10 MB par fichier</p>
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun document uploadé.</p>
            <p className="text-sm mt-1">Vos documents seront indexés automatiquement pour votre agent vocal.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.size)} — {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.syncStatus === 'synced' ? (
                    <span className="flex items-center gap-1 text-xs text-gray-700">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Synchronisé
                    </span>
                  ) : doc.syncStatus === 'error' ? (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Erreur
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSync(doc.id)}
                      disabled={syncingId === doc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {syncingId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                      Sync agent
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
