import { FileText, RefreshCw, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/knowledge/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Documents</h1>
        <p className="text-sm text-gray-600">Gérez vos documents de la Knowledge Base</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        
        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau document
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">Aucun document</h3>
          <p className="text-sm text-gray-500">Commencez par ajouter votre premier document</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{doc.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{doc.id}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {doc.chunk_count || 0} chunks
                  </span>
                  <div className={`w-2 h-2 rounded-full ${doc.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
