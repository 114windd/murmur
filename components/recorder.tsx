"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, LoaderCircle } from "lucide-react";
import { durationLabel } from "@/lib/client";
export type Capture = { blob: Blob; duration: number; transcript: string };
export function Recorder({
  onCapture,
  compact = false,
  shortcutHeld = false,
  onError,
}: {
  onCapture: (c: Capture) => void;
  compact?: boolean;
  shortcutHeld?: boolean;
  onError: (s: string) => void;
}) {
  const [state, setState] = useState<"idle" | "starting" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [tap, setTap] = useState(false);
  const stopping = useRef(false);
  // A released or superseded permission request must never start recording.
  const generation = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const holding = useRef(false);
  const began = useRef(0);
  const mounted = useRef(true);
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
      holding.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const stop = () => {
    generation.current++;
    holding.current = false;
    if (!recorder.current || recorder.current.state !== "recording")
      setState("idle");
    if (recorder.current?.state === "recording") {
      stopping.current = true;
      recorder.current.stop();
    }
  };
  useEffect(() => {
    if (state !== "recording") return;
    const t = setInterval(() => {
      const elapsed = (Date.now() - began.current) / 1000;
      setSeconds(elapsed);
      if (elapsed >= 600) stop();
    }, 200);
    return () => clearInterval(t);
  }, [state]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("blur", stop);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("blur", stop);
    };
  }, []);
  async function start() {
    if (
      stopping.current ||
      recorder.current?.state === "recording" ||
      holding.current
    )
      return;
    holding.current = true;
    const token = ++generation.current;
    setState("starting");
    setSeconds(0);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Recording needs a supported browser and a secure connection. You can still write a note.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (
        token !== generation.current ||
        !holding.current ||
        !mounted.current
      ) {
        media.getTracks().forEach((t) => t.stop());
        if (mounted.current && token === generation.current) setState("idle");
        return;
      }
      stream.current = media;
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(
        media,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => {
        stop();
        onError("The microphone stopped unexpectedly. Try recording again.");
      };
      rec.onstop = () => {
        stopping.current = false;
        media.getTracks().forEach((t) => t.stop());
        holding.current = false;
        const duration = Math.min(600, (Date.now() - began.current) / 1000);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (mounted.current) {
          setState("idle");
          if (blob.size > 0 && duration > 0.25)
            onCaptureRef.current({
              blob,
              duration,
              transcript: "",
            });
        }
      };
      rec.start(250);
      began.current = Date.now();
      setState("recording");
    } catch (e) {
      if (token !== generation.current || !mounted.current) return;
      holding.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      setState("idle");
      onError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Allow microphone access in your browser, then hold the button again."
          : e instanceof Error
            ? e.message
            : "The microphone could not start.",
      );
    }
  }
  useEffect(() => {
    if (shortcutHeld) void start();
    else stop();
  }, [shortcutHeld]);
  return (
    <div
      className={`recorder ${compact ? "compact" : ""} ${state === "recording" ? "is-recording" : ""}`}
    >
      <div className="mic-orbit">
        <span className="orbit-dot one" />
        <span className="orbit-dot two" />
        <button
          className="record-button"
          aria-keyshortcuts="R"
          aria-label={
            state === "recording"
              ? "Recording. Release to finish."
              : tap
                ? "Start recording"
                : "Hold to record"
          }
          aria-pressed={state === "recording"}
          onPointerDown={(e) => {
            if (tap) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            void start();
          }}
          onPointerUp={() => {
            if (!tap) stop();
          }}
          onPointerCancel={stop}
          onLostPointerCapture={() => {
            if (!tap) stop();
          }}
          onClick={() => {
            if (tap) {
              if (state === "recording") stop();
              else void start();
            }
          }}
          onKeyDown={(e) => {
            if (!tap && (e.code === "Space" || e.code === "Enter")) {
              e.preventDefault();
              if (!e.repeat) void start();
            }
          }}
          onKeyUp={(e) => {
            if (!tap && (e.code === "Space" || e.code === "Enter")) {
              e.preventDefault();
              stop();
            }
          }}
        >
          {state === "starting" ? (
            <LoaderCircle className="spin" size={30} />
          ) : state === "recording" ? (
            <Square size={28} fill="currentColor" />
          ) : (
            <Mic size={33} strokeWidth={1.6} />
          )}
        </button>
      </div>
      <div className="record-caption" aria-live="polite">
        <strong>
          {state === "starting"
            ? "Opening your microphone…"
            : state === "recording"
              ? `${durationLabel(seconds)} · listening`
              : tap
                ? "Tap to start a thought"
                : "Hold to capture a thought"}
        </strong>
        <span>
          {state === "recording"
            ? tap
              ? "Tap again to finish."
              : "Let go when you’re ready."
            : "A tiny idea. A long ramble. It all belongs here."}
        </span>
      </div>
      <button
        className="text-button mode-switch"
        disabled={state !== "idle"}
        onClick={() => setTap(!tap)}
      >
        {tap ? "Use hold mode" : "Prefer tap to record?"}
      </button>
      {!compact && (
        <div className="key-hint">
          or hold <kbd>R</kbd> to talk
        </div>
      )}
    </div>
  );
}
