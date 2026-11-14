import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.MURMUR_TEST_URL;
test(
  "private notebook API: audio, follow-ups, ownership, revisions and reminders",
  { skip: !base || !process.env.MURMUR_TEST_COOKIE },
  async () => {
    const request = async (path = "", init: RequestInit = {}) =>
      fetch(base + "/api/notes" + path, {
        ...init,
        headers: { Cookie: process.env.MURMUR_TEST_COOKIE||"", ...init.headers },
      });
    const send = (body: unknown) => ({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal((await fetch(base + "/api/notes")).status, 401);
    assert.equal(
      (
        await fetch(base + "/api/notes", {
          headers: {
            "oai-authenticated-user-id": "forged",
            "oai-authenticated-user-email": "forged@example.test",
          },
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request("", {
          ...send({ transcript: "Test" }),
          headers: {
            "Content-Type": "application/json",
            Origin: "https://evil.test",
          },
        })
      ).status,
      403,
    );
    assert.equal((await request("", send({ transcript: "" }))).status, 400);
    const created = await request(
      "",
      send({
        transcript:
          "QA: plan a picnic. I need to call Jo tomorrow and bring tea.",
        duration: 7,
      }),
    );
    assert.equal(created.status, 201);
    let note = (await created.json()) as any;
    try {
      assert.equal((await request("/" + crypto.randomUUID())).status, 404);
      const form = new FormData();
      form.set("transcript", "QA: bring cake too.");
      form.set("duration", "4");
      form.set(
        "audio",
        new Blob(["test audio bytes"], { type: "audio/webm" }),
        "thought.webm",
      );
      const follow = await request("/" + note.id + "/thoughts", {
        method: "POST",
        body: form,
      });
      assert.equal(follow.status, 201);
      note = await follow.json();
      assert.equal(note.thoughts.length, 2);
      assert.equal(note.revision, 2);
      const audio = await request(
        "/" + note.id + "/audio/" + note.thoughts[1].id,
      );
      assert.equal(await audio.text(), "test audio bytes");
      const save = {
        summary: "A picnic with tea and cake.",
        actions: ["Call Jo tomorrow"],
        revision: 1,
      };
      assert.equal(
        (
          await request("/" + note.id + "/summary", {
            ...send(save),
            method: "PUT",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request("/" + note.id + "/summary", {
            ...send({ ...save, revision: 2 }),
            method: "PUT",
          })
        ).status,
        200,
      );
      const reminderAt = Date.now() + 86400000;
      const patch = await request("/" + note.id, {
        ...send({ reminderAt, favorite: true }),
        method: "PATCH",
      });
      assert.equal(patch.status, 200);
      const read = (await (await request("/" + note.id)).json()) as any;
      assert.equal(read.reminderAt, reminderAt);
      assert.equal(read.favorite, true);
      assert.equal(read.summary, save.summary);
      const status = (await (await request("/status")).json()) as any;
      if (status.cloudAI) {
        const ai = await request("/" + note.id + "/summarize", {
          method: "POST",
        });
        assert.equal(ai.status, 200);
        const result = (await ai.json()) as any;
        assert.ok(result.summary.length > 10);
        assert.ok(result.actions.some((a: any) => /call|jo/i.test(a.text)));
      }
    } finally {
      assert.equal(
        (await request("/" + note.id, { method: "DELETE" })).status,
        200,
      );
      assert.equal((await request("/" + note.id)).status, 404);
    }
  },
);
