import { useState } from 'react';
import { Search, Loader2, FileText } from 'lucide-react';

const API_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';

export default function SearchTesting() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('search');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tenantId] = useState('tenant_demo_001');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const endpoint = searchType === 'search' 
        ? `${API_URL}/api/v1/knowledge/search`
        : `${API_URL}/api/v1/knowledge/ask`;

      const body = searchType === 'search'
        ? { query, topK: 5, tenantId }
        : { question: query, topK: 5, tenantId };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error:', error);
      setResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Search Testing</h2>
      </div>

      {/* Search Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          {/* Search Type Toggle */}
          <div className="flex space-x-4 border-b border-gray-200">
            <button
              onClick={() => setSearchType('search')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                searchType === 'search'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Hybrid Search
            </button>
            <button
              onClick={() => setSearchType('ask')}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                searchType === 'ask'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              RAG Question
            </button>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'search' ? 'Search Query' : 'Question'}
            </label>
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={searchType === 'search' 
                  ? 'Enter your search query...' 
                  : 'Ask a question about your documents...'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows="3"
              />
            </div>
          </div>

          {/* Tenant ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tenant ID
            </label>
            <input
              type="text"
              value={tenantId}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                {searchType === 'search' ? 'Search' : 'Ask Question'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results</h3>

          {results.success ? (
            <div className="space-y-4">
              {/* RAG Answer */}
              {searchType === 'ask' && results.answer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Answer</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{results.answer}</p>
                  {results.tokensUsed && (
                    <div className="mt-3 text-xs text-blue-600">
                      Tokens used: {results.tokensUsed.total} (input: {results.tokensUsed.input}, output: {results.tokensUsed.output})
                    </div>
                  )}
                </div>
              )}

              {/* Search Results */}
              {searchType === 'search' && (
                <div>
                  <div className="text-sm text-gray-600 mb-3">
                    Found {results.resultsCount} result(s)
                  </div>
                  <div className="space-y-3">
                    {results.results && results.results.length > 0 ? (
                      results.results.map((result, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-gray-400 mr-2" />
                              <h4 className="text-sm font-medium text-gray-900">
                                {result.document_title || 'Untitled'}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                Score: {(result.score || 0).toFixed(2)}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                result.searchSource === 'semantic' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {result.searchSource || 'unknown'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-3">{result.content}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Chunk {result.chunk_index} • {result.token_count} tokens
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No results found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sources (for RAG) */}
              {searchType === 'ask' && results.sources && results.sources.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sources ({results.sources.length})</h4>
                  <div className="space-y-2">
                    {results.sources.map((source, idx) => (
                      <div key={idx} className="text-sm text-gray-600 flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-400" />
                        {source.documentTitle}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">Error: {results.error || 'Unknown error'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
