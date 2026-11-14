CREATE TABLE IF NOT EXISTS notes (
 id text PRIMARY KEY,owner_id text NOT NULL,title text NOT NULL,
 favorite integer NOT NULL DEFAULT 0,summary text NOT NULL DEFAULT '',actions text NOT NULL DEFAULT '[]',
 reminder_at double precision,revision integer NOT NULL DEFAULT 1,version integer NOT NULL DEFAULT 1,
 summary_revision integer,created_at double precision NOT NULL,updated_at double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS notes_owner_updated ON notes(owner_id,updated_at);
CREATE TABLE IF NOT EXISTS thoughts (
 id text PRIMARY KEY,note_id text NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
 transcript text NOT NULL DEFAULT '',audio_key text,mime text,duration double precision NOT NULL DEFAULT 0,created_at double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS thoughts_note ON thoughts(note_id);
