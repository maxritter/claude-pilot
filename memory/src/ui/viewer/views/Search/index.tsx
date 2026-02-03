import React, { useState } from 'react';
import { SearchInput } from './SearchInput';
import { SearchFilters } from './SearchFilters';
import { SearchResultCard } from './SearchResultCard';
import { EmptyState, Spinner, Badge, Icon } from '../../components/ui';

interface SearchResult {
  id: number;
  type: 'observation' | 'summary' | 'prompt';
  title: string;
  content: string;
  project: string;
  timestamp: string;
  score: number;
  obsType?: string;
  tags?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  usedSemantic: boolean;
  vectorDbAvailable: boolean;
}

export function SearchView() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{ usedSemantic: boolean; vectorDbAvailable: boolean } | null>(null);
  const [filters, setFilters] = useState<{
    type?: string;
    project?: string;
    dateRange?: string;
    tags?: string[];
  }>({});

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ query, limit: '30' });
      if (filters.type) params.set('type', filters.type === 'observation' ? 'observations' : filters.type === 'summary' ? 'sessions' : 'prompts');
      if (filters.project) params.set('project', filters.project);

      // If tags are selected, use tag search instead
      if (filters.tags && filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','));
        const response = await fetch(`/api/search/by-tags?${params}`);
        const data = await response.json();
        // Map observations to result format
        const mapped = (data.observations || []).map((obs: any) => ({
          id: obs.id,
          type: 'observation',
          title: obs.title || 'Untitled',
          content: obs.narrative || obs.text || '',
          project: obs.project || '',
          timestamp: obs.created_at,
          score: 0,
          obsType: obs.type,
          tags: obs.tags ? JSON.parse(obs.tags) : []
        }));
        setResults(mapped);
        setSearchMeta({ usedSemantic: false, vectorDbAvailable: true });
      } else {
        // Use semantic search
        const response = await fetch(`/api/search/semantic?${params}`);
        const data: SearchResponse = await response.json();

        setResults(data.results || []);
        setSearchMeta({
          usedSemantic: data.usedSemantic,
          vectorDbAvailable: data.vectorDbAvailable
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setSearchMeta(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (key: string, value: string | string[] | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Semantic Search</h1>
        <p className="text-base-content/60">Find memories using AI-powered semantic similarity</p>
      </div>

      <SearchInput onSearch={handleSearch} isSearching={isSearching} />
      <SearchFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Search mode indicator */}
      {searchMeta && (
        <div className="flex items-center gap-2 text-sm">
          {filters.tags && filters.tags.length > 0 ? (
            <Badge variant="info" outline size="sm">
              <Icon icon="lucide:tags" size={14} className="mr-1" />
              Tag Filter Active
            </Badge>
          ) : searchMeta.vectorDbAvailable ? (
            searchMeta.usedSemantic ? (
              <Badge variant="success" outline size="sm">
                <Icon icon="lucide:brain" size={14} className="mr-1" />
                Semantic Search Active
              </Badge>
            ) : (
              <Badge variant="warning" outline size="sm">
                <Icon icon="lucide:filter" size={14} className="mr-1" />
                Filter-only Mode
              </Badge>
            )
          ) : (
            <Badge variant="error" outline size="sm">
              <Icon icon="lucide:alert-triangle" size={14} className="mr-1" />
              Vector DB Unavailable
            </Badge>
          )}
          <span className="text-base-content/50">
            {filters.tags && filters.tags.length > 0
              ? 'Results filtered by tags'
              : searchMeta.usedSemantic
                ? 'Results ranked by semantic similarity'
                : searchMeta.vectorDbAvailable
                  ? 'Enter a query for semantic ranking'
                  : 'Install Chroma/Qdrant for semantic search'}
          </span>
        </div>
      )}

      {isSearching ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : !hasSearched ? (
        <EmptyState
          icon="lucide:brain"
          title="Semantic Search"
          description="Enter a natural language query to find related memories. Results are ranked by AI-powered similarity matching."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="lucide:search-x"
          title="No results found"
          description="Try a different query or adjust your filters"
        />
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-base-content/60">
            {results.length} results
            {searchMeta?.usedSemantic && results[0]?.score > 0 && (
              <span className="ml-2">
                (best match: {Math.round(results[0].score * 100)}% similarity)
              </span>
            )}
          </div>
          {results.map((result) => (
            <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
