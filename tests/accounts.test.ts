import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";

test("verified accounts have separate private notebooks", async (t) => {
  const db = new DatabaseSync(":memory:");
  // PostgreSQL-only ALTER constraint is covered by the real Postgres suite.
  for (const migration of [
    "0000_notebook.sql",
    "0001_unique_audio.sql",
    "0002_upload_ownership.sql",
  ])
    db.exec(
      readFileSync(
        new URL("../db/postgres/" + migration, import.meta.url),
        "utf8",
      ).split("ALTER TABLE thoughts")[0],
    );
  let identity: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  } | null = null;
  // Older deployments may still contain this setting; it must not gate friends.
  process.env.OWNER_EMAIL = "first@example.test";
  const managed = mock.module("@neon/auth/next/server", {
    namedExports: {
      createNeonAuth: () => ({
        getSession: async () => ({
          data: identity ? { user: identity } : null,
        }),
      }),
    },
  });
  const files = new Map<string, string>();
  class Statement {
    values: SQLInputValue[] = [];
    constructor(readonly text: string) {}
    bind(...values: SQLInputValue[]) {
      this.values = values;
      return this;
    }
    async first() {
      return db.prepare(this.text).get(...this.values) || null;
    }
    async all() {
      return { results: db.prepare(this.text).all(...this.values) };
    }
    async run() {
      return {
        meta: { changes: db.prepare(this.text).run(...this.values).changes },
      };
    }
  }
  const storage = mock.module("../lib/storage.ts", {
    namedExports: {
      database: () => ({
        prepare: (sql: string) => new Statement(sql),
        batch: async (statements: Statement[]) => {
          db.exec("BEGIN");
          try {
            const results = [];
            for (const statement of statements)
              results.push(await statement.run());
            db.exec("COMMIT");
            return results;
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
        },
      }),
      bucket: () => ({
        head: async (key: string) => ({
          size: files.get(key)?.length || 0,
          contentType: "audio/webm",
        }),
        get: async (key: string) => ({
          body: files.get(key),
          mime: "audio/webm",
        }),
        delete: async (key: string) => {
          files.delete(key);
        },
      }),
    },
  });
  const { handleApi } = await import("../lib/api.ts");
  const request = (path = "", method = "GET", body?: unknown) =>
    handleApi(
      new Request("https://murmur.example.test/api/notes" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: "https://murmur.example.test",
          "x-owner-id": "first-user",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      path.split("/").filter(Boolean),
    );
  let first: any;
  try {
    await t.test(
      "first verified account retains access and private playback",
      async () => {
        identity = {
          id: "first-user",
          email: "first@example.test",
          name: "First",
          emailVerified: true,
        };
        const audioPath = "audio/first-user/" + crypto.randomUUID() + ".webm";
        files.set(audioPath, "synthetic audio");
        db.prepare("INSERT INTO audio_uploads VALUES(?,?,?)").run(
          audioPath,
          identity.id,
          Date.now(),
        );
        const response = await request("", "POST", {
          transcript: "First person's private idea",
          duration: 3,
          audioPath,
          ownerId: "second-user",
        });
        assert.equal(response.status, 201);
        first = await response.json();
        assert.equal(
          await (
            await request(`/${first.id}/audio/${first.thoughts[0].id}`)
          ).text(),
          "synthetic audio",
        );
      },
    );
    await t.test(
      "a different verified email can create its own notebook",
      async () => {
        identity = {
          id: "second-user",
          email: "friend@example.test",
          name: "Friend",
          emailVerified: true,
        };
        const response = await request("", "POST", {
          transcript: "Second person's private idea",
        });
        assert.equal(response.status, 201);
        const second = await response.json();
        const notes = await (await request()).json();
        assert.deepEqual(
          notes.map((note: any) => note.id),
          [second.id],
        );
        assert.equal(
          (await (await request("/status")).json()).uploadPrefix,
          "audio/second-user/",
        );
      },
    );
    await t.test(
      "another account cannot access or mutate a note, audio, summary or follow-ups",
      async () => {
        assert.ok(first);
        for (const [path, method, body] of [
          [`/${first.id}`, "GET"],
          [`/${first.id}`, "PATCH", { title: "Stolen" }],
          [`/${first.id}`, "DELETE"],
          [`/${first.id}/thoughts`, "POST", { transcript: "Intrusion" }],
          [
            `/${first.id}/thoughts/${first.thoughts[0].id}`,
            "PATCH",
            { transcript: "Changed" },
          ],
          [`/${first.id}/audio/${first.thoughts[0].id}`, "GET"],
          [`/${first.id}/transcribe/${first.thoughts[0].id}`, "POST"],
          [`/${first.id}/summarize`, "POST"],
          [
            `/${first.id}/summary`,
            "PUT",
            { revision: 1, summary: "Changed", actions: [] },
          ],
        ] as [string, string, unknown?][])
          assert.equal(
            (await request(path, method, body)).status,
            404,
            method + " " + path,
          );
        const stolenPath = [...files.keys()][0];
        assert.equal(
          (
            await request("", "POST", {
              transcript: "Stolen audio",
              audioPath: stolenPath,
            })
          ).status,
          404,
        );
        assert.equal(
          (await request("/transcribe", "POST", { audioPath: stolenPath }))
            .status,
          404,
        );
      },
    );
    await t.test(
      "first person's records remain unchanged after cross-account attempts",
      async () => {
        identity = {
          id: "first-user",
          email: "first@example.test",
          name: "First",
          emailVerified: true,
        };
        const notes = await (await request()).json();
        assert.deepEqual(
          notes.map((note: any) => note.id),
          [first.id],
        );
        assert.equal(
          notes[0].thoughts[0].transcript,
          "First person's private idea",
        );
        assert.equal(notes[0].thoughts.length, 1);
        assert.equal(files.size, 1);
      },
    );
    await t.test(
      "unverified and missing sessions cannot open any notebook",
      async () => {
        identity = {
          id: "second-user",
          email: "friend@example.test",
          name: "Friend",
          emailVerified: false,
        };
        assert.equal((await request()).status, 401);
        assert.equal((await request("/" + first.id)).status, 401);
        identity = null;
        assert.equal((await request()).status, 401);
      },
    );
  } finally {
    managed.restore();
    storage.restore();
    db.close();
  }
});
