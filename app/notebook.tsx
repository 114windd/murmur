"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Feather,
  BookOpen,
  Bell,
  Star,
  ListTodo,
  Settings2,
  X,
  ArrowUpRight,
  Plus,
  LayoutGrid,
  List,
  Check,
  Sparkles,
  Headphones,
  LockKeyhole,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { CloudMark, CloudGarden, LittleHouse } from "@/components/art";
import { Recorder, type Capture } from "@/components/recorder";
import { Composer } from "@/components/composer";
import { NoteDetail } from "@/components/note-detail";
import { Modal } from "@/components/modal";
import { api, dateLabel, durationLabel } from "@/lib/client";
import { isRecordKey } from "@/lib/platform-rules";
import { selectNotes, upsertNote, type Note, type View } from "@/lib/core";
const nav = [
  { id: "all", label: "All thoughts", icon: BookOpen },
  { id: "reminders", label: "Revisit later", icon: Bell },
  { id: "actions", label: "Little next steps", icon: ListTodo },
  { id: "favourites", label: "Favourites", icon: Star },
] as const;
export default function Notebook({ displayName }: { displayName: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [composer, setComposer] = useState<{
    capture: Capture | null;
    noteId: string | null;
  } | null>(null);
  const [cloudAI, setCloudAI] = useState(false);
  const [settings, setSettings] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("recent");
  const [now, setNow] = useState(Date.now());
  const [shortcutHeld, setShortcutHeld] = useState(false);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing =
        target.isContentEditable ||
        !!target.closest('input,textarea,select,[contenteditable="true"]');
      if (
        event.defaultPrevented ||
        document.querySelector("dialog[open]") ||
        !isRecordKey(event, editing)
      )
        return;
      event.preventDefault();
      setView("all");
      setShortcutHeld(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "KeyR") {
        event.preventDefault();
        setShortcutHeld(false);
      }
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
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [ns, status] = await Promise.all([
        api<Note[]>(),
        api<{ cloudAI: boolean }>("/status"),
      ]);
      setNotes(ns);
      setCloudAI(status.cloudAI);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    setActive(new URLSearchParams(location.search).get("note"));
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    for (const n of notes) {
      if (n.reminderAt && n.reminderAt <= now) {
        const key = `murmur-alert-${n.id}-${n.reminderAt}`;
        if (!sessionStorage.getItem(key)) {
          new Notification("A thought is ready to revisit", {
            body: n.title,
            tag: n.id,
            icon: "/favicon.svg",
          });
          sessionStorage.setItem(key, "1");
        }
      }
    }
  }, [notes, now]);
  const update = (n: Note) => setNotes((prev) => upsertNote(prev, n));
  const selected = notes.find((n) => n.id === active);
  const due = notes.filter((n) => n.reminderAt && n.reminderAt <= now);
  const filtered = useMemo(() => {
    const result = selectNotes(notes, view, query);
    return [...result].sort((a, b) =>
      sort === "oldest"
        ? a.createdAt - b.createdAt
        : sort === "reminder"
          ? (a.reminderAt || Infinity) - (b.reminderAt || Infinity)
          : b.updatedAt - a.updatedAt,
    );
  }, [notes, view, query, sort]);
  const openNote = (id: string) => {
    setActive(id);
    history.replaceState(null, "", "/?note=" + encodeURIComponent(id));
  };
  const closeNote = () => {
    setActive(null);
    history.replaceState(null, "", "/");
  };
  function save(n: Note) {
    update(n);
    setComposer(null);
    openNote(n.id);
    setToast(
      composer?.noteId
        ? "Another thought, kept safe."
        : "A thought, kept safe.",
    );
  }
  const counts = {
    all: notes.length,
    reminders: notes.filter((n) => n.reminderAt).length,
    actions: notes.reduce(
      (s, n) => s + n.actions.filter((a) => !a.done).length,
      0,
    ),
    favourites: notes.filter((n) => n.favorite).length,
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Murmur home">
          <CloudMark />
          <span>
            murmur<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-heading">Your little notebook</div>
        <nav aria-label="Notebook">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => {
                setView(item.id);
                setQuery("");
              }}
            >
              <item.icon size={19} strokeWidth={1.6} />
              <span>{item.label}</span>
              {counts[item.id] > 0 && (
                <span className="nav-count">{counts[item.id]}</span>
              )}
            </button>
          ))}
        </nav>
        <button
          className="sidebar-new"
          onClick={() => setComposer({ capture: null, noteId: null })}
        >
          <Plus size={17} /> Write a thought
        </button>
        <div className="sidebar-bottom">
          <LittleHouse />
          <p>
            A home for the things
            <br />
            you don’t want to forget.
          </p>
          <button
            className="sidebar-settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={17} />
            <span>Make yourself at home</span>
          </button>
          <div className="profile">
            <div className="avatar">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>
                {displayName === "Seedy"
                  ? "Your notebook"
                  : displayName.split(" ")[0] + "’s notebook"}
              </strong>
              <span>
                <LockKeyhole size={10} /> Just for you
              </span>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <BookOpen size={15} />
            <span>Your notebook</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{nav.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <LockKeyhole size={13} /> A private little space
            </span>
            <button
              className="mobile-settings icon-button"
              aria-label="Settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={19} />
            </button>
          </div>
        </header>
        <div className="main-content">
          <div className="welcome">
            <div>
              <div className="greeting">
                <span className="greeting-line" /> Room for a little reflection
              </div>
              <h1>
                {view === "all"
                  ? "What’s on your mind?"
                  : view === "reminders"
                    ? "Some thoughts are worth a return."
                    : view === "actions"
                      ? "One little step at a time."
                      : "The thoughts you keep close."}
              </h1>
              <p>
                {view === "all"
                  ? "Catch a thought before it drifts away."
                  : "Your ideas, with a little room to grow."}
              </p>
            </div>
            <div className="date-stamp">
              <span>
                {new Intl.DateTimeFormat("en", { weekday: "long" }).format(now)}
              </span>
              <strong>
                {new Intl.DateTimeFormat("en", {
                  day: "numeric",
                  month: "long",
                }).format(now)}
              </strong>
              <svg
                width="45"
                height="20"
                viewBox="0 0 45 20"
                aria-hidden="true"
              >
                <path
                  d="M2 13q11-12 20-3t21-4M11 19q10-8 19-2"
                  fill="none"
                  stroke="#C5B3D7"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          {view === "all" && (
            <section className="capture-panel" aria-label="Capture a thought">
              <div className="capture-copy">
                <span className="small-drawing">
                  <Feather size={22} strokeWidth={1.3} />
                </span>
                <h2>
                  Big ideas.
                  <br />
                  Little murmurs.
                </h2>
                <p>
                  You don’t have to make sense of it yet.
                  <br />
                  Just start talking.
                </p>
                <button
                  className="text-button write-instead"
                  onClick={() => setComposer({ capture: null, noteId: null })}
                >
                  <PencilIcon /> Or, write it down
                </button>
              </div>
              <Recorder
                shortcutHeld={shortcutHeld}
                onCapture={(c) => setComposer({ capture: c, noteId: null })}
                onError={setError}
              />
              <CloudGarden className="capture-art" />
            </section>
          )}
          {view === "all" && (
            <p className="processing-note">
              <LockKeyhole size={11} />
              {cloudAI
                ? "Recordings are transcribed with OpenRouter, then saved to your private notebook."
                : "Transcription runs on your device; the speech model downloads on first use."}
            </p>
          )}
          {due.length > 0 && view === "all" && (
            <button
              className="due-banner"
              onClick={() => {
                setView("reminders");
                setSort("reminder");
              }}
            >
              <span className="due-icon">
                <Bell size={18} />
              </span>
              <span>
                <strong>
                  {due.length === 1
                    ? "A thought is waiting for you."
                    : `${due.length} thoughts are ready to revisit.`}
                </strong>
                <span>A fresh look might be just what it needs.</span>
              </span>
              <ArrowUpRight size={18} />
            </button>
          )}
          <section className="notebook-section" aria-label="Saved thoughts">
            <div className="section-top">
              <div className="section-title">
                <h2>
                  {view === "all"
                    ? "Your thoughts"
                    : view === "reminders"
                      ? "Revisit later"
                      : view === "actions"
                        ? "Little next steps"
                        : "Your favourites"}
                </h2>
                <span>{filtered.length}</span>
              </div>
              <div className="list-tools">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    type="search"
                    placeholder="Find a thought…"
                    aria-label="Search thoughts"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="layout-switch" aria-label="Layout">
                  <button
                    aria-label="Grid view"
                    aria-pressed={layout === "grid"}
                    onClick={() => setLayout("grid")}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={layout === "list"}
                    onClick={() => setLayout("list")}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="section-subline">
              <p>
                {view === "all"
                  ? "A collection of your in-between moments."
                  : view === "reminders"
                    ? "A gentle nudge, whenever you need one."
                    : view === "actions"
                      ? "Small things to move your ideas forward."
                      : "A few ideas to hold on to."}
              </p>
              {notes.length > 0 && (
                <label className="sort-control">
                  <select
                    aria-label="Sort thoughts"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recent">Most recent</option>
                    <option value="oldest">Oldest first</option>
                    <option value="reminder">Reminder date</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
              )}
            </div>
            {error && (
              <div className="error-banner" role="alert">
                <span>{error}</span>
                <button
                  className="text-button"
                  onClick={() => {
                    setError("");
                    if (!notes.length) void load();
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading-state">
                <LoaderCircle className="spin" size={24} />
                <p>Opening your notebook…</p>
              </div>
            ) : filtered.length ? (
              <div className={`notes ${layout}`}>
                {filtered.map((n) => (
                  <article
                    className={`note-card ${n.favorite ? "favourite-card" : ""}`}
                    key={n.id}
                  >
                    <button
                      className="note-open"
                      onClick={() => openNote(n.id)}
                      aria-label={`Open ${n.title}`}
                    >
                      <div className="card-top">
                        <span className="note-type">
                          {n.thoughts.some((t) => t.audioKey) ? (
                            <Headphones size={14} />
                          ) : (
                            <Feather size={14} />
                          )}{" "}
                          {n.thoughts.some((t) => t.audioKey)
                            ? durationLabel(
                                n.thoughts.reduce((s, t) => s + t.duration, 0),
                              )
                            : "Written thought"}
                        </span>
                        <time>
                          {new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                          }).format(n.createdAt)}
                        </time>
                      </div>
                      <h3>{n.title}</h3>
                      <p>
                        {n.summary ||
                          n.thoughts.map((t) => t.transcript).join(" ") ||
                          "A little thought, captured in your voice."}
                      </p>
                      {view === "actions" && (
                        <div className="card-actions-preview">
                          {n.actions
                            .filter((a) => !a.done)
                            .slice(0, 2)
                            .map((a) => (
                              <div key={a.id}>
                                <span className="mini-checkbox" />
                                {a.text}
                              </div>
                            ))}
                        </div>
                      )}
                      <div className="card-bottom">
                        <span>
                          {n.thoughts.length > 1 ? (
                            <>
                              <Feather size={13} />
                              {n.thoughts.length} thoughts
                            </>
                          ) : n.summary ? (
                            <>
                              <Sparkles size={13} /> Summarised
                            </>
                          ) : (
                            <>
                              <span className="tiny-dot" /> Room to grow
                            </>
                          )}
                        </span>
                        {n.reminderAt && (
                          <span
                            className={`reminder-tag ${n.reminderAt < now ? "ready" : ""}`}
                          >
                            <Bell size={12} />
                            {n.reminderAt < now
                              ? "Ready to revisit"
                              : new Intl.DateTimeFormat(undefined, {
                                  month: "short",
                                  day: "numeric",
                                }).format(n.reminderAt)}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      className={`card-favourite icon-button ${n.favorite ? "is-favourite" : ""}`}
                      aria-label={
                        n.favorite
                          ? `Unfavourite ${n.title}`
                          : `Favourite ${n.title}`
                      }
                      onClick={async () => {
                        try {
                          update(
                            await api(`/${n.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ favorite: !n.favorite }),
                            }),
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      <Star
                        size={16}
                        fill={n.favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-notebook">
                {query ? (
                  <Search size={35} strokeWidth={1} />
                ) : view === "reminders" ? (
                  <Bell size={35} strokeWidth={1} />
                ) : view === "actions" ? (
                  <ListTodo size={35} strokeWidth={1} />
                ) : view === "favourites" ? (
                  <Star size={35} strokeWidth={1} />
                ) : (
                  <div className="empty-book">
                    <BookOpen size={40} strokeWidth={1} />
                    <span>✦</span>
                  </div>
                )}
                <h3>
                  {query
                    ? "That thought is still hiding."
                    : view === "reminders"
                      ? "Come back to a thought, in your own time."
                      : view === "actions"
                        ? "A little breathing room."
                        : view === "favourites"
                          ? "Keep a few favourites close."
                          : "Your first thought starts here."}
                </h3>
                <p>
                  {query
                    ? "Try a different word from the title, transcript, or summary."
                    : view === "reminders"
                      ? "Open a thought and choose “Revisit later” to set a gentle reminder."
                      : view === "actions"
                        ? "Summarise a thought to gather any next steps. No busywork added."
                        : view === "favourites"
                          ? "Tap the star on a thought to save it here."
                          : "Hold the microphone, or write something down. We’ll keep it safe."}
                </p>
                {view === "all" && !query && (
                  <button
                    className="text-button"
                    onClick={() => setComposer({ capture: null, noteId: null })}
                  >
                    Put your first thought on paper <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
            )}
          </section>
          <footer className="main-footer">
            <CloudMark small />
            <p>A little less in your head. A little more room to breathe.</p>
            <span>Made for your wandering mind.</span>
          </footer>
        </div>
      </main>
      {selected && !composer && (
        <NoteDetail
          key={selected.id}
          note={selected}
          cloudAI={cloudAI}
          onClose={closeNote}
          onUpdate={update}
          onDelete={(id) => {
            setNotes((ns) => ns.filter((n) => n.id !== id));
            closeNote();
            setToast("Thought deleted.");
          }}
          onFollow={(capture) => setComposer({ capture, noteId: selected.id })}
        />
      )}
      {composer && (
        <Composer
          cloudAI={cloudAI}
          capture={composer.capture}
          note={notes.find((n) => n.id === composer.noteId) || null}
          onClose={() => setComposer(null)}
          onSave={save}
        />
      )}
      {settings && (
        <Modal label="Make yourself at home" onClose={() => setSettings(false)}>
          <div className="dialog-symbol">
            <CloudMark small />
          </div>
          <h2>Make yourself at home.</h2>
          <p className="muted">A little space, just for you.</p>
          <div className="settings-row">
            <div>
              <strong>Your thoughts stay private</strong>
              <p>Saved to your account, including recordings and follow-ups.</p>
            </div>
            <LockKeyhole size={20} />
          </div>
          <div className="settings-row">
            <div>
              <strong>Summaries & next steps</strong>
              <p>
                {cloudAI
                  ? "OpenRouter is connected. Recordings are sent for automatic transcription. Note text is sent when you choose Summarise. Both use OpenRouter; you can edit transcripts before saving."
                  : "On-device AI is available. A model downloads on first use; notes are processed in your browser."}
              </p>
            </div>
            <span className="status-tag">
              {cloudAI ? "Connected" : "On device"}
            </span>
          </div>
          <div className="settings-row">
            <div>
              <strong>A gentle browser nudge</strong>
              <p>
                Receive due-reminder alerts while Murmur is open. Calendar
                export works when it’s closed.
              </p>
            </div>
            <button
              className="small-button"
              onClick={async () => {
                if (!("Notification" in window)) {
                  setToast(
                    "This browser does not support notifications. Use Add to calendar.",
                  );
                  return;
                }
                const result = await Notification.requestPermission();
                setToast(
                  result === "granted"
                    ? "Browser reminders are on."
                    : "You can still see reminders here and add them to your calendar.",
                );
                setNow(Date.now());
              }}
            >
              Enable
            </button>
          </div>
          <p className="helper">
            Hold R anywhere outside a text field to record. You can also use the
            microphone with your mouse, touch, Space, or Enter. Switch to tap
            mode if holding is uncomfortable.
          </p>
          <a
            className="text-button signout"
            href="/auth/sign-out"
            target="_top"
          >
            Sign out
          </a>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function PencilIcon() {
  return <Feather size={15} strokeWidth={1.5} />;
}
