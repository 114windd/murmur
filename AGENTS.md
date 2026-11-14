# Murmur
Next.js voice notebook on Vercel, with Neon Postgres/managed auth, private Vercel Blob, and OpenRouter.

- Install: npm ci. Dev: npm run dev (5173). Verify: npm test; npm run typecheck; npm run build. Migrate: npm run db:migrate.
- app/ and components/ hold UI; lib/api.ts holds notebook routes; lib/storage.ts adapts Postgres and private Blob; lib/auth/ owns verified owner access. db/postgres/ migrations are immutable after application.
- Preserve the white/lavender/plum palette, illustrated clouds, keyboard access and reduced-motion support. Hold R outside editable fields to record; release or blur stops.
- Scope every operation to the verified server session and OWNER_EMAIL. Never trust a client owner ID or render note/model HTML.
- audio_uploads plus the thoughts foreign key serialize attachment creation against draft deletion. Only clean newly uploaded files after failed saves; preserve staged files on uncertain saves.
- Keep all keys, passwords, cookies, recordings and note contents out of logs, source and verification screenshots. Private .env.local and runtime state stay ignored.
- CI uses non-routable build fixtures and never calls external services. Integration checks are explicit and use disposable data. See docs/plans/murmur.md.
