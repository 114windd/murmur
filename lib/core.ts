import { z } from "zod";

export type ActionItem = { id: string; text: string; done: boolean };
export type Thought = {
  id: string;
  transcript: string;
  audioKey: string | null;
  mime: string | null;
  duration: number;
  createdAt: number;
};
export type Note = {
  id: string;
  title: string;
  favorite: boolean;
  summary: string;
  actions: ActionItem[];
  reminderAt: number | null;
  revision: number;
  version: number;
  summaryRevision: number | null;
  createdAt: number;
  updatedAt: number;
  thoughts: Thought[];
};
export type View = "all" | "favourites" | "reminders" | "actions";
export class UserInputError extends Error {}
export function upsertNote(notes: Note[], note: Note): Note[] {
  const current = notes.find((n) => n.id === note.id);
  if (current && current.version > note.version) return notes;
  return [note, ...notes.filter((n) => n.id !== note.id)].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

const thoughtSchema = z.object({
  transcript: z.string().trim().max(30000),
  duration: z.coerce.number().min(0).max(600).default(0),
});
export function validateThought(value: unknown, hasAudio = false) {
  const result = thoughtSchema.parse(value);
  if (!result.transcript && !hasAudio)
    throw new UserInputError("Add a thought or a recording first.");
  return result;
}
export function validateSummary(value: unknown) {
  return z
    .object({
      summary: z.string().trim().min(1).max(12000),
      actions: z.array(z.string().trim().min(1).max(500)).max(30),
    })
    .parse(value);
}
export function validateReminder(value: unknown): number | null {
  if (value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= Date.now()
  )
    throw new UserInputError("Choose a future date and time.");
  return value;
}
type Searchable = Pick<
  Note,
  "title" | "favorite" | "reminderAt" | "summary"
> & {
  actions: { text: string; done: boolean }[];
  thoughts: { transcript: string }[];
};
export function selectNotes<T extends Searchable>(
  notes: T[],
  view: View,
  query: string,
): T[] {
  const q = query.toLocaleLowerCase().trim();
  return notes.filter(
    (n) =>
      (view !== "favourites" || n.favorite) &&
      (view !== "reminders" || n.reminderAt !== null) &&
      (view !== "actions" || n.actions.some((a) => !a.done)) &&
      (!q ||
        [
          n.title,
          n.summary,
          ...n.thoughts.map((t) => t.transcript),
          ...n.actions.map((a) => a.text),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q)),
  );
}
export function noteTitle(transcript: string) {
  const line = transcript.split(/[.!?\n]/)[0].trim();
  return line
    ? line.length > 65
      ? line.slice(0, 62) + "…"
      : line
    : "A spoken thought";
}
export function makeCalendar(
  note: {
    id: string;
    title: string;
    reminderAt: number | null;
    summary: string;
  },
  origin: string,
) {
  if (!note.reminderAt) throw new Error("Set a reminder first.");
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const date = (n: number) =>
    new Date(n)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Murmur//Notebook//EN",
    "BEGIN:VEVENT",
    `UID:${note.id}@murmur`,
    `DTSTAMP:${date(Date.now())}`,
    `DTSTART:${date(note.reminderAt)}`,
    `DTEND:${date(note.reminderAt + 15 * 60000)}`,
    `SUMMARY:${escape(note.title)}`,
    `DESCRIPTION:${escape(note.summary || "Return to this thought in Murmur.")}\\n${escape(origin + "/?note=" + encodeURIComponent(note.id))}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    "DESCRIPTION:Return to your thought",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Fold long UTF-8 lines without splitting a Unicode code point.
  return (
    lines
      .map((line) => {
        let out = "",
          part = "";
        for (const ch of line) {
          if (new TextEncoder().encode(part + ch).length > 73) {
            out += part + "\r\n ";
            part = "";
          }
          part += ch;
        }
        return out + part;
      })
      .join("\r\n") + "\r\n"
  );
}
