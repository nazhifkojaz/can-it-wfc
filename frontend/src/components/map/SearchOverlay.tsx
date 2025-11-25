import { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Star, Navigation, Map } from 'lucide-react';
import api from '../../api/client';
import styles from './SearchOverlay.module.css';

interface SearchResult {
  id?: string;
  google_place_id?: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  distance?: string;
  rating?: number;
  average_wfc_rating?: number;
  source: 'database' | 'google';
  is_registered: boolean;
  result_type?: 'cafe' | 'location';
}

interface SearchResponse {
  db_results: SearchResult[];
  google_results: SearchResult[];
  location_results: SearchResult[];
  query: string;
  used_google_api: boolean;
  total_results: number;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
  userLocation?: { lat: number; lon: number };
}

export function SearchOverlay({
  isOpen,
  onClose,
  onSelectResult,
  userLocation
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (query.length < 3) {
      setResults(null);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout (500ms debounce)
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params: any = { q: query };
        if (userLocation) {
          params.lat = userLocation.lat;
          params.lon = userLocation.lon;
        }

        const response = await api.get<SearchResponse>('/cafes/search/', { params });
        setResults(response.data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Search error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, userLocation]);

  const handleSelectResult = (result: SearchResult) => {
    onSelectResult(result);
    onClose();
    setQuery('');
    setResults(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Search Bar */}
      <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close search"
        >
          <X size={24} />
        </button>

        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cafes or locations..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Results */}
      <div className={styles.content}>
        {query.length < 3 && (
          <div className={styles.emptyState}>
            <Search size={48} className={styles.emptyIcon} />
            <p>Type at least 3 characters to search</p>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Searching...</p>
          </div>
        )}

        {!isLoading && results && results.total_results === 0 && (
          <div className={styles.emptyState}>
            <MapPin size={48} className={styles.emptyIcon} />
            <p>No cafes found for "{results.query}"</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Try a different search term</p>
          </div>
        )}

        {!isLoading && results && results.total_results > 0 && (
          <div>
            {/* Database Results */}
            {results.db_results.length > 0 && (
              <div className={styles.resultsContainer}>
                <div className={styles.sectionHeader}>
                  Registered Cafes ({results.db_results.length})
                </div>
                {results.db_results.map((result, index) => (
                  <SearchResultItem
                    key={result.id || `db-${index}`}
                    result={result}
                    onSelect={handleSelectResult}
                  />
                ))}
              </div>
            )}

            {/* Google Places Cafe Results */}
            {results.google_results.length > 0 && (
              <div className={styles.resultsContainer}>
                <div className={`${styles.sectionHeader} ${styles.sectionHeaderBlue}`}>
                  <span>New Cafes from Google ({results.google_results.length})</span>
                  {results.used_google_api && (
                    <span className={styles.liveIndicator}>Live results</span>
                  )}
                </div>
                {results.google_results.map((result, index) => (
                  <SearchResultItem
                    key={result.google_place_id || `google-${index}`}
                    result={result}
                    onSelect={handleSelectResult}
                  />
                ))}
              </div>
            )}

            {/* Location Results (for navigation) */}
            {results.location_results && results.location_results.length > 0 && (
              <div className={styles.resultsContainer}>
                <div className={`${styles.sectionHeader} ${styles.sectionHeaderGreen}`}>
                  <span>Locations ({results.location_results.length})</span>
                  {results.used_google_api && (
                    <span className={styles.liveIndicator}>Live results</span>
                  )}
                </div>
                {results.location_results.map((result, index) => (
                  <SearchResultItem
                    key={result.google_place_id || `location-${index}`}
                    result={result}
                    onSelect={handleSelectResult}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
}

function SearchResultItem({
  result,
  onSelect
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
}) {
  const isLocation = result.result_type === 'location';
  const iconColor = isLocation
    ? styles.resultIconLocation
    : (result.is_registered ? styles.resultIconRegistered : styles.resultIconNew);

  const Icon = isLocation ? Map : (result.is_registered ? Star : MapPin);

  return (
    <button
      onClick={() => onSelect(result)}
      className={styles.resultItem}
    >
      {/* Icon */}
      <div className={`${styles.resultIcon} ${iconColor}`}>
        <Icon size={20} />
      </div>

      {/* Content */}
      <div className={styles.resultContent}>
        <div className={styles.resultHeader}>
          <h3 className={styles.resultName}>{result.name}</h3>
          {!result.is_registered && !isLocation && (
            <span className={styles.resultBadge}>NEW</span>
          )}
        </div>

        <p className={styles.resultAddress}>{result.address}</p>

        <div className={styles.resultMeta}>
          {result.distance && (
            <span className={styles.resultMetaItem}>
              <Navigation size={12} />
              {result.distance}
            </span>
          )}

          {result.is_registered && result.average_wfc_rating && (
            <span className={styles.resultMetaItem}>
              <Star size={12} className={styles.starIcon} />
              {result.average_wfc_rating.toFixed(1)}
            </span>
          )}

          {!result.is_registered && result.rating && (
            <span className={styles.resultMetaItem}>
              <Star size={12} className={styles.starIcon} />
              {result.rating.toFixed(1)} (Google)
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
