"use client";
import { useState, useEffect } from "react";
import {
  Star,
  Bell,
  Feather,
  Sparkles,
  Download,
  Trash2,
  LoaderCircle,
  Check,
  Pencil,
  CalendarPlus,
  Clock,
  AudioLines,
} from "lucide-react";
import { isRecordKey } from "@/lib/platform-rules";
import { Modal } from "./modal";
import { Recorder, type Capture } from "./recorder";
import { api, dateLabel, durationLabel, download } from "@/lib/client";
import {
  makeCalendar,
  validateSummary,
  type Note,
  type Thought,
} from "@/lib/core";
function Transcript({
  thought,
  note,
  onUpdate,
  cloudAI,
}: {
  cloudAI: boolean;
  thought: Thought;
  note: Note;
  onUpdate: (n: Note) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(thought.transcript);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      onUpdate(
        await api(`/${note.id}/thoughts/${thought.id}`, {
          method: "PATCH",
          body: JSON.stringify({ transcript: text }),
        }),
      );
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function transcribe() {
    setBusy(true);
    setError("");
    try {
      let transcript;
      if (cloudAI) {
        transcript = (
          await api<{ text: string }>(`/${note.id}/transcribe/${thought.id}`, {
            method: "POST",
          })
        ).text;
      } else {
        const audio = await fetch(`/api/notes/${note.id}/audio/${thought.id}`);
        if (!audio.ok) throw new Error("Your recording could not be opened.");
        const { transcribeAudio } = await import("@/lib/ai");
        transcript = await transcribeAudio(await audio.blob(), setProgress);
      }
      setText(transcript);
      setEditing(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <div className="thought-text">
      {editing ? (
        <>
          <textarea
            aria-label="Edit transcript"
            rows={5}
            value={text}
            maxLength={30000}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="inline-actions">
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setText(thought.transcript);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button className="small-button" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save transcript"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={thought.transcript ? "" : "muted"}>
            {thought.transcript || "A thought captured in your voice."}
          </p>
          <div className="inline-actions">
            <button className="text-button" onClick={() => setEditing(true)}>
              <Pencil size={13} />
              {thought.transcript ? "Edit transcript" : "Add transcript"}
            </button>
            {!thought.transcript && thought.audioKey && (
              <button
                className="text-button"
                disabled={busy}
                onClick={transcribe}
              >
                {busy ? (
                  <LoaderCircle size={13} className="spin" />
                ) : (
                  <AudioLines size={13} />
                )}{" "}
                {busy
                  ? progress || "Transcribing…"
                  : cloudAI
                    ? "Transcribe recording"
                    : "Transcribe on device"}
              </button>
            )}
          </div>
        </>
      )}
      {thought.audioKey && (
        <audio
          preload="none"
          controls
          src={`/api/notes/${note.id}/audio/${thought.id}`}
        />
      )}{" "}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function NoteDetail({
  note,
  onClose,
  onUpdate,
  onDelete,
  onFollow,
  cloudAI,
}: {
  note: Note;
  onClose: () => void;
  onUpdate: (n: Note) => void;
  onDelete: (id: string) => void;
  onFollow: (capture: Capture | null) => void;
  cloudAI: boolean;
}) {
  const [tab, setTab] = useState<"thoughts" | "summary">("thoughts");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [recording, setRecording] = useState(false);
  const [shortcutHeld, setShortcutHeld] = useState(false);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing =
        target.isContentEditable ||
        !!target.closest('input,textarea,select,[contenteditable="true"]');
      if (event.defaultPrevented || !isRecordKey(event, editing)) return;
      event.preventDefault();
      setTab("thoughts");
      setRecording(true);
      setShortcutHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "KeyR") setShortcutHeld(false);
    };
    const blur = () => setShortcutHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const [showReminder, setShowReminder] = useState(false);
  const [reminder, setReminder] = useState("");
  const [rename, setRename] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [progress, setProgress] = useState("");
  const change = async (patch: unknown) => {
    setError("");
    try {
      onUpdate(
        await api(`/${note.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  async function summarise() {
    if (note.thoughts.some((t) => t.audioKey && !t.transcript.trim())) {
      setError(
        "Transcribe each recording first so the summary includes the whole idea.",
      );
      return;
    }
    setBusy("summary");
    setError("");
    setTab("summary");
    try {
      if (cloudAI)
        onUpdate(await api(`/${note.id}/summarize`, { method: "POST" }));
      else {
        const { summarizeLocally } = await import("@/lib/ai");
        const result = validateSummary(
          await summarizeLocally(
            note.thoughts.map((t) => t.transcript).join("\n\n"),
            setProgress,
          ),
        );
        onUpdate(
          await api(`/${note.id}/summary`, {
            method: "PUT",
            body: JSON.stringify({ ...result, revision: note.revision }),
          }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      setProgress("");
    }
  }
  async function remove() {
    setBusy("delete");
    try {
      await api(`/${note.id}`, { method: "DELETE" });
      onDelete(note.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function setDate() {
    const time = new Date(reminder).getTime();
    if (!Number.isFinite(time) || time <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    setBusy("reminder");
    if (await change({ reminderAt: time })) setShowReminder(false);
    setBusy("");
  }
  function calendar() {
    download(
      makeCalendar(note, location.origin),
      "text/calendar;charset=utf-8",
      "murmur-reminder.ics",
    );
  }
  const stale = note.summary && note.summaryRevision !== note.revision;
  return (
    <Modal onClose={onClose} label={note.title} wide>
      <div className="detail-topline">
        <span className="note-date">{dateLabel(note.createdAt)}</span>
        <button
          className={`icon-button ${note.favorite ? "is-favourite" : ""}`}
          aria-label={
            note.favorite ? "Remove from favourites" : "Add to favourites"
          }
          onClick={() => change({ favorite: !note.favorite })}
        >
          <Star size={20} fill={note.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      {rename ? (
        <form
          className="rename-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await change({ title })) setRename(false);
          }}
        >
          <input
            aria-label="Thought title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <button className="small-button" type="submit">
            Save
          </button>
        </form>
      ) : (
        <button
          className="title-button"
          onClick={() => setRename(true)}
          title="Rename thought"
        >
          <h2>{note.title}</h2>
          <Pencil size={15} />
        </button>
      )}
      <p className="detail-meta">
        {note.thoughts.length}{" "}
        {note.thoughts.length === 1 ? "thought" : "thoughts"} <span>·</span>{" "}
        {durationLabel(note.thoughts.reduce((s, t) => s + t.duration, 0))}{" "}
        recorded
      </p>
      <div className="detail-toolbar">
        <button
          className="secondary-button"
          onClick={() => setShowReminder(!showReminder)}
        >
          <Bell size={16} />
          {note.reminderAt ? "Edit reminder" : "Revisit later"}
        </button>
        <button
          className="secondary-button"
          disabled={!!busy || !note.thoughts.some((t) => t.transcript)}
          onClick={summarise}
        >
          <Sparkles size={16} />
          {busy === "summary"
            ? "Summarising…"
            : note.summary
              ? "Refresh summary"
              : "Summarise"}
        </button>
      </div>
      {note.reminderAt && (
        <div
          className={`reminder-banner ${note.reminderAt < Date.now() ? "due" : ""}`}
        >
          <Bell size={16} />
          <span>
            {note.reminderAt < Date.now() ? "Ready to revisit · " : ""}
            {dateLabel(note.reminderAt)}
          </span>
          <button className="text-button" onClick={calendar}>
            <CalendarPlus size={14} /> Add to calendar
          </button>
          <button
            className="icon-button"
            aria-label="Clear reminder"
            onClick={() => change({ reminderAt: null })}
          >
            <Check size={17} />
          </button>
        </div>
      )}
      {showReminder && (
        <div className="reminder-form">
          <label className="field-label" htmlFor="reminder-date">
            When would you like to return?
          </label>
          <input
            id="reminder-date"
            type="datetime-local"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
          <div className="quick-dates">
            {[
              ["In an hour", 3600000],
              ["Tomorrow", 86400000],
              ["In a week", 604800000],
            ].map(([label, ms]) => (
              <button
                key={label}
                className="small-button"
                onClick={() => {
                  const d = new Date(Date.now() + Number(ms));
                  setReminder(
                    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16),
                  );
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="helper">
            Due reminders appear in your notebook. Browser alerts work while
            Murmur is open; add to your calendar for a reminder when it’s
            closed.
          </p>
          <button
            className="primary-button"
            onClick={setDate}
            disabled={!!busy || !reminder}
          >
            Save reminder
          </button>
        </div>
      )}
      <div className="detail-tabs" role="tablist" aria-label="Thought content">
        <button
          role="tab"
          aria-selected={tab === "thoughts"}
          onClick={() => setTab("thoughts")}
        >
          The thought <span>{note.thoughts.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "summary"}
          onClick={() => setTab("summary")}
        >
          <Sparkles size={14} /> The essentials
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tab === "thoughts" ? (
        <div className="thought-timeline">
          {note.thoughts.map((t, i) => (
            <article className="timeline-item" key={t.id}>
              <div className="timeline-pin">
                <Feather size={14} />
              </div>
              <div className="timeline-content">
                <div className="timeline-label">
                  <strong>
                    {i === 0 ? "The first thought" : "A little more"}
                  </strong>
                  <time>{dateLabel(t.createdAt)}</time>
                </div>
                <Transcript
                  key={t.id + ":" + t.transcript}
                  thought={t}
                  cloudAI={cloudAI}
                  note={note}
                  onUpdate={onUpdate}
                />
              </div>
            </article>
          ))}
          <div className="followup-area">
            {recording ? (
              <>
                <p className="processing-note">
                  {cloudAI
                    ? "This recording will be transcribed with OpenRouter."
                    : "Transcription runs on your device."}
                </p>
                <Recorder
                  shortcutHeld={shortcutHeld}
                  compact
                  onError={setError}
                  onCapture={(c) => {
                    setRecording(false);
                    onFollow(c);
                  }}
                />
              </>
            ) : (
              <>
                <button
                  className="followup-button"
                  onClick={() => setRecording(true)}
                >
                  <Feather size={18} /> Add another thought
                </button>
                <button className="text-button" onClick={() => onFollow(null)}>
                  or write it down
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="summary-content">
          {busy === "summary" ? (
            <div className="ai-loading">
              <LoaderCircle className="spin" size={24} />
              <h3>Finding the heart of it…</h3>
              <p>
                {progress ||
                  "Reading your thoughts and gathering the next steps."}
              </p>
            </div>
          ) : note.summary ? (
            <>
              <div className="summary-heading">
                <Sparkles size={18} />
                <h3>In a few words</h3>
                {stale && (
                  <span className="status-tag">New thoughts added</span>
                )}
              </div>
              <p className="summary-paragraph">{note.summary}</p>
              {stale && (
                <p className="helper">
                  This summary is from an earlier version. Refresh it to include
                  your latest thoughts.
                </p>
              )}
              <div className="summary-heading actions-heading">
                <Check size={18} />
                <h3>A little next step</h3>
              </div>
              {note.actions.length ? (
                <div className="action-list">
                  {note.actions.map((a) => (
                    <label
                      className={`action-row ${a.done ? "done" : ""}`}
                      key={a.id}
                    >
                      <input
                        type="checkbox"
                        checked={a.done}
                        onChange={() =>
                          change({ action: { id: a.id, done: !a.done } })
                        }
                      />
                      <span>{a.text}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No action items in this thought. Some ideas just need a place
                  to be.
                </p>
              )}
              <p className="ai-footnote">
                AI can miss things. Your original thoughts are always here.
              </p>
            </>
          ) : (
            <div className="empty-summary">
              <Sparkles size={28} />
              <h3>Let’s find the essentials.</h3>
              <p>
                A short summary and any next steps, drawn from this whole
                thread.
              </p>
              <button
                className="primary-button"
                disabled={!note.thoughts.some((t) => t.transcript)}
                onClick={summarise}
              >
                Summarise this idea
              </button>
              {!cloudAI && (
                <p className="helper">
                  On-device AI downloads a model on first use.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="detail-footer">
        <button
          className="text-button"
          onClick={() =>
            download(
              `# ${note.title}\n\n${note.thoughts.map((t) => `${dateLabel(t.createdAt)}\n${t.transcript}`).join("\n\n")}\n\nSummary\n${note.summary}\n\nAction items\n${note.actions.map((a) => `[${a.done ? "x" : " "}] ${a.text}`).join("\n")}`,
              "text/plain;charset=utf-8",
              "murmur-thought.txt",
            )
          }
        >
          <Download size={15} /> Export thought
        </button>
        {confirmDelete ? (
          <div className="delete-confirm">
            <span>Delete this whole idea?</span>
            <button
              className="text-button"
              onClick={() => setConfirmDelete(false)}
            >
              Keep
            </button>
            <button
              className="text-button danger"
              disabled={!!busy}
              onClick={remove}
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : (
          <button
            className="text-button danger"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
    </Modal>
  );
}
