import { appwriteConfig, db } from "@/appwrite/config";
import { FilterOptions } from "@/constants/enums";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "react-native-appwrite";

type Leank = any;

const PAGE_SIZE = 10;

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
          "date",
          "time",
          "location",
          "ownerId",
          "owner.avatar",
          "owner.age",
          "owner.name",
          "participantIds",
        ]),
        Query.orderDesc("$createdAt"),
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

        const locationValue = filters[FilterOptions.LOCATION];
        if (locationValue) {
          const arr = Array.isArray(locationValue)
            ? locationValue
            : [locationValue];
          q.push(Query.contains("location", arr));
        }

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

  const refresh = useCallback(async () => {
    if (!userId) return;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const reactedIds = await fetchReactedIds();
      const queries = buildQueries({ limit: PAGE_SIZE, reactedIds });

      const { rows } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries,
      });

      if (myReq !== reqIdRef.current) return;
      setItems(rows);
      setCursor(rows.length ? rows[rows.length - 1].$id : null);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("❌ Error fetching Leanks:", err);
      if (myReq !== reqIdRef.current) return;
      setError(err);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [userId, fetchReactedIds, buildQueries]);

  const loadMore = useCallback(async () => {
    if (!userId || loading || !hasMore) return;
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const reactedIds = await fetchReactedIds();
      const queries = buildQueries({
        limit: PAGE_SIZE,
        cursorAfter: cursor,
        reactedIds,
      });
      const { rows } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries,
      });

      if (myReq !== reqIdRef.current) return;
      setItems((prev) => mergeDedup(prev, rows));
      setCursor(rows.length ? rows[rows.length - 1].$id : cursor);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("❌ loadMore error:", err);
      if (myReq !== reqIdRef.current) return;
      setError(err);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }, [userId, loading, hasMore, cursor, fetchReactedIds, buildQueries]);

  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    reqIdRef.current++;
    if (userId) refresh();
  }, [userId, filterKey]);

  return {
    leanks: items,
    loading,
    hasMore,
    error,
    refresh,
    loadMore,
  };
};
