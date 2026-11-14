import test from "node:test";
import assert from "node:assert/strict";
import {
  validateThought,
  validateSummary,
  makeCalendar,
  selectNotes,
  validateReminder,
} from "../lib/core.ts";

test("notes require text or a recording, and audio types and lengths are bounded", () => {
  assert.throws(() => validateThought({ transcript: "" }));
  assert.throws(() => validateThought({ transcript: "a", duration: -1 }));
  assert.throws(() => validateThought({ transcript: "a".repeat(30001) }));
  assert.equal(
    validateThought({ transcript: "Buy some tea", duration: 8 }).transcript,
    "Buy some tea",
  );
  assert.equal(
    validateThought({ transcript: "", duration: 8 }, true).transcript,
    "",
  );
});
test("summary results require a summary and bounded explicit actions", () => {
  assert.throws(() => validateSummary({ summary: "", actions: [] }));
  assert.throws(() => validateSummary({ summary: "Hi", actions: "invented" }));
  assert.deepEqual(validateSummary({ summary: "An idea", actions: [] }), {
    summary: "An idea",
    actions: [],
  });
});
test("calendar export escapes user content and produces an exact UTC reminder", () => {
  const result = makeCalendar(
    {
      id: "n1",
      title: "Tea, cake;\nwith friends",
      reminderAt: Date.UTC(2026, 10, 15, 10),
      summary: "Plan\\notes",
    },
    "https://example.test",
  );
  assert.match(result, /DTSTART:20261115T100000Z/);
  assert.match(result, /SUMMARY:Tea\\, cake\\;\\nwith friends/);
  assert.match(result, /BEGIN:VALARM/);
  assert.doesNotMatch(result, /SUMMARY:Tea, cake;\n/);
});
test("search includes follow-ups and filters favourites, actions and reminders", () => {
  const notes = [
    {
      id: "1",
      title: "Idea",
      favorite: true,
      reminderAt: 123,
      summary: "",
      actions: [{ text: "Call Jo", done: false }],
      thoughts: [{ transcript: "purple flowers" }],
    },
    {
      id: "2",
      title: "Walk",
      favorite: false,
      reminderAt: null,
      summary: "",
      actions: [],
      thoughts: [],
    },
  ];
  assert.equal(selectNotes(notes, "all", "flowers").length, 1);
  assert.equal(selectNotes(notes, "favourites", "").length, 1);
  assert.equal(selectNotes(notes, "actions", "").length, 1);
  assert.equal(selectNotes(notes, "reminders", "").length, 1);
});
test("reminders reject invalid or past dates", () => {
  assert.throws(() => validateReminder("tomorrow"));
  assert.throws(() => validateReminder(Date.now() - 10000));
  assert.equal(validateReminder(null), null);
});

test("an older response cannot replace a newer saved note", async () => {
  const { upsertNote } = await import("../lib/core.ts");
  const current = {
    id: "same",
    version: 3,
    updatedAt: 123,
    title: "Newest",
  } as any;
  const older = { ...current, version: 2, title: "Old" };
  assert.equal(upsertNote([current], older)[0].title, "Newest");
  assert.equal(
    upsertNote([current], { ...current, version: 4, title: "Latest" })[0].title,
    "Latest",
  );
});
test("chunked request bodies are limited before parsing", async () => {
  const { readBoundedBody } = await import("../lib/http.ts");
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(9));
      c.enqueue(new Uint8Array(9));
      c.close();
    },
  });
  const req = new Request("https://murmur.test", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(() => readBoundedBody(req, 10), /too large/);
});
test("same-origin checks use the public Host instead of an internal preview hostname", async () => {
  const { isSameOriginRequest } = await import("../lib/http.ts");
  assert.equal(
    isSameOriginRequest(
      new Request("http://localhost:5173/api/auth/sign-in/email", {
        headers: { host: "127.0.0.1:5173", origin: "http://127.0.0.1:5173" },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("https://murmur.example/api/notes", {
        headers: { host: "murmur.example", origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOriginRequest(
      new Request("https://murmur.example/api/notes", {
        headers: { host: "murmur.example", "sec-fetch-site": "cross-site" },
      }),
    ),
    false,
  );
});
