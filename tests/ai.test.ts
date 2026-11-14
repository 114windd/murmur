import test from "node:test";
import assert from "node:assert/strict";
import { transcribeAudio, cancelAI } from "../lib/ai.ts";
test("cancelling during audio decoding cannot start a worker or return late text", async () => {
  let finish: (value: unknown) => void = () => {};
  let workerStarts = 0;
  const oldContext = globalThis.AudioContext,
    oldWorker = globalThis.Worker;
  (globalThis as any).AudioContext = class {
    decodeAudioData() {
      return new Promise((resolve) => {
        finish = resolve;
      });
    }
    async close() {}
  };
  (globalThis as any).Worker = class {
    onmessage: any;
    constructor() {
      workerStarts++;
    }
    postMessage(data: any) {
      queueMicrotask(() =>
        this.onmessage?.({ data: { id: data.id, result: "late text" } }),
      );
    }
    terminate() {}
  };
  try {
    const controller = new AbortController();
    const result = transcribeAudio(
      new Blob(["audio"]),
      () => {},
      controller.signal,
    );
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();
    cancelAI();
    finish({ getChannelData: () => new Float32Array(2) });
    await assert.rejects(result, /stopped|abort/i);
    assert.equal(workerStarts, 0);
  } finally {
    globalThis.AudioContext = oldContext;
    globalThis.Worker = oldWorker;
    cancelAI();
  }
});
