import assert from "node:assert/strict";
import test from "node:test";
import { getAppwriteResourceId, toAuthIdentity } from "../appwrite/adapters";
import { unwrapApiData } from "../lib/api/response";

test("normalizes an Appwrite account into the provider-neutral identity", () => {
  const identity = toAuthIdentity({
    $id: "appwrite-user-1",
    email: "person@example.com",
    name: "Person",
    emailVerification: true,
  } as never);

  assert.deepEqual(identity, {
    id: "appwrite-user-1",
    email: "person@example.com",
    name: "Person",
    emailVerified: true,
  });
  assert.equal("$id" in identity, false);
});

test("extracts Appwrite storage IDs at the provider boundary", () => {
  assert.equal(getAppwriteResourceId({ $id: "file-1" }), "file-1");
});

test("keeps backend entities in their normal API shape", () => {
  const user = {
    id: "domain-user-1",
    createdAt: "2026-06-22T12:00:00.000Z",
    updatedAt: "2026-06-22T12:30:00.000Z",
  };
  const result = unwrapApiData({ ok: true, data: user });

  assert.equal(result, user);
  assert.equal(result.id, "domain-user-1");
  assert.equal("$id" in result, false);
  assert.equal("$createdAt" in result, false);
  assert.equal("$updatedAt" in result, false);
});
