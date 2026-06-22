import { appwriteConfig } from "@/appwrite/config";
import { io, Socket } from "socket.io-client";
import { getAppwriteJwt } from "./client";
import { RealtimeRoomRegistry } from "./realtime-room-registry";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;
let connectionGeneration = 0;
const roomRegistry = new RealtimeRoomRegistry();
const joinedLeankIds = new Set<string>();
const joiningLeankIds = new Set<string>();
const joinRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_JOIN_ATTEMPTS = 5;

function clearJoinRetry(leankId: string) {
  const timer = joinRetryTimers.get(leankId);
  if (timer) clearTimeout(timer);
  joinRetryTimers.delete(leankId);
}

function clearConnectionRoomState() {
  joinedLeankIds.clear();
  joiningLeankIds.clear();
  joinRetryTimers.forEach(clearTimeout);
  joinRetryTimers.clear();
}

function joinLeankRoom(
  currentSocket: Socket,
  leankId: string,
  attempt = 0,
) {
  if (
    socket !== currentSocket ||
    !currentSocket.connected ||
    !roomRegistry.has(leankId) ||
    joinedLeankIds.has(leankId) ||
    joiningLeankIds.has(leankId)
  ) {
    return;
  }

  joiningLeankIds.add(leankId);
  currentSocket.timeout(3_000).emit(
    "leank.subscribe",
    { leankId },
    (error: Error | null, response?: { ok?: boolean }) => {
      joiningLeankIds.delete(leankId);
      if (
        socket !== currentSocket ||
        !currentSocket.connected ||
        !roomRegistry.has(leankId)
      ) {
        return;
      }
      if (!error && response?.ok) {
        clearJoinRetry(leankId);
        joinedLeankIds.add(leankId);
        return;
      }
      if (attempt >= MAX_JOIN_ATTEMPTS - 1) return;

      clearJoinRetry(leankId);
      const timer = setTimeout(
        () => joinLeankRoom(currentSocket, leankId, attempt + 1),
        100 * 2 ** attempt,
      );
      joinRetryTimers.set(leankId, timer);
    },
  );
}

async function getSocket() {
  if (socket) return socket;
  if (connecting) return connecting;
  const generation = connectionGeneration;
  const pending = getAppwriteJwt()
    .then<Socket>((token) => {
      if (generation !== connectionGeneration) {
        throw new Error("Realtime connection was cancelled");
      }
      if (socket) return socket;
      const next = io(appwriteConfig.socketUrl, {
        transports: ["websocket"],
        auth: { token },
        reconnection: true,
        autoConnect: false,
      });
      socket = next;
      next.on("connect", () => {
        clearConnectionRoomState();
        roomRegistry
          .activeRoomIds()
          .forEach((leankId) => joinLeankRoom(next, leankId));
      });
      next.on("disconnect", clearConnectionRoomState);
      next.connect();
      return next;
    })
    .finally(() => {
      if (connecting === pending) connecting = null;
    });
  connecting = pending;
  return pending;
}

export const realtime = {
  subscribe(event: string, listener: (data: any) => void) {
    let active = true;
    let connected: Socket | null = null;
    void getSocket().then((value) => {
      if (!active) return;
      connected = value;
      value.on(event, listener);
    }).catch(() => {});
    return () => {
      active = false;
      connected?.off(event, listener);
    };
  },
  subscribeLeank(leankId: string) {
    let active = true;
    roomRegistry.retain(leankId);
    void getSocket().then((value) => {
      if (active) joinLeankRoom(value, leankId);
    }).catch(() => {});
    return () => {
      if (!active) return;
      active = false;
      if (!roomRegistry.release(leankId)) return;
      clearJoinRetry(leankId);
      joiningLeankIds.delete(leankId);
      joinedLeankIds.delete(leankId);
      if (socket?.connected) {
        socket.emit("leank.unsubscribe", { leankId });
      }
    };
  },
  disconnect() {
    connectionGeneration += 1;
    socket?.disconnect();
    socket = null;
    connecting = null;
    clearConnectionRoomState();
    roomRegistry.clear();
  },
};
