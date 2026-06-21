import assert from "node:assert/strict";
import test from "node:test";
import { createJwtProvider, requestWithJwt } from "../lib/api/auth-token";

test("coalesces concurrent Appwrite JWT creation", async () => {
  let calls = 0;
  const provider = createJwtProvider(async () => {
    calls += 1;
    await Promise.resolve();
    return "jwt-1";
  });

  const tokens = await Promise.all([
    provider.get(),
    provider.get(),
    provider.get(),
  ]);
  assert.deepEqual(tokens, ["jwt-1", "jwt-1", "jwt-1"]);
  assert.equal(calls, 1);
});

test("retries one unauthorized request with a fresh JWT", async () => {
  let tokenCalls = 0;
  const provider = createJwtProvider(async () => `jwt-${++tokenCalls}`);
  const sent: string[] = [];
  const response = await requestWithJwt(provider, async (token) => {
    sent.push(token);
    return { status: sent.length === 1 ? 401 : 200 };
  });

  assert.equal(response.status, 200);
  assert.deepEqual(sent, ["jwt-1", "jwt-2"]);
  assert.equal(tokenCalls, 2);
});

test("does not retry a non-authentication error", async () => {
  const provider = createJwtProvider(async () => "jwt-1");
  let sends = 0;
  const response = await requestWithJwt(provider, async () => {
    sends += 1;
    return { status: 500 };
  });

  assert.equal(response.status, 500);
  assert.equal(sends, 1);
});
