import test from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedUser,
  isOwnedAudioPath,
  parameterize,
} from "../lib/platform-rules.ts";
test("verified accounts can open their own notebook; unverified sessions are refused", () => {
  assert.equal(
    isAllowedUser({ email: "Owner@example.test", emailVerified: true }),
    true,
  );
  assert.equal(
    isAllowedUser({ email: "friend@example.test", emailVerified: true }),
    true,
  );
  assert.equal(
    isAllowedUser({ email: "owner@example.test", emailVerified: false }),
    false,
  );
  assert.equal(isAllowedUser(null), false);
});
test("uploaded recordings must be under the signed-in owner prefix", () => {
  const path = "audio/u1/4c3b450c-8879-4c6d-beca-b7a224c5e651.webm";
  assert.equal(isOwnedAudioPath(path, "u1"), true);
  assert.equal(isOwnedAudioPath(path, "u2"), false);
  assert.equal(isOwnedAudioPath("audio/u1/../u2/file.webm", "u1"), false);
  assert.equal(isOwnedAudioPath("https://example.test/" + path, "u1"), false);
});
test("fixed SQL uses PostgreSQL positional parameters", () => {
  assert.equal(
    parameterize("SELECT * FROM notes WHERE id=? AND owner_id=?"),
    "SELECT * FROM notes WHERE id=$1 AND owner_id=$2",
  );
});
test("hold R records only outside text inputs and without browser modifier shortcuts", async () => {
  const { isRecordKey } = await import("../lib/platform-rules.ts");
  assert.equal(isRecordKey({ code: "KeyR" }, false), true);
  assert.equal(isRecordKey({ code: "KeyR" }, true), false);
  assert.equal(isRecordKey({ code: "KeyR", repeat: true }, false), false);
  assert.equal(isRecordKey({ code: "KeyR", metaKey: true }, false), false);
  assert.equal(isRecordKey({ code: "KeyR", ctrlKey: true }, false), false);
});
