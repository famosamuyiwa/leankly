import { appwriteConfig, db } from "@/appwrite/config";
import { useCallback, useState } from "react";
import { Query } from "react-native-appwrite";

export const useLeanksFeed = (userId?: string, filters?: any) => {
  const [leanks, setLeanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastId, setLastId] = useState<string | null>(null);

  const fetchLeanks = useCallback(async () => {
    if (loading || !hasMore || !userId) return;
    setLoading(true);
    const LIMIT = 15;
    setLoading(true);

    try {
      const reactedRes = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.reactions,
        queries: [Query.equal("userId", userId)],
      });
      const reactedIds = reactedRes.rows.map((r) => r.leankId);

      const queries = [
        Query.limit(LIMIT),
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
        Query.or([
          Query.isNull("participantIds"),
          Query.and([
            Query.notEqual("ownerId", userId),
            Query.notContains("participantIds", userId),
          ]),
        ]),
        Query.orderDesc("$createdAt"),
      ];

      if (reactedIds.length) queries.push(Query.notContains("$id", reactedIds));
      //   if (filters[FilterOptions.LOCATION])
      //     queries.push(Query.equal("location", filters[FilterOptions.LOCATION]));
      if (lastId) queries.push(Query.cursorAfter(lastId));

      const { rows } = await db.listRows({
        databaseId: appwriteConfig.db,
        tableId: appwriteConfig.tables.leanks,
        queries,
      });

      // 🧩 4. Append results
      if (rows.length > 0) {
        setLeanks((prev) => [...prev, ...rows]);
        setLastId(rows[rows.length - 1].$id); // move cursor
        if (rows.length < LIMIT) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("⚠️ Error loading Leanks:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, hasMore, loading]);

  return { leanks, fetchLeanks, loading, hasMore };
};
