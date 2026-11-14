// Downloaded models are cached by the browser. Note contents are processed locally.
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let speech = null,
  writer = null;
let running = false;
self.onmessage = async ({ data: { id, task, input } }) => {
  if (running) {
    self.postMessage({
      id,
      error: "AI is finishing another thought. Please try again in a moment.",
    });
    return;
  }
  running = true;
  const progress = (message) =>
    self.postMessage({ id, type: "progress", message });
  const onProgress = (p) => {
    if (p.status === "progress")
      progress(`Downloading AI model… ${Math.round(p.progress || 0)}%`);
  };
  try {
    let result;
    if (task === "transcribe") {
      progress("Preparing the speech model…");
      speech ||= await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny.en",
        { dtype: "q8", device: "wasm", progress_callback: onProgress },
      );
      progress("Listening back to your recording…");
      const output = await speech(input, {
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      result = output.text.trim();
    } else {
      if (input.length > 14000)
        throw new Error(
          "For long threads, connect OpenRouter for a full summary.",
        );
      progress(
        "Preparing on-device AI. The first download may take a few minutes…",
      );
      writer ||= await pipeline(
        "text-generation",
        "HuggingFaceTB/SmolLM2-360M-Instruct",
        { dtype: "q8", device: "wasm", progress_callback: onProgress },
      );
      progress("Finding the heart of your thought…");
      const output = await writer(
        [
          {
            role: "system",
            content:
              'Summarise the notes faithfully in 1-3 sentences. Extract only explicit tasks, never invent tasks. Output only JSON: {"summary":"...","actions":["..."]}. Use [] if no tasks.',
          },
          { role: "user", content: input },
        ],
        {
          max_new_tokens: 350,
          do_sample: false,
          return_full_text: false,
          repetition_penalty: 1.1,
        },
      );
      const text =
        typeof output[0].generated_text === "string"
          ? output[0].generated_text
          : output[0].generated_text.at(-1).content;
      const match = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(match ? match[0] : text);
    }
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({
      id,
      error: e.message?.includes("long threads")
        ? e.message
        : "On-device AI could not finish. Check your connection, or connect OpenRouter and try again.",
    });
  } finally {
    running = false;
  }
};
