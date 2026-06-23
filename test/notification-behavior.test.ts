import assert from "node:assert/strict";
import test from "node:test";
import {
  SUPPRESS_FOREGROUND_NOTIFICATION,
  getNotificationLeankId,
} from "../lib/notificationBehavior";

test("extracts a direct notification leank ID", () => {
  assert.equal(getNotificationLeankId({ leankId: "leank-1" }), "leank-1");
});

test("extracts a nested notification leank ID", () => {
  assert.equal(
    getNotificationLeankId({ data: { leankId: "leank-2" } }),
    "leank-2"
  );
});

test("ignores missing or non-string notification leank IDs", () => {
  assert.equal(getNotificationLeankId({}), undefined);
  assert.equal(getNotificationLeankId({ leankId: 123 }), undefined);
  assert.equal(getNotificationLeankId({ data: { leankId: 123 } }), undefined);
});

test("suppresses all foreground notification presentation", () => {
  assert.equal(SUPPRESS_FOREGROUND_NOTIFICATION.shouldShowBanner, false);
  assert.equal(SUPPRESS_FOREGROUND_NOTIFICATION.shouldShowList, false);
  assert.equal(SUPPRESS_FOREGROUND_NOTIFICATION.shouldPlaySound, false);
  assert.equal(SUPPRESS_FOREGROUND_NOTIFICATION.shouldSetBadge, false);
});
