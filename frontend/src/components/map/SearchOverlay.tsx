import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, MapPin, Star, Navigation, Map } from 'lucide-react';
import api from '../../api/client';
import { formatDistance } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import { trackSearchPerformed, trackSearchResultSelected } from '../../lib/analytics';
import { SearchResult, SearchResponse } from '../../types';
import styles from './SearchOverlay.module.css';

type SearchLocation = { lat: number; lon: number };

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
  userLocation?: { lat: number; lon: number };
  searchCenter?: { lat: number; lng: number };
}

export function SearchOverlay({
  isOpen,
  onClose,
  onSelectResult,
  userLocation,
  searchCenter,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchLocation, setSearchLocation] = useState<SearchLocation | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [includeGoogle, setIncludeGoogle] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const resetSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setErrorMessage(null);
    setActiveIndex(-1);
  }, []);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Capture search location on open
  useEffect(() => {
    if (!isOpen) {
      setSearchLocation(null);
      resetSearch();
      return;
    }

    setSearchLocation(prev => {
      if (prev) return prev;
      const center = searchCenter ? {
        lat: searchCenter.lat,
        lon: searchCenter.lng,
      } : null;
      if (center) {
        return center;
      }
      if (userLocation) {
        return userLocation;
      }
      return null;
    });
  }, [isOpen, userLocation, searchCenter, resetSearch]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Debounced search with AbortController to prevent memory leaks
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (query.length < 3) {
      setResults(null);
      setErrorMessage(null);
      return;
    }

    // Create AbortController for this search
    const controller = new AbortController();

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout (500ms debounce)
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const locationForSearch = searchLocation || undefined;

        if (!locationForSearch) {
          setResults(null);
          setErrorMessage('Search needs a map location. Enable location access or move the map and try again.');
          return;
        }

        const params: Record<string, string | number | boolean> = {
          q: query,
          lat: locationForSearch.lat,
          lon: locationForSearch.lon,
          include_unregistered: includeGoogle,
        };

        const response = await api.get<SearchResponse>('/cafes/search/', {
          params,
          signal: controller.signal
        });
        setResults(response.data);

        trackSearchPerformed({
          queryLength: query.length,
          resultCount: response.data.results.length,
          registeredCount: response.data.results.filter(
            r => r.result_type === 'cafe' && r.is_registered
          ).length,
          providerCount: response.data.results.filter(
            r => r.result_type === 'cafe' && !r.is_registered
          ).length,
          locationCount: response.data.results.filter(
            r => r.result_type === 'location'
          ).length,
        });
      } catch (error) {
        // Ignore abort errors (expected when user types quickly or unmounts)
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
          return;
        }
        logger.error('Search error', error as Error, 'SearchOverlay');
        const apiMessage = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        setResults(null);
        setErrorMessage(apiMessage || 'Search failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    // Cleanup: abort request and clear timeout
    return () => {
      controller.abort();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen, query, searchLocation, includeGoogle]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelectResult = useCallback((result: SearchResult) => {
    trackSearchResultSelected({
      source: result.source,
      resultType: result.result_type,
      isRegistered: result.is_registered,
    });
    onSelectResult(result);
    handleClose();
    resetSearch();
  }, [onSelectResult, handleClose, resetSearch]);

  // Keep one display order for rendering, keyboard navigation, and selection.
  const groupedResults = useMemo(() => {
    if (!results || results.total_results === 0) return null;
    const places = results.results.filter(r => r.result_type !== 'location');
    const locations = results.results.filter(r => r.result_type === 'location');
    return {
      places,
      locations,
      displayResults: [...places, ...locations],
    };
  }, [results]);

  const displayResults = groupedResults?.displayResults ?? [];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!results || results.total_results === 0) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, displayResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < displayResults.length) {
          handleSelectResult(displayResults[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [results, displayResults, activeIndex, handleSelectResult, handleClose]);

  // Scroll active result into view
  useEffect(() => {
    if (activeIndex < 0 || !overlayRef.current) return;
    const items = overlayRef.current.querySelectorAll('[data-result-index]');
    if (items[activeIndex] && typeof (items[activeIndex] as HTMLElement).scrollIntoView === 'function') {
      (items[activeIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Search cafes and locations"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Search Bar */}
      <div className={styles.overlay} ref={overlayRef}>
        <div className={styles.searchPanel}>
          {/* Header */}
          <div className={styles.header}>
            <button
              onClick={handleClose}
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                placeholder="Search cafes or locations..."
                className={styles.searchInput}
                aria-label="Search cafes or locations"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={styles.content}>
          {/* Toggle: include Google Maps results */}
          <label className={styles.googleToggle}>
            <input
              type="checkbox"
              checked={includeGoogle}
              onChange={(e) => setIncludeGoogle(e.target.checked)}
            />
            <span>Include Google Maps results</span>
          </label>

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

          {!isLoading && errorMessage && (
            <div className={styles.emptyState}>
              <MapPin size={48} className={styles.emptyIcon} />
              <p>{errorMessage}</p>
            </div>
          )}

          {!isLoading && !errorMessage && results && results.total_results === 0 && (
            <div className={styles.emptyState}>
              <MapPin size={48} className={styles.emptyIcon} />
              <p>No cafes found for "{results.query}"</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>Try a different search term</p>
            </div>
          )}

          {!isLoading && !errorMessage && groupedResults && results && results.total_results > 0 && (
            <div className={styles.resultsContainer}>
              {groupedResults.places.map((result, displayIndex) => {
                return (
                  <SearchResultItem
                    key={result.google_place_id || `result-${displayIndex}`}
                    result={result}
                    onSelect={handleSelectResult}
                    isActive={displayIndex === activeIndex}
                    index={displayIndex}
                    userLocation={userLocation}
                  />
                );
              })}

              {groupedResults.locations.length > 0 && (
                <div className={styles.resultGroup}>
                  <div className={`${styles.groupHeader} ${styles.groupHeaderLocation}`}>
                    Locations ({groupedResults.locations.length})
                  </div>
                  {groupedResults.locations.map((result, locationIndex) => {
                    const displayIndex = groupedResults.places.length + locationIndex;
                    return (
                      <SearchResultItem
                        key={result.google_place_id || `location-${displayIndex}`}
                        result={result}
                        onSelect={handleSelectResult}
                        isActive={displayIndex === activeIndex}
                        index={displayIndex}
                        userLocation={userLocation}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({
  result,
  onSelect,
  isActive = false,
  index = -1,
  userLocation,
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  isActive?: boolean;
  index?: number;
  userLocation?: { lat: number; lon: number };
}) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const isLocation = result.result_type === 'location';
  const isPlace = !isLocation;
  const iconColor = isLocation
    ? styles.resultIconLocation
    : (result.is_registered ? styles.resultIconRegistered : styles.resultIconNew);

  const Icon = isLocation ? Map : (result.is_registered ? Star : MapPin);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.focus();
    }
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      onClick={() => onSelect(result)}
      className={`${styles.resultItem} ${isActive ? styles.resultItemActive : ''}`}
      data-result-index={index}
      tabIndex={-1}
      aria-selected={isActive}
      role="option"
    >
      {/* Icon */}
      <div className={`${styles.resultIcon} ${iconColor}`}>
        <Icon size={20} />
      </div>

      {/* Content */}
      <div className={styles.resultContent}>
        <div className={styles.resultHeader}>
          <h3 className={styles.resultName}>{result.name}</h3>
          {isPlace && result.place_category_label && (
            <span className={`${styles.resultBadge} ${styles.resultBadgeCategory}`}>
              {result.place_category_label}
            </span>
          )}
          {!result.is_registered && isPlace && (
            <span className={styles.resultBadge}>NEW</span>
          )}
          {result.is_registered && isPlace && (
            <span className={`${styles.resultBadge} ${styles.resultBadgeRegistered}`}>
              REGISTERED
            </span>
          )}
          {result.match_score != null && (
            <span className={`${styles.resultBadge} ${styles.resultBadgeMatch}`}>
              {Math.round(result.match_score * 100)}% match
            </span>
          )}
        </div>

        <p className={styles.resultAddress}>{result.address}</p>

        <div className={styles.resultMeta}>
          {userLocation && result.distance !== undefined && (
            <span className={styles.resultMetaItem}>
              <Navigation size={12} />
              {formatDistance(result.distance)}
            </span>
          )}

          {result.is_registered && result.average_wfc_rating && (
            <span className={styles.resultMetaItem}>
              <Star size={12} className={styles.starIcon} />
              {result.average_wfc_rating.toFixed(1)} WFC
            </span>
          )}

          {result.is_registered && result.total_reviews !== undefined && (
            <span className={styles.resultMetaItem}>
              {result.total_reviews} review{result.total_reviews !== 1 ? 's' : ''}
            </span>
          )}

          {!result.is_registered && result.rating && (
            <span className={styles.resultMetaItem}>
              <Star size={12} className={styles.starIcon} />
              {result.rating.toFixed(1)} Google
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
