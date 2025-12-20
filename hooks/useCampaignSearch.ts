import { CampaignSearchParams, CampaignSearchResult, campaignSearchService } from '@/services/campaignSearchService';
import { locationService } from '@/services/locationService';
import { useCallback, useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function useCampaignSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Omit<CampaignSearchParams, 'searchQuery' | 'limit' | 'offset'>>({
    sortBy: 'relevance'
  });
  
  const [campaigns, setCampaigns] = useState<CampaignSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const fetchCampaigns = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Get current location if needed or available
      let currentLocation = filters.location;
      if (!currentLocation && filters.radiusMiles) {
        // If radius filtering is on but no location set, try to get current location
        const loc = await locationService.getCurrentLocation();
        if (loc) {
          currentLocation = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          };
        }
      }

      const currentPage = isRefresh ? 0 : page;
      
      const results = await campaignSearchService.searchCampaigns({
        searchQuery: debouncedSearchQuery,
        ...filters,
        location: currentLocation,
        limit: PAGE_SIZE,
        offset: currentPage * PAGE_SIZE
      });

      if (isRefresh) {
        setCampaigns(results);
        setPage(1);
      } else {
        setCampaigns(prev => [...prev, ...results]);
        setPage(currentPage + 1);
      }

      setHasMore(results.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, filters, page]);

  // Initial fetch and when filters/search changes
  useEffect(() => {
    setPage(0);
    fetchCampaigns(true);
  }, [debouncedSearchQuery, filters]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchCampaigns(false);
    }
  }, [loading, hasMore, fetchCampaigns]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchCampaigns(true);
  }, [fetchCampaigns]);

  const toggleSave = useCallback(async (campaignId: string, currentSavedState: boolean) => {
    // Optimistic update
    setCampaigns(prev => prev.map(c => 
      c.id === campaignId ? { ...c, is_saved: !currentSavedState } : c
    ));

    try {
      await campaignSearchService.toggleSaveCampaign(campaignId, !currentSavedState);
    } catch (err) {
      // Revert on error
      console.error('Toggle save error:', err);
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId ? { ...c, is_saved: currentSavedState } : c
      ));
    }
  }, []);

  return {
    campaigns,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    toggleSave
  };
}

