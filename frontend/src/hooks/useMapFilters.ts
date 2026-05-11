import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CafeFilters, DEFAULT_FILTERS } from '../types/filters';
import { filtersToParams, paramsToFilters, FILTER_PARAM_KEYS } from '../lib/filterEncoding';

export function useMapFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilters = paramsToFilters(searchParams);
  // filters: pending state shown in panel (not yet applied to API)
  const [filters, setFiltersState] = useState<CafeFilters>(initialFilters);
  // appliedFilters: drives API calls — only updated on explicit apply or chip clear
  const [appliedFilters, setAppliedFilters] = useState<CafeFilters>(initialFilters);

  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pushURL = useCallback((next: CafeFilters) => {
    clearTimeout(urlDebounceRef.current);
    urlDebounceRef.current = setTimeout(() => {
      const filterParams = filtersToParams(next);
      setSearchParams(prev => {
        const updated = new URLSearchParams(prev);
        FILTER_PARAM_KEYS.forEach(k => updated.delete(k));
        Object.entries(filterParams).forEach(([k, v]) => updated.set(k, v));
        return updated;
      }, { replace: true });
    }, 150);
  }, [setSearchParams]);

  // Update pending panel state only — does not trigger API call
  const setFilter = useCallback(<K extends keyof CafeFilters>(key: K, value: CafeFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset pending panel state to defaults — does not trigger API call
  const resetAll = useCallback(() => {
    setFiltersState({ ...DEFAULT_FILTERS });
  }, []);

  // Apply pending filters to the API — called by the panel's Apply button
  const applyFilters = useCallback((pending: CafeFilters) => {
    setAppliedFilters(pending);
    pushURL(pending);
  }, [pushURL]);

  // Clear a single filter immediately (from chip × button — applies right away)
  const clearOne = useCallback((key: keyof CafeFilters) => {
    setAppliedFilters(prev => {
      type FilterRecord = Record<keyof CafeFilters, CafeFilters[keyof CafeFilters]>;
      const next = { ...prev };
      if (key in DEFAULT_FILTERS) {
        (next as FilterRecord)[key] = (DEFAULT_FILTERS as FilterRecord)[key];
      } else {
        delete (next as FilterRecord)[key];
      }
      setFiltersState(next);
      pushURL(next);
      return next;
    });
  }, [pushURL]);

  // Sync pending state to applied state when panel opens
  const syncPending = useCallback(() => {
    setFiltersState(appliedFilters);
  }, [appliedFilters]);

  return { filters, appliedFilters, setFilter, applyFilters, resetAll, clearOne, syncPending };
}
