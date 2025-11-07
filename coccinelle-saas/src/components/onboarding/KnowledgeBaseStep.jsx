'use client';

import React, { useState } from 'react';
import { Globe, Upload, MessageSquare, Loader2 } from 'lucide-react';

export default function KnowledgeBaseStep({ sessionId, onNext, onBack, loading }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Option 1 : Crawler site web
  const handleWebsiteCrawl = async () => {
    if (!websiteUrl) return;
    
    setCrawling(true);
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/knowledge/crawl`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({
            url: websiteUrl,
            max_pages: 50
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        onNext({ method: 'website', url: websiteUrl, crawl_job_id: data.job_id });
      } else {
        alert('Erreur lors du crawl : ' + data.error);
        setCrawling(false);
      }
    } catch (error) {
      alert('Erreur réseau');
      setCrawling(false);
    }
  };

  // Option 2 : Upload documents
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadedFiles(files);
  };

  const handleContinueWithFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/knowledge/documents/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        }
      );

      const data = await response.json();
      
      if (data.success) {
        onNext({ method: 'upload', files_count: uploadedFiles.length });
      } else {
        alert('Erreur lors de l\'upload : ' + data.error);
        setUploading(false);
      }
    } catch (error) {
      alert('Erreur réseau');
      setUploading(false);
    }
  };

  // Option 3 : Assistant guidé
  const handleAssistant = () => {
    // Pour l'instant, on skip (sera implémenté plus tard)
    onNext({ method: 'assistant', status: 'skipped' });
  };

  // Skip
  const handleSkip = () => {
    onNext({ method: 'skip' });
  };

  // Vue initiale : Choix de la méthode
  if (selectedMethod === null) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Comment Sara va-t-elle apprendre sur vous ?
        </h2>
        <p className="text-gray-600 mb-8">
          Choisissez la méthode la plus simple pour vous.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Option 1 : Site web */}
          <button
            onClick={() => setSelectedMethod('website')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <Globe className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">J'ai un site web</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sara analyse automatiquement votre site
            </p>
            <span className="text-xs text-gray-500">⏱️ 2 minutes</span>
          </button>

          {/* Option 2 : Documents */}
          <button
            onClick={() => setSelectedMethod('upload')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <Upload className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">J'ai des documents</h3>
            <p className="text-sm text-gray-600 mb-4">
              Uploadez vos PDF, DOCX, TXT
            </p>
            <span className="text-xs text-gray-500">⏱️ 1 minute</span>
          </button>

          {/* Option 3 : Assistant */}
          <button
            onClick={() => setSelectedMethod('assistant')}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-md transition-all text-center"
          >
            <MessageSquare className="w-12 h-12 text-black mx-auto mb-4" />
            <h3 className="font-semibold text-black mb-2">Je n'ai rien</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sara vous pose 5 questions essentielles
            </p>
            <span className="text-xs text-gray-500">⏱️ 3 minutes</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-black transition-colors text-sm"
          >
            ⏭️ Je ferai ça depuis le dashboard
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </div>
    );
  }

  // Vue Website
  if (selectedMethod === 'website') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Analysons votre site web
        </h2>
        <p className="text-gray-600 mb-8">
          Sara va extraire automatiquement vos services, horaires et FAQ.
        </p>

        {!crawling ? (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                URL de votre site web *
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.votre-site.fr"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={handleWebsiteCrawl}
                disabled={!websiteUrl}
                className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Analyser mon site →
              </button>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Loader2 className="w-12 h-12 text-black mx-auto mb-4 animate-spin" />
            <p className="text-gray-700 font-medium mb-2">Sara explore votre site...</p>
            <p className="text-sm text-gray-600">Cela peut prendre quelques instants</p>
          </div>
        )}
      </div>
    );
  }

  // Vue Upload
  if (selectedMethod === 'upload') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Uploadez vos documents
        </h2>
        <p className="text-gray-600 mb-8">
          Sara lira vos PDF, DOCX, TXT pour apprendre sur votre entreprise.
        </p>

        <div className="mb-6">
          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-black transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Glissez-déposez vos fichiers ici
              </p>
              <p className="text-sm text-gray-500">
                ou cliquez pour parcourir
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Formats acceptés : PDF, DOCX, TXT
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setSelectedMethod(null)}
            disabled={uploading}
            className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            ← Retour
          </button>
          <button
            onClick={handleContinueWithFiles}
            disabled={uploadedFiles.length === 0 || uploading}
            className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Upload en cours...' : `Continuer avec ${uploadedFiles.length} fichier${uploadedFiles.length > 1 ? 's' : ''} →`}
          </button>
        </div>
      </div>
    );
  }

  // Vue Assistant
  if (selectedMethod === 'assistant') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">
          Assistant guidé
        </h2>
        <p className="text-gray-600 mb-8">
          Sara vous pose quelques questions essentielles.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-gray-700 mb-4">Cette fonctionnalité sera disponible prochainement.</p>
          <p className="text-sm text-gray-600">
            En attendant, vous pouvez enrichir la base de connaissances depuis le dashboard.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setSelectedMethod(null)}
            className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Retour
          </button>
          <button
            onClick={handleAssistant}
            className="flex-1 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Continuer →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
