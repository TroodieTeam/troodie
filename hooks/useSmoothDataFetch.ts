import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

interface UseSmoothDataFetchOptions {
  // Minimum time to show skeleton/loading state to prevent flashing
  minLoadingTime?: number;
  // Whether to show loading state on refetch
  showLoadingOnRefetch?: boolean;
  // Whether to fetch on focus
  fetchOnFocus?: boolean;
  // Cache duration in milliseconds
  cacheDuration?: number;
}

interface UseSmoothDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  isInitialLoad: boolean;
  lastFetchTime: number | null;
  refresh: () => Promise<void>;
  silentRefresh: () => Promise<void>;
}

export function useSmoothDataFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: UseSmoothDataFetchOptions = {}
): UseSmoothDataFetchResult<T> {
  // Ensure dependencies is always an array
  const deps = dependencies || [];
  const {
    minLoadingTime = 300,
    showLoadingOnRefetch = false,
    fetchOnFocus = true,
    cacheDuration = 60000 // 1 minute default cache
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const fetchData = useCallback(async (isRefresh = false, isSilent = false) => {
    // Check cache validity
    if (!isRefresh && lastFetchTime && cacheDuration > 0) {
      const cacheAge = Date.now() - lastFetchTime;
      if (cacheAge < cacheDuration && data !== null) {
        return; // Use cached data
      }
    }

    try {
      if (!isSilent) {
        if (isRefresh) {
          setRefreshing(true);
        } else if (showLoadingOnRefetch || isInitialLoad) {
          setLoading(true);
        }
      }

      const startTime = Date.now();
      const result = await fetchFn();
      const elapsed = Date.now() - startTime;

      // Ensure minimum loading time for smooth UX
      const remainingTime = minLoadingTime - elapsed;
      if (remainingTime > 0 && !isSilent && (isInitialLoad || (!isRefresh && showLoadingOnRefetch))) {
        await new Promise(resolve => {
          loadingTimeoutRef.current = setTimeout(resolve, remainingTime);
        });
      }

      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastFetchTime(Date.now());
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        console.error('Data fetch error:', err);
      }
    } finally {
      if (isMountedRef.current && !isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchFn, isInitialLoad, showLoadingOnRefetch, minLoadingTime, lastFetchTime, cacheDuration, data]);

  // Initial fetch
  useEffect(() => {
    if (deps.length === 0 || deps.every(dep => dep !== undefined)) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      if (fetchOnFocus && !isInitialLoad) {
        // Check if cache is stale
        if (lastFetchTime && cacheDuration > 0) {
          const cacheAge = Date.now() - lastFetchTime;
          if (cacheAge > cacheDuration) {
            fetchData(false, true); // Silent refresh if cache is stale
          }
        }
      }
    }, [fetchOnFocus, isInitialLoad, lastFetchTime, cacheDuration, fetchData])
  );

  const refresh = useCallback(async () => {
    await fetchData(true, false);
  }, [fetchData]);

  const silentRefresh = useCallback(async () => {
    await fetchData(false, true);
  }, [fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    isInitialLoad,
    lastFetchTime,
    refresh,
    silentRefresh
  };
}

