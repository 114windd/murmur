"use client";
import { useEffect, useRef, useState } from "react";
import { Feather, LoaderCircle, AudioLines } from "lucide-react";
import { Modal } from "./modal";
import { api, durationLabel } from "@/lib/client";
import type { Note } from "@/lib/core";
import { uploadRecording, discardUpload } from "@/lib/uploads";
import type { Capture } from "./recorder";
export function Composer({
  capture,
  note,
  onClose,
  onSave,
  cloudAI,
}: {
  capture: Capture | null;
  note: Note | null;
  onClose: () => void;
  onSave: (n: Note) => void;
  cloudAI: boolean;
}) {
  const [text, setText] = useState(capture?.transcript || "");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const [progress, setProgress] = useState("");
  const controller = useRef<AbortController | null>(null);
  const operation = useRef(0);
  const uploaded = useRef<string | null>(null);
  const uploadPromise = useRef<Promise<string> | null>(null);
  const saved = useRef(false);
  const saveAttempted = useRef(false);
  const unmounted = useRef(false);
  async function ensureAudio() {
    if (uploaded.current) return uploaded.current;
    if (!capture) throw new Error("No recording to upload.");
    if (!uploadPromise.current)
      uploadPromise.current = uploadRecording(capture.blob)
        .then((path) => {
          uploaded.current = path;
          if (unmounted.current && !saved.current && !saveAttempted.current)
            void discardUpload(path);
          return path;
        })
        .catch((error) => {
          uploadPromise.current = null;
          throw error;
        });
    return uploadPromise.current;
  }

  useEffect(() => {
    unmounted.current = false;
    return () => {
      operation.current++;
      unmounted.current = true;
      controller.current?.abort();
      if (uploaded.current && !saved.current && !saveAttempted.current)
        void discardUpload(uploaded.current);
    };
  }, []);
  useEffect(() => {
    if (!capture) return;
    const u = URL.createObjectURL(capture.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [capture]);
  async function transcribe() {
    if (!capture) return;
    const token = ++operation.current;
    controller.current = new AbortController();
    setTranscribing(true);
    setError("");
    try {
      if (cloudAI) {
        setProgress("Saving your private recording…");
        const audioPath = await ensureAudio();
        if (token !== operation.current) return;
        setProgress("Transcribing your recording…");
        const result = await api<{ text: string }>("/transcribe", {
          method: "POST",
          body: JSON.stringify({
            audioPath,
            transcript: "",
            duration: capture.duration,
          }),
          signal: controller.current.signal,
        });
        if (token === operation.current) setText(result.text);
      } else {
        const { transcribeAudio } = await import("@/lib/ai");
        if (token !== operation.current) return;
        const result = await transcribeAudio(
          capture.blob,
          setProgress,
          controller.current.signal,
        );
        if (token === operation.current) setText(result);
      }
    } catch (e) {
      if (token === operation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Transcription could not finish. You can save the recording and add text later.",
        );
    } finally {
      if (token === operation.current) {
        setTranscribing(false);
        setProgress("");
      }
    }
  }
  useEffect(() => {
    if (capture && !capture.transcript && !started.current) {
      started.current = true;
      void transcribe();
    }
    return () => {
      started.current = false;
    };
  }, []);
  async function save() {
    setBusy(true);
    setError("");
    try {
      const audioPath = capture ? await ensureAudio() : undefined;
      saveAttempted.current = true;
      const n = await api(note ? `/${note.id}/thoughts` : "", {
        method: "POST",
        body: JSON.stringify({
          transcript: text,
          duration: capture?.duration || 0,
          audioPath,
        }),
      });
      saved.current = true;
      onSave(n);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      onClose={() => {
        if (!busy && !transcribing) onClose();
      }}
      label={note ? "Add a thought" : "Save your thought"}
    >
      <div className="dialog-symbol">
        <Feather size={25} />
      </div>
      <h2>{note ? "A little more to the story." : "Keep this thought."}</h2>
      <p className="muted">
        {note
          ? `Adding to “${note.title}”`
          : "Give your idea a place to land. You can always come back to it."}
      </p>
      {capture && (
        <div className="audio-draft">
          <span>
            <AudioLines size={18} /> {durationLabel(capture.duration)} recording
          </span>
          <audio controls src={url} />
        </div>
      )}
      <label className="field-label" htmlFor="thought-text">
        Your {capture ? "transcript" : "thought"}
      </label>
      <textarea
        id="thought-text"
        autoFocus
        rows={7}
        value={text}
        maxLength={30000}
        disabled={transcribing}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          capture
            ? "Your recording is safe. Add a transcript or a little context…"
            : "Let your thoughts wander…"
        }
      />
      {transcribing && (
        <button
          className="text-button"
          onClick={async () => {
            operation.current++;
            controller.current?.abort();
            const { cancelAI } = await import("@/lib/ai");
            cancelAI();
            setTranscribing(false);
          }}
        >
          Stop transcription and keep recording
        </button>
      )}
      {capture && !text && (
        <button
          className="text-button"
          disabled={transcribing || busy}
          onClick={transcribe}
        >
          {transcribing ? (
            <>
              <LoaderCircle size={15} className="spin" />{" "}
              {progress || "Transcribing your recording…"}
            </>
          ) : (
            <>
              Transcribe recording{" "}
              {!cloudAI && (
                <span className="subtle">
                  (first use downloads a speech model)
                </span>
              )}
            </>
          )}
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="secondary-button"
          onClick={onClose}
          disabled={busy || transcribing}
        >
          Discard
        </button>
        <button
          className="primary-button"
          onClick={save}
          disabled={busy || transcribing || (!text.trim() && !capture)}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Feather size={16} />
          )}{" "}
          {busy ? "Saving…" : note ? "Add thought" : "Save thought"}
        </button>
      </div>
    </Modal>
  );
}
