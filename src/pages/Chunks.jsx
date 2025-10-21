import { useState, useEffect } from 'react';
import { Layers, Search, Loader2 } from 'lucide-react';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function Chunks() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents.filter(d => d.chunk_count > 0));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchChunksStatus = async (docId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge/documents/${docId}/embeddings/status`);
      const data = await response.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching chunks status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (docId) => {
    setSelectedDoc(docId);
    if (docId) {
      fetchChunksStatus(docId);
    } else {
      setStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Chunks Visualization</h2>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => handleDocumentChange(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">-- Select a document --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.chunk_count} chunks)
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          )}

          {status && !loading && (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Title</dt>
                    <dd className="mt-1 text-sm text-gray-900">{status.document.title}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {status.document.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Chunks</dt>
                    <dd className="mt-1 text-sm text-gray-900">{status.chunks.total}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Avg Tokens/Chunk</dt>
                    <dd className="mt-1 text-sm text-gray-900">{status.chunks.avgTokens}</dd>
                  </div>
                </dl>
              </div>

              {/* Embedding Progress */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Embedding Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Embedded</span>
                      <span className="font-medium">{status.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{status.chunks.embedded}</div>
                      <div className="text-xs text-gray-600">Embedded</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-yellow-600">{status.chunks.pending}</div>
                      <div className="text-xs text-gray-600">Pending</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{status.chunks.total}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedDoc && !loading && (
            <div className="text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No document selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select a document to view its chunks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
