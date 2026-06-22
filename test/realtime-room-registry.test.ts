import assert from "node:assert/strict";
import test from "node:test";
import { RealtimeRoomRegistry } from "../lib/api/realtime-room-registry";

test("keeps a room active until its final subscriber releases it", () => {
  const registry = new RealtimeRoomRegistry();

  assert.equal(registry.retain("chat-1"), true);
  assert.equal(registry.retain("chat-1"), false);
  assert.deepEqual(registry.activeRoomIds(), ["chat-1"]);

  assert.equal(registry.release("chat-1"), false);
  assert.equal(registry.has("chat-1"), true);
  assert.equal(registry.release("chat-1"), true);
  assert.equal(registry.has("chat-1"), false);
});

test("retains active room ids for reconnect re-subscription", () => {
  const registry = new RealtimeRoomRegistry();

  registry.retain("chat-1");
  registry.retain("chat-2");
  registry.retain("chat-1");

  assert.deepEqual(registry.activeRoomIds(), ["chat-1", "chat-2"]);
});
