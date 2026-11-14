# Murmur delivery

Profile: high risk because owner authentication, private recordings, external AI and durable storage cross trust boundaries. No image/release packaging overlay.

Outcome: a personal browser notebook with a white and muted violet aesthetic. Capture audio by holding the microphone or R, retain audio and editable transcripts, attach chronological follow-ups, summarise complete threads with explicit action items, search saved ideas, favourite them, and schedule reminders with calendar export. It must work on phone and desktop.

Architecture: Next.js on Vercel, managed Neon auth, owner-scoped Postgres records, private Vercel Blob uploads, and server-side OpenRouter. Browser AI fallback runs downloaded public models. Reminder records persist; the app surfaces them when due, and calendar export supports closed-app reminders.

Simplicity checkpoint: one application, one persistence adapter, one recorder and one AI worker. Official platform SDKs justify their dependency cost; no speculative services, custom OAuth, scheduler or global state library.

Acceptance: hold/release and keyboard input work; microphone tracks stop on release/blur; transcription can be cancelled without losing the audio; summaries include all transcribed follow-ups and do not silently omit recordings; stale summaries and concurrent updates cannot overwrite new content; recordings remain private and durable; deleting a draft cannot erase an attached recording; reminders, calendar output, search and favourites work; layouts and dialogs remain accessible.

Verification: Node behavior tests with failing regressions before fixes, TypeScript and production build, disposable real Postgres/Blob race checks, authenticated API checks, browser recording/transcription/summary/reminder flows, desktop/mobile screenshots, and independent correctness/security/maintainability review. CI validates deterministic tests and build without production credentials.

Security: managed verified identity and server owner allowlist, exact-origin mutation checks, bounded request streams, path/type/size-limited upload grants, a foreign key protecting attachments, no rendered user HTML or secrets in client code. Applied initial migrations target a new empty database. Rollback redeploys a prior verified version while retaining records and recordings.
