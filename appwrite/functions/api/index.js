const sdk = require("node-appwrite");

const TABLES = {
  leanks: process.env.APPWRITE_TABLE_LEANKS || "leanks",
  messages: process.env.APPWRITE_TABLE_MESSAGES || "messages",
  userChatMeta: process.env.APPWRITE_TABLE_USER_CHAT_META || "userchatmeta",
  user: process.env.APPWRITE_TABLE_USER || "user",
  participants: process.env.APPWRITE_TABLE_PARTICIPANTS || "participants",
  reactions: process.env.APPWRITE_TABLE_REACTIONS || "reactions",
  blocks: process.env.APPWRITE_TABLE_BLOCKS || "blocks",
};

const LEANK_STATUS = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const REQUEST_STATUS = {
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  PENDING: "PENDING",
};

const CHAT_SELECT = [
  "cover",
  "title",
  "description",
  "date",
  "time",
  "location",
  "locationLat",
  "locationLng",
  "lastMessage.senderName",
  "lastMessage.content",
  "lastMessage.senderId",
  "lastMessage.senderPhoto",
  "lastMessage.leankId",
  "lastMessage.$id",
  "lastMessage.$createdAt",
  "ownerId",
  "owner.$id",
  "owner.name",
  "owner.avatar",
  "participantIds",
  "status",
];

module.exports = async ({ req, res, log, error }) => {
  try {
    const runtime = createRuntime(req);
    const result = await route(runtime);
    return json(res, result);
  } catch (err) {
    error(err?.stack || err?.message || String(err));
    return json(
      res,
      {
        ok: false,
        error: {
          code: err.code || "API_ERROR",
          message: err.message || "Request failed",
          status: err.status || 500,
        },
      },
      err.status || 500
    );
  }
};

function createRuntime(req) {
  const endpoint = requiredEnv("APPWRITE_ENDPOINT");
  const projectId = requiredEnv("APPWRITE_PROJECT_ID");
  const databaseId = requiredEnv("APPWRITE_DATABASE_ID");
  const apiKey = requiredEnv("APPWRITE_API_KEY");
  const jwt = getBearerToken(req);

  if (!jwt) {
    throw httpError(401, "UNAUTHORIZED", "Missing Appwrite JWT");
  }

  const userClient = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setJWT(jwt);

  const adminClient = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    req,
    databaseId,
    account: new sdk.Account(userClient),
    db: new sdk.TablesDB(adminClient),
    functions: new sdk.Functions(adminClient),
    path: normalizePath(req),
    method: (req.method || "GET").toUpperCase(),
    query: readQuery(req),
    body: readBody(req),
  };
}

async function route(runtime) {
  // JWT verification is the trust boundary; server code ignores client-supplied user ids.
  const actor = await runtime.account.get();
  const parts = runtime.path.split("/").filter(Boolean);

  if (runtime.method === "GET" && runtime.path === "/v1/chats") {
    return ok(await getChats(runtime, actor));
  }

  if (runtime.method === "GET" && runtime.path === "/v1/me/unread-count") {
    return ok(await getUnreadCountResponse(runtime, actor.$id));
  }

  if (runtime.method === "GET" && runtime.path === "/v1/requests") {
    return ok({ requests: await listRequests(runtime, actor.$id) });
  }

  if (
    runtime.method === "POST" &&
    parts[0] === "v1" &&
    parts[1] === "requests" &&
    parts[3] === "accept"
  ) {
    await acceptRequest(runtime, actor, parts[2]);
    return ok({ requests: await listRequests(runtime, actor.$id) });
  }

  if (
    runtime.method === "POST" &&
    parts[0] === "v1" &&
    parts[1] === "requests" &&
    parts[3] === "decline"
  ) {
    await declineRequest(runtime, actor, parts[2]);
    return ok({ requests: await listRequests(runtime, actor.$id) });
  }

  if (parts[0] === "v1" && parts[1] === "chats" && parts[2]) {
    const chatId = parts[2];

    if (runtime.method === "GET" && parts.length === 3) {
      return ok({ chat: await getAuthorizedChat(runtime, actor.$id, chatId) });
    }

    if (runtime.method === "GET" && parts[3] === "messages") {
      return ok(await getMessages(runtime, actor.$id, chatId));
    }

    if (runtime.method === "GET" && parts[3] === "participants") {
      await getAuthorizedChat(runtime, actor.$id, chatId);
      return ok({ participants: await listParticipants(runtime, chatId) });
    }

    if (runtime.method === "POST" && parts[3] === "messages") {
      return ok(await sendMessage(runtime, actor, chatId));
    }

    if (runtime.method === "PATCH" && parts[3] === "read") {
      await markChatRead(runtime, actor.$id, chatId);
      return ok(await getUnreadCountResponse(runtime, actor.$id));
    }

    if (runtime.method === "POST" && parts[3] === "leave") {
      await leaveChat(runtime, actor, chatId);
      return ok({ chatId });
    }

    if (runtime.method === "POST" && parts[3] === "close") {
      await closeChat(runtime, actor.$id, chatId);
      return ok({ chatId });
    }

    if (
      runtime.method === "DELETE" &&
      parts[3] === "participants" &&
      parts[4]
    ) {
      await removeParticipant(runtime, actor, chatId, parts[4]);
      return ok({ chatId, userId: parts[4] });
    }
  }

  if (parts[0] === "v1" && parts[1] === "leanks" && parts[2]) {
    if (runtime.method === "POST" && parts[3] === "reactions") {
      return ok(await upsertReaction(runtime, actor, parts[2]));
    }

    if (
      runtime.method === "DELETE" &&
      parts[3] === "reactions" &&
      parts[4] === "current"
    ) {
      return ok(await deleteCurrentReaction(runtime, actor.$id, parts[2]));
    }
  }

  throw httpError(404, "NOT_FOUND", "Route not found");
}

async function getChats(runtime, actor) {
  const [chats, metas, blocked] = await Promise.all([
    listActiveChats(runtime, actor.$id),
    listRows(runtime, TABLES.userChatMeta, [
      sdk.Query.equal("userId", actor.$id),
      sdk.Query.limit(500),
    ]),
    listRows(runtime, TABLES.blocks, [
      sdk.Query.equal("blockerId", actor.$id),
      sdk.Query.limit(500),
    ]).catch(() => []),
  ]);

  const blockedIds = new Set(blocked.map((row) => row.blockedId));
  const visibleChats = chats.filter((chat) => !blockedIds.has(chat.ownerId));

  return {
    chats: visibleChats,
    metas,
    unreadCount: countUnread(visibleChats, metas, actor.$id),
  };
}

async function listActiveChats(runtime, actorId) {
  return listRows(runtime, TABLES.leanks, [
    sdk.Query.select(CHAT_SELECT),
    sdk.Query.or([
      sdk.Query.equal("ownerId", actorId),
      sdk.Query.contains("participantIds", actorId),
    ]),
    sdk.Query.equal("status", LEANK_STATUS.ACTIVE),
    sdk.Query.orderDesc("$updatedAt"),
    sdk.Query.limit(500),
  ]);
}

async function getAuthorizedChat(runtime, actorId, chatId) {
  const chat = await getRow(runtime, TABLES.leanks, chatId, [
    sdk.Query.select(CHAT_SELECT),
  ]);
  ensureChatMember(chat, actorId);
  return chat;
}

async function getMessages(runtime, actorId, chatId) {
  await getAuthorizedChat(runtime, actorId, chatId);
  const limit = Math.min(Number(runtime.query.limit || 50) || 50, 100);
  const queries = [
    sdk.Query.equal("leankId", chatId),
    sdk.Query.orderDesc("$createdAt"),
    sdk.Query.limit(limit),
  ];

  if (runtime.query.cursor) {
    queries.push(sdk.Query.cursorAfter(runtime.query.cursor));
  }

  const rows = await listRows(runtime, TABLES.messages, queries);
  return {
    messages: [...rows].reverse(),
    nextCursor: rows.length === limit ? rows[rows.length - 1].$id : null,
  };
}

async function listParticipants(runtime, chatId) {
  return listRows(runtime, TABLES.participants, [
    sdk.Query.select([
      "leank.$id",
      "user.$id",
      "user.name",
      "user.avatar",
      "user.age",
    ]),
    sdk.Query.equal("leank.$id", chatId),
    sdk.Query.limit(500),
  ]);
}

async function sendMessage(runtime, actor, chatId) {
  const chat = await getAuthorizedChat(runtime, actor.$id, chatId);
  const profile = await getRow(runtime, TABLES.user, actor.$id);
  const content = String(runtime.body.content || "").trim();
  if (!content) {
    throw httpError(400, "EMPTY_MESSAGE", "Message content is required");
  }

  const message = await createRow(runtime, TABLES.messages, sdk.ID.unique(), {
    content,
    senderId: actor.$id,
    senderName: profile.name || actor.name || "Leankly user",
    senderPhoto: profile.avatar || "",
    leankId: chatId,
    type: "user",
    ...pickDefined(runtime.body, [
      "replyToMessageId",
      "replyToSenderId",
      "replyToSenderName",
      "replyToContent",
    ]),
  });

  await updateRow(runtime, TABLES.leanks, chatId, {
    lastMessage: message,
    $updatedAt: new Date().toISOString(),
  });

  // Pushes are triggered only after the message and lastMessage write succeed.
  await enqueuePush(runtime, "Chat", message, chat).catch(() => {});
  return { message, chat: { ...chat, lastMessage: message } };
}

async function markChatRead(runtime, actorId, chatId) {
  await getAuthorizedChat(runtime, actorId, chatId);
  const readAt = new Date().toISOString();
  const existing = await listRows(runtime, TABLES.userChatMeta, [
    sdk.Query.equal("leankId", chatId),
    sdk.Query.equal("userId", actorId),
    sdk.Query.limit(1),
  ]);

  if (existing[0]?.$id) {
    await updateRow(runtime, TABLES.userChatMeta, existing[0].$id, {
      leankId: chatId,
      userId: actorId,
      readAt,
    });
    return;
  }

  await createRow(runtime, TABLES.userChatMeta, sdk.ID.unique(), {
    leankId: chatId,
    userId: actorId,
    readAt,
  });
}

async function getUnreadCountResponse(runtime, actorId) {
  const [chats, metas] = await Promise.all([
    listActiveChats(runtime, actorId),
    listRows(runtime, TABLES.userChatMeta, [
      sdk.Query.equal("userId", actorId),
      sdk.Query.limit(500),
    ]),
  ]);

  return { unreadCount: countUnread(chats, metas, actorId) };
}

async function listRequests(runtime, actorId) {
  return listRows(runtime, TABLES.reactions, [
    sdk.Query.select([
      "isLiked",
      "userId",
      "leankId",
      "user.name",
      "user.age",
      "user.avatar",
      "user.pushToken",
      "leank.title",
      "leank.ownerId",
    ]),
    sdk.Query.equal("leank.ownerId", actorId),
    sdk.Query.equal("isLiked", true),
    sdk.Query.equal("status", REQUEST_STATUS.PENDING),
    sdk.Query.orderDesc("$createdAt"),
    sdk.Query.limit(500),
  ]);
}

async function acceptRequest(runtime, actor, requestId) {
  const request = await getRow(runtime, TABLES.reactions, requestId, [
    sdk.Query.select([
      "*",
      "user.$id",
      "user.name",
      "user.pushToken",
      "leank.$id",
      "leank.title",
      "leank.ownerId",
      "leank.participantIds",
    ]),
  ]);
  const leank = request.leank;
  const joiningUser = request.user;

  if (!leank || leank.ownerId !== actor.$id) {
    throw httpError(403, "FORBIDDEN", "Only the host can accept this request");
  }

  await updateArrayField(runtime, TABLES.leanks, leank.$id, "participantIds", [
    joiningUser.$id,
  ]);

  const existingParticipant = await listRows(runtime, TABLES.participants, [
    sdk.Query.equal("leank", leank.$id),
    sdk.Query.equal("user", joiningUser.$id),
    sdk.Query.limit(1),
  ]);

  if (!existingParticipant[0]) {
    // Accept may be retried after partial failure; this prevents duplicate participant rows.
    await createRow(runtime, TABLES.participants, sdk.ID.unique(), {
      leank: leank.$id,
      user: joiningUser.$id,
    });
  }

  await updateRow(runtime, TABLES.reactions, requestId, {
    status: REQUEST_STATUS.ACCEPTED,
  });

  await enqueuePush(runtime, "Alert", {
    token: joiningUser.pushToken,
    title: "Leank request accepted",
    content: leank.title,
  }).catch(() => {});
}

async function declineRequest(runtime, actor, requestId) {
  const request = await getRow(runtime, TABLES.reactions, requestId, [
    sdk.Query.select(["*", "leank.ownerId"]),
  ]);
  if (request?.leank?.ownerId !== actor.$id) {
    throw httpError(403, "FORBIDDEN", "Only the host can decline this request");
  }
  await updateRow(runtime, TABLES.reactions, requestId, {
    status: REQUEST_STATUS.DECLINED,
  });
}

async function leaveChat(runtime, actor, chatId) {
  const chat = await getAuthorizedChat(runtime, actor.$id, chatId);
  if (chat.ownerId === actor.$id) {
    throw httpError(400, "HOST_CANNOT_LEAVE", "Hosts must close the leank");
  }

  await updateArrayField(runtime, TABLES.leanks, chatId, "participantIds", [
    actor.$id,
  ], "remove");
  await deleteParticipantRows(runtime, chatId, actor.$id);
  await createSystemMessage(runtime, chatId, `${actor.name || "A leanker"} left the leank`);
}

async function closeChat(runtime, actorId, chatId) {
  const chat = await getAuthorizedChat(runtime, actorId, chatId);
  if (chat.ownerId !== actorId) {
    throw httpError(403, "FORBIDDEN", "Only the host can close this leank");
  }
  await updateRow(runtime, TABLES.leanks, chatId, {
    status: LEANK_STATUS.COMPLETED,
  });
}

async function removeParticipant(runtime, actor, chatId, userId) {
  const chat = await getAuthorizedChat(runtime, actor.$id, chatId);
  if (chat.ownerId !== actor.$id) {
    throw httpError(403, "FORBIDDEN", "Only the host can remove participants");
  }
  if (userId === actor.$id) {
    throw httpError(400, "HOST_REMOVE_SELF", "Host cannot remove themselves");
  }

  const user = await getRow(runtime, TABLES.user, userId).catch(() => null);
  await updateArrayField(runtime, TABLES.leanks, chatId, "participantIds", [
    userId,
  ], "remove");
  await deleteParticipantRows(runtime, chatId, userId);
  await createSystemMessage(
    runtime,
    chatId,
    `${user?.name || "A leanker"} was removed from the chat`
  );
}

async function upsertReaction(runtime, actor, leankId) {
  const existing = await listRows(runtime, TABLES.reactions, [
    sdk.Query.equal("userId", actor.$id),
    sdk.Query.equal("leankId", leankId),
    sdk.Query.limit(1),
  ]);

  const data = {
    userId: actor.$id,
    leankId,
    isLiked: true,
    status: REQUEST_STATUS.PENDING,
    user: actor.$id,
    leank: leankId,
  };

  let reaction;
  if (existing[0]?.$id) {
    reaction = await updateRow(runtime, TABLES.reactions, existing[0].$id, data);
  } else {
    reaction = await createRow(runtime, TABLES.reactions, sdk.ID.unique(), data);
  }

  const [leank, profile] = await Promise.all([
    getRow(runtime, TABLES.leanks, leankId, [
      sdk.Query.select(["title", "ownerId", "owner.pushToken"]),
    ]).catch(() => null),
    getRow(runtime, TABLES.user, actor.$id).catch(() => null),
  ]);

  if (leank?.ownerId && leank.ownerId !== actor.$id) {
    await enqueuePush(runtime, "Alert", {
      token: leank.owner?.pushToken,
      title: "New leank request",
      content: `${profile?.name || actor.name || "A leanker"} wants to join ${leank.title}`,
    }).catch(() => {});
  }

  return { reaction };
}

async function deleteCurrentReaction(runtime, actorId, leankId) {
  const existing = await listRows(runtime, TABLES.reactions, [
    sdk.Query.equal("userId", actorId),
    sdk.Query.equal("leankId", leankId),
    sdk.Query.limit(1),
  ]);

  if (existing[0]?.$id) {
    await deleteRow(runtime, TABLES.reactions, existing[0].$id);
  }

  return { leankId };
}

async function createSystemMessage(runtime, chatId, content) {
  const message = await createRow(runtime, TABLES.messages, sdk.ID.unique(), {
    leankId: chatId,
    content,
    senderId: "system",
    senderName: "System",
    senderPhoto: "",
    type: "system",
  });

  await updateRow(runtime, TABLES.leanks, chatId, {
    lastMessage: message,
    $updatedAt: new Date().toISOString(),
  });

  return message;
}

async function deleteParticipantRows(runtime, chatId, userId) {
  const rows = await listRows(runtime, TABLES.participants, [
    sdk.Query.equal("leank", chatId),
    sdk.Query.equal("user", userId),
    sdk.Query.limit(100),
  ]);

  await Promise.all(rows.map((row) => deleteRow(runtime, TABLES.participants, row.$id)));
}

async function updateArrayField(
  runtime,
  tableId,
  rowId,
  field,
  values,
  action = "add"
) {
  const row = await getRow(runtime, tableId, rowId);
  const current = Array.isArray(row[field]) ? row[field] : [];
  const next =
    action === "remove"
      ? current.filter((value) => !values.includes(value))
      : Array.from(new Set([...current, ...values]));

  return updateRow(runtime, tableId, rowId, { [field]: next });
}

async function enqueuePush(runtime, type, data) {
  const functionId = process.env.APPWRITE_SEND_PUSH_FUNCTION_ID;
  if (!functionId) return;

  await runtime.functions.createExecution({
    functionId,
    body: JSON.stringify({ type, data }),
  });
}

function ensureChatMember(chat, actorId) {
  const participantIds = Array.isArray(chat.participantIds)
    ? chat.participantIds
    : [];
  if (chat.ownerId !== actorId && !participantIds.includes(actorId)) {
    throw httpError(403, "FORBIDDEN", "You are not a participant in this chat");
  }
}

function countUnread(chats, metas, actorId) {
  return chats.filter((chat) => {
    const lastMessageAt = chat.lastMessage?.$createdAt
      ? new Date(chat.lastMessage.$createdAt).getTime()
      : 0;
    if (!lastMessageAt || chat.lastMessage?.senderId === actorId) return false;

    const meta = metas.find(
      (row) => row.leankId === chat.$id && row.userId === actorId
    );
    const readAt = meta?.readAt ? new Date(meta.readAt).getTime() : 0;
    return lastMessageAt > readAt;
  }).length;
}

async function listRows(runtime, tableId, queries = []) {
  const result = await runtime.db.listRows({
    databaseId: runtime.databaseId,
    tableId,
    queries,
  });
  return result.rows || [];
}

function getRow(runtime, tableId, rowId, queries = []) {
  return runtime.db.getRow({
    databaseId: runtime.databaseId,
    tableId,
    rowId,
    queries,
  });
}

function createRow(runtime, tableId, rowId, data) {
  return runtime.db.createRow({
    databaseId: runtime.databaseId,
    tableId,
    rowId,
    data: cleanObject(data),
  });
}

function updateRow(runtime, tableId, rowId, data) {
  return runtime.db.updateRow({
    databaseId: runtime.databaseId,
    tableId,
    rowId,
    data: cleanObject(data),
  });
}

function deleteRow(runtime, tableId, rowId) {
  return runtime.db.deleteRow({
    databaseId: runtime.databaseId,
    tableId,
    rowId,
  });
}

function pickDefined(source, keys) {
  return keys.reduce((acc, key) => {
    if (source[key] !== undefined && source[key] !== null) {
      acc[key] = source[key];
    }
    return acc;
  }, {});
}

function cleanObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}

function normalizePath(req) {
  const raw = req.path || "/";
  if (raw.startsWith("/v1")) return raw;
  const url = new URL(req.url || `https://function.local${raw}`);
  return url.pathname;
}

function readQuery(req) {
  if (req.query && typeof req.query === "object") return req.query;
  const url = new URL(req.url || `https://function.local${req.path || "/"}`);
  return Object.fromEntries(url.searchParams.entries());
}

function readBody(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
  if (!req.bodyRaw) return {};
  try {
    return JSON.parse(req.bodyRaw);
  } catch {
    return {};
  }
}

function getBearerToken(req) {
  const headers = req.headers || {};
  const auth =
    headers.authorization ||
    headers.Authorization ||
    headers["x-appwrite-jwt"] ||
    headers["X-Appwrite-JWT"];
  if (!auth) return "";
  return String(auth).replace(/^Bearer\s+/i, "");
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw httpError(500, "MISSING_ENV", `${name} is not set`);
  }
  return value;
}

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function ok(data) {
  return { ok: true, data };
}

function json(res, body, status = 200) {
  return res.json(body, status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
}
