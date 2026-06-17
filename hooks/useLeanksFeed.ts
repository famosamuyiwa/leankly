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

type LocationFilterValue = {
  nearby?: {
    radiusKm: number;
    userLat?: number;
    userLng?: number;
  } | null;
  includeOnline?: boolean;
};

const EARTH_RADIUS_KM = 6371;

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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
  locationFilter?: LocationFilterValue
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
          item.locationLng
        );
        matchesNearby = distance <= (nearby.radiusKm as number);
      }
    }

    return matchesOnline || matchesNearby;
  });
};

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

export const useLeanksFeed = (userId?: string, filters?: any) => {
  const [items, setItems] = useState<Leank[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const reqIdRef = useRef(0);
  const filterKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);

  const fetchReactedIds = useCallback(async () => {
    if (!userId) return [];
    try {
      const reactedRes = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        queries: [Query.equal("userId", userId), Query.select(["leankId"])],
      });
      return reactedRes.rows.map((r: any) => r.leankId).filter(Boolean);
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
        ])
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

        const locationValue =
          filters[FilterOptions.LOCATION] as LocationFilterValue | undefined;

        const includeOnline = !!locationValue?.includeOnline;
        const nearby = locationValue?.nearby;
        const hasNearby =
          nearby &&
          typeof nearby.radiusKm === "number" &&
          typeof nearby.userLat === "number" &&
          typeof nearby.userLng === "number";

        if (includeOnline && !hasNearby) {
          q.push(Query.equal("location", LocationFilterEnum.ONLINE));
        } else if (!includeOnline && hasNearby) {
          const { minLat, maxLat, minLng, maxLng } = buildBoundingBox(
            nearby.userLat,
            nearby.userLng,
            nearby.radiusKm
          );
          q.push(Query.between("locationLat", minLat, maxLat));
          q.push(Query.between("locationLng", minLng, maxLng));
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
    [filters, userId]
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
      cursorAfter?: string | null;
      reactedIds: string[];
    }) => {
      const locationFilter = filters?.[FilterOptions.LOCATION] as
        | LocationFilterValue
        | undefined;
      const collected: Leank[] = [];
      let nextCursor = cursorAfter ?? null;
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
    [buildQueries, filters]
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
    } catch (err) {
      console.error("❌ Error fetching Leanks:", err);
      if (myReq !== reqIdRef.current) return;
      setError(err);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [userId, fetchReactedIds, fetchFilteredBatch]);

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
    refresh,
    loadMore,
  };
};
