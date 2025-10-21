import { useState, useEffect } from 'react';
import { BarChart3, FileText, Layers, Database, Loader2 } from 'lucide-react';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge/documents`);
      const data = await response.json();
      
      if (data.success) {
        // Calculate statistics
        const totalDocs = data.documents.length;
        const totalChunks = data.documents.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0);
        const totalTokens = data.documents.reduce((sum, doc) => sum + (doc.total_tokens || 0), 0);
        const indexedDocs = data.documents.filter(doc => doc.status === 'indexed').length;
        const chunkedDocs = data.documents.filter(doc => doc.status === 'chunked').length;
        const pendingDocs = data.documents.filter(doc => doc.status === 'pending').length;

        setStats({
          totalDocs,
          totalChunks,
          totalTokens,
          indexedDocs,
          chunkedDocs,
          pendingDocs,
          avgChunksPerDoc: totalDocs > 0 ? (totalChunks / totalDocs).toFixed(1) : 0,
          avgTokensPerDoc: totalDocs > 0 ? Math.round(totalTokens / totalDocs) : 0,
          documents: data.documents
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.totalDocs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Layers className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Chunks</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.totalChunks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tokens</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.totalTokens.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Indexed Docs</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.indexedDocs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Status Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{stats.indexedDocs}</div>
            <div className="text-sm text-gray-600 mt-1">Indexed</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{stats.chunkedDocs}</div>
            <div className="text-sm text-gray-600 mt-1">Chunked</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">{stats.pendingDocs}</div>
            <div className="text-sm text-gray-600 mt-1">Pending</div>
          </div>
        </div>
      </div>

      {/* Averages */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Average Metrics</h3>
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="px-4 py-5 bg-gray-50 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">Avg Chunks per Document</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.avgChunksPerDoc}</dd>
          </div>
          <div className="px-4 py-5 bg-gray-50 rounded-lg">
            <dt className="text-sm font-medium text-gray-500">Avg Tokens per Document</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.avgTokensPerDoc}</dd>
          </div>
        </dl>
      </div>

      {/* Recent Documents */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Documents</h3>
        <div className="space-y-3">
          {stats.documents.slice(0, 5).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center min-w-0">
                <FileText className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{doc.title}</div>
                  <div className="text-xs text-gray-500">
                    {doc.chunk_count || 0} chunks • {doc.total_tokens || 0} tokens
                  </div>
                </div>
              </div>
              <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                doc.status === 'indexed' 
                  ? 'bg-green-100 text-green-800'
                  : doc.status === 'chunked'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
