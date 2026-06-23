import { FilterOptions } from "@/constants/enums";
import { Leank } from "@/interfaces";
import { apiClient } from "@/lib/api/client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

const PAGE_SIZE = 10;

export const useLeanksFeed = (userId?: string, filters?: any) => {
  const queryClient = useQueryClient();
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const queryKey = useMemo(
    () => ["leanks", "feed", userId, filterKey] as const,
    [filterKey, userId],
  );
  const queryInput = useMemo(() => {
    const location = filters?.[FilterOptions.LOCATION];
    const nearby = location?.nearby;
    const age = filters?.[FilterOptions.AGE];
    return {
      limit: PAGE_SIZE,
      today: filters?.[FilterOptions.TODAY] || undefined,
      thisWeek: filters?.[FilterOptions.THIS_WEEK] || undefined,
      categories: filters?.[FilterOptions.CATEGORY],
      ageMin: age?.min,
      ageMax: age?.max,
      includeOnline: location?.includeOnline || undefined,
      nearbyLat: nearby?.userLat,
      nearbyLng: nearby?.userLng,
      radiusKm: nearby?.radiusKm,
    };
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(userId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getFeed({ ...queryInput, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const leanks = useMemo<Leank[]>(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flatMap((page) => page.items) || []).filter(
      (item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      },
    );
  }, [query.data]);

  const loadMore = useCallback(async () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      await query.fetchNextPage();
    }
  }, [query]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.resetQueries(
      { queryKey, exact: true },
      { throwOnError: true },
    );
  }, [queryClient, queryKey, userId]);

  return {
    leanks,
    loading: query.isLoading || query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    error: query.error,
    loadedFilterKey: query.isFetched ? filterKey : null,
    refresh,
    loadMore,
  };
};
