import { appwriteConfig } from "@/appwrite/config";
import { io, Socket } from "socket.io-client";
import { getAppwriteJwt } from "./client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

async function getSocket() {
  if (socket?.connected) return socket;
  if (connecting) return connecting;
  connecting = getAppwriteJwt()
    .then(
      (token) =>
        new Promise<Socket>((resolve, reject) => {
          const next = io(appwriteConfig.socketUrl, {
            transports: ["websocket"],
            auth: { token },
            reconnection: true,
          });
          next.once("connect", () => {
            socket = next;
            resolve(next);
          });
          next.once("connect_error", reject);
        }),
    )
    .finally(() => {
      connecting = null;
    });
  return connecting;
}

export const realtime = {
  subscribe(event: string, listener: (data: any) => void) {
    let active = true;
    let connected: Socket | null = null;
    void getSocket().then((value) => {
      if (!active) return;
      connected = value;
      value.on(event, listener);
    });
    return () => {
      active = false;
      connected?.off(event, listener);
    };
  },
  subscribeLeank(leankId: string) {
    let active = true;
    void getSocket().then((value) => {
      if (active) value.emit("leank.subscribe", { leankId });
    });
    return () => {
      active = false;
      socket?.emit("leank.unsubscribe", { leankId });
    };
  },
  disconnect() {
    socket?.disconnect();
    socket = null;
  },
};
