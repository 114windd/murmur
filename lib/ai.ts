let worker: Worker | null = null;
let nextId = 0;
type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  progress: (message: string) => void;
};
const pending = new Map<number, Pending>();
function getWorker() {
  if (!worker) {
    worker = new Worker("/ai-worker.js", { type: "module" });
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      if (data.type === "progress") request.progress(data.message);
      else {
        pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
      }
    };
    worker.onerror = () =>
      resetWorker(
        "On-device AI could not load. Check your connection and try again.",
      );
  }
  return worker;
}
function resetWorker(message: string) {
  worker?.terminate();
  worker = null;
  for (const request of pending.values()) request.reject(new Error(message));
  pending.clear();
}
export function cancelAI() {
  resetWorker("AI stopped. Your recording is still here.");
}
function checkCancelled(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new Error("Transcription stopped. Your recording is still here.");
}
function run(
  task: string,
  input: unknown,
  progress: (message: string) => void,
  signal?: AbortSignal,
) {
  checkCancelled(signal);
  const id = ++nextId;
  return new Promise<unknown>((resolve, reject) => {
    const abort = () => cancelAI();
    const timer = setTimeout(
      () =>
        resetWorker(
          "AI took too long. Your recording is still here; please try again.",
        ),
      300000,
    );
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    pending.set(id, {
      resolve: (value) => {
        cleanup();
        resolve(value);
      },
      reject: (error) => {
        cleanup();
        reject(error);
      },
      progress,
    });
    signal?.addEventListener("abort", abort, { once: true });
    try {
      getWorker().postMessage({ id, task, input });
    } catch {
      cleanup();
      pending.delete(id);
      reject(new Error("On-device AI is unavailable in this browser."));
    }
  });
}
export async function transcribeAudio(
  blob: Blob,
  progress: (message: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  checkCancelled(signal);
  const context = new AudioContext({ sampleRate: 16000 });
  try {
    const bytes = await blob.arrayBuffer();
    checkCancelled(signal);
    const decoded = await context.decodeAudioData(bytes);
    checkCancelled(signal);
    return (await run(
      "transcribe",
      decoded.getChannelData(0),
      progress,
      signal,
    )) as string;
  } finally {
    await context.close();
  }
}
export async function summarizeLocally(
  text: string,
  progress: (message: string) => void,
) {
  return (await run("summarize", text, progress)) as {
    summary: string;
    actions: string[];
  };
}
