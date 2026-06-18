import { appwriteConfig, db } from "@/appwrite/config";
import {
  FilterOptions,
  LeankStatus,
  LocationFilterEnum,
} from "@/constants/enums";
import { Leank } from "@/interfaces";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "react-native-appwrite";

const PAGE_SIZE = 10;
const MAX_FILTER_PAGES = 4;
const REACTIONS_PAGE_SIZE = 100;

type FeedCursor =
  | string
  | {
      online: string | null;
      nearby: string | null;
    }
  | null;

type LocationQueryMode = "auto" | "online" | "nearby";

type LocationFilterValue = {
  nearby?: {
    radiusKm: number;
    userLat?: number;
    userLng?: number;
  } | null;
  includeOnline?: boolean;
};

type FilteredBatch = {
  rows: Leank[];
  cursor: FeedCursor;
  hasMore: boolean;
};

const EARTH_RADIUS_KM = 6371;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const applyLocationFilter = (
  list: Leank[],
  locationFilter?: LocationFilterValue,
) => {
  const includeOnline = !!locationFilter?.includeOnline;
  const nearby = locationFilter?.nearby;

  const hasNearby =
    !!nearby &&
    typeof nearby.radiusKm === "number" &&
    typeof nearby.userLat === "number" &&
    typeof nearby.userLng === "number";

  if (!includeOnline && !hasNearby) return list;

  return list.filter((item) => {
    const matchesOnline =
      includeOnline && item.location === LocationFilterEnum.ONLINE;

    let matchesNearby = false;
    if (hasNearby) {
      if (
        typeof item.locationLat === "number" &&
        typeof item.locationLng === "number"
      ) {
        const distance = haversineDistance(
          nearby.userLat as number,
          nearby.userLng as number,
          item.locationLat,
          item.locationLng,
        );
        matchesNearby = distance <= (nearby.radiusKm as number);
      }
    }

    return matchesOnline || matchesNearby;
  });
};

const hasValidNearby = (
  nearby?: LocationFilterValue["nearby"],
): nearby is { radiusKm: number; userLat: number; userLng: number } =>
  !!nearby &&
  typeof nearby.radiusKm === "number" &&
  typeof nearby.userLat === "number" &&
  typeof nearby.userLng === "number";

const buildBoundingBox = (lat: number, lng: number, radiusKm: number) => {
  const latDelta = radiusKm / 111;
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const safeCosLat = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat;
  const lngDelta = radiusKm / (111 * safeCosLat);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

const sortByCreatedAtDesc = (list: Leank[]) =>
  [...list].sort((a, b) => {
    const aTime = new Date((a as any).$createdAt ?? 0).getTime();
    const bTime = new Date((b as any).$createdAt ?? 0).getTime();
    return bTime - aTime;
  });

const addDeduped = (target: Map<string, Leank>, rows: Leank[]) => {
  rows.forEach((row) => {
    if (row.$id) target.set(row.$id, row);
  });
};

export const useLeanksFeed = (userId?: string, filters?: any) => {
  const [items, setItems] = useState<Leank[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<FeedCursor>(null);
  const [error, setError] = useState<unknown>(null);
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);

  const reqIdRef = useRef(0);
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const fetchReactedIds = useCallback(async () => {
    if (!userId) return [];
    try {
      const reactedIds: string[] = [];
      let cursorAfter: string | null = null;

      while (true) {
        const queries = [
          Query.equal("userId", userId),
          Query.select(["leankId"]),
          Query.limit(REACTIONS_PAGE_SIZE),
        ];

        if (cursorAfter) queries.push(Query.cursorAfter(cursorAfter));

        const reactedRes = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.reactions,
          queries,
        });

        reactedIds.push(
          ...reactedRes.rows.map((r: any) => r.leankId).filter(Boolean),
        );

        if (reactedRes.rows.length < REACTIONS_PAGE_SIZE) break;
        cursorAfter = reactedRes.rows[reactedRes.rows.length - 1].$id;
      }

      return reactedIds;
    } catch (err) {
      console.error("⚠️ Failed to fetch reactions:", err);
      return [];
    }
  }, [userId]);

  const buildQueries = useCallback(
    (opts: {
      limit: number;
      cursorAfter?: string | null;
      reactedIds?: string[];
      locationMode?: LocationQueryMode;
    }) => {
      const q: any[] = [
        Query.limit(opts.limit),
        Query.select([
          "cover",
          "title",
          "description",
          "category",
          "date",
          "time",
          "location",
          "ownerId",
          "owner.avatar",
          "owner.age",
          "owner.name",
          "owner.pushToken",
          "participantIds",
          "locationLat",
          "locationLng",
          "$createdAt",
        ]),
        Query.orderDesc("$createdAt"),
        Query.equal("status", LeankStatus.ACTIVE),
      ];

      // Exclude reacted
      if (opts.reactedIds?.length)
        q.push(Query.notContains("$id", opts.reactedIds));

      // Exclude items by current user or ones the user participates in
      q.push(Query.notEqual("ownerId", userId ?? ""));
      q.push(
        Query.or([
          Query.notContains("participantIds", userId ?? ""),
          Query.isNull("participantIds"),
        ]),
      );

      // Filters
      if (filters) {
        if (filters[FilterOptions.TODAY]) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);

          q.push(Query.between("date", start.toISOString(), end.toISOString()));
        }

        if (filters[FilterOptions.THIS_WEEK]) {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);

          q.push(Query.between("date", start.toISOString(), end.toISOString()));
        }

        const categories = filters[FilterOptions.CATEGORY] as
          | string[]
          | undefined;
        if (categories?.length) {
          q.push(Query.equal("category", categories));
        }

        const locationValue = filters[FilterOptions.LOCATION] as
          | LocationFilterValue
          | undefined;

        const includeOnline = !!locationValue?.includeOnline;
        const nearby = locationValue?.nearby;
        const hasNearby = hasValidNearby(nearby);
        const locationMode = opts.locationMode ?? "auto";

        if (locationMode === "online") {
          q.push(Query.equal("location", LocationFilterEnum.ONLINE));
        } else if (locationMode === "nearby" && hasNearby) {
          const { minLat, maxLat, minLng, maxLng } = buildBoundingBox(
            nearby.userLat,
            nearby.userLng,
            nearby.radiusKm,
          );
          q.push(Query.between("locationLat", minLat, maxLat));
          q.push(Query.between("locationLng", minLng, maxLng));
        } else if (locationMode === "auto") {
          if (includeOnline && !hasNearby) {
            q.push(Query.equal("location", LocationFilterEnum.ONLINE));
          } else if (!includeOnline && hasNearby) {
            const { minLat, maxLat, minLng, maxLng } = buildBoundingBox(
              nearby.userLat,
              nearby.userLng,
              nearby.radiusKm,
            );
            q.push(Query.between("locationLat", minLat, maxLat));
            q.push(Query.between("locationLng", minLng, maxLng));
          }
        }
        // If both online + nearby are selected, skip server-side location filtering
        // so we can merge both sets client-side.

        const ageRange = filters[FilterOptions.AGE];
        if (ageRange) {
          q.push(Query.greaterThanEqual("owner.age", ageRange.min));
          q.push(Query.lessThanEqual("owner.age", ageRange.max));
        }
      }

      if (opts.cursorAfter) q.push(Query.cursorAfter(opts.cursorAfter));
      return q;
    },
    [filters, userId],
  );

  const mergeDedup = (prev: Leank[], next: Leank[]) => {
    const seen = new Set(prev.map((x) => x.$id));
    return [...prev, ...next.filter((x) => !seen.has(x.$id))];
  };

  const fetchFilteredBatch = useCallback(
    async ({
      cursorAfter,
      reactedIds,
    }: {
      cursorAfter?: FeedCursor;
      reactedIds: string[];
    }): Promise<FilteredBatch> => {
      const locationFilter = filters?.[FilterOptions.LOCATION] as
        | LocationFilterValue
        | undefined;
      const includeOnline = !!locationFilter?.includeOnline;
      const nearby = locationFilter?.nearby;
      const hasNearby = hasValidNearby(nearby);

      if (includeOnline && hasNearby) {
        const combinedCursor =
          cursorAfter && typeof cursorAfter === "object"
            ? cursorAfter
            : { online: null, nearby: null };
        const collected = new Map<string, Leank>();
        let onlineCursor = combinedCursor.online;
        let nearbyCursor = combinedCursor.nearby;
        let onlineHasMore = true;
        let nearbyHasMore = true;
        let onlinePagesFetched = 0;
        let nearbyPagesFetched = 0;

        while (
          collected.size < PAGE_SIZE &&
          ((onlineHasMore && onlinePagesFetched < MAX_FILTER_PAGES) ||
            (nearbyHasMore && nearbyPagesFetched < MAX_FILTER_PAGES))
        ) {
          if (onlineHasMore && onlinePagesFetched < MAX_FILTER_PAGES) {
            const { rows } = await db.listRows({
              databaseId: appwriteConfig.db,
              tableId: appwriteConfig.tables.leanks,
              queries: buildQueries({
                limit: PAGE_SIZE,
                cursorAfter: onlineCursor,
                reactedIds,
                locationMode: "online",
              }),
            });

            onlinePagesFetched += 1;
            if (rows.length === 0) {
              onlineHasMore = false;
            } else {
              addDeduped(collected, rows as unknown as Leank[]);
              onlineCursor = rows[rows.length - 1].$id;
              onlineHasMore = rows.length === PAGE_SIZE;
            }
          }

          if (nearbyHasMore && nearbyPagesFetched < MAX_FILTER_PAGES) {
            const { rows } = await db.listRows({
              databaseId: appwriteConfig.db,
              tableId: appwriteConfig.tables.leanks,
              queries: buildQueries({
                limit: PAGE_SIZE,
                cursorAfter: nearbyCursor,
                reactedIds,
                locationMode: "nearby",
              }),
            });

            nearbyPagesFetched += 1;
            if (rows.length === 0) {
              nearbyHasMore = false;
            } else {
              addDeduped(
                collected,
                applyLocationFilter(rows as unknown as Leank[], {
                  includeOnline: false,
                  nearby,
                }),
              );
              nearbyCursor = rows[rows.length - 1].$id;
              nearbyHasMore = rows.length === PAGE_SIZE;
            }
          }
        }

        return {
          rows: sortByCreatedAtDesc(Array.from(collected.values())),
          cursor: {
            online: onlineCursor,
            nearby: nearbyCursor,
          },
          hasMore: onlineHasMore || nearbyHasMore,
        };
      }

      const collected: Leank[] = [];
      let nextCursor = typeof cursorAfter === "string" ? cursorAfter : null;
      let lastRawCount = 0;
      let pagesFetched = 0;

      while (collected.length < PAGE_SIZE && pagesFetched < MAX_FILTER_PAGES) {
        const queries = buildQueries({
          limit: PAGE_SIZE,
          cursorAfter: nextCursor,
          reactedIds,
        });

        const { rows } = await db.listRows({
          databaseId: appwriteConfig.db,
          tableId: appwriteConfig.tables.leanks,
          queries,
        });

        lastRawCount = rows.length;
        if (rows.length === 0) break;

        const rawRows = rows as unknown as Leank[];
        collected.push(...applyLocationFilter(rawRows, locationFilter));
        nextCursor = rows[rows.length - 1].$id;
        pagesFetched += 1;

        if (rows.length < PAGE_SIZE) break;
      }

      return {
        rows: collected,
        cursor: nextCursor,
        hasMore: lastRawCount === PAGE_SIZE,
      };
    },
    [buildQueries, filters],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const reactedIds = await fetchReactedIds();
      const batch = await fetchFilteredBatch({ reactedIds });

      if (myReq !== reqIdRef.current) return;
      setItems(batch.rows);
      setCursor(batch.cursor);
      setHasMore(batch.hasMore);
      setLoadedFilterKey(filterKey);
    } catch (err) {
      console.error("❌ Error fetching Leanks:", err);
      if (myReq !== reqIdRef.current) return;
      setError(err);
      setLoadedFilterKey(filterKey);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [userId, filterKey, fetchReactedIds, fetchFilteredBatch]);

  const loadMore = useCallback(async () => {
    if (!userId || loading || !hasMore) return;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const reactedIds = await fetchReactedIds();
      const batch = await fetchFilteredBatch({
        cursorAfter: cursor,
        reactedIds,
      });

      if (myReq !== reqIdRef.current) return;
      setItems((prev) => mergeDedup(prev, batch.rows));
      setCursor(batch.cursor ?? cursor);
      setHasMore(batch.hasMore);
    } catch (err) {
      console.error("❌ loadMore error:", err);
      if (myReq !== reqIdRef.current) return;
      setError(err);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [userId, loading, hasMore, cursor, fetchReactedIds, fetchFilteredBatch]);

  useEffect(() => {
    reqIdRef.current++;
    if (!userId) return;
    const timeout = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timeout);
  }, [userId, filterKey, refresh]);

  return {
    leanks: items,
    loading,
    hasMore,
    error,
    loadedFilterKey,
    refresh,
    loadMore,
  };
};
