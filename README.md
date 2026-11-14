# Murmur

A private voice notebook with a white and soft-violet interface. Hold the microphone or hold **R** outside a text field, speak, and release. Review the automatic transcript and save it. Add voice or written follow-ups to an idea, summarise the whole thread, and keep any action items together.

Features include search, favourites, editable transcripts, audio playback, reminders, calendar export, and note export. Browser alerts work while the app is open; calendar events support reminders when it is closed.

## Stack and configuration

Next.js, managed Neon authentication and Postgres, private Vercel Blob, and OpenRouter. Only the verified account configured by `OWNER_EMAIL` can access the notebook. Audio uploads use short-lived grants constrained to the owner's private path, permitted media types and size. Secrets stay on the server.

Copy `.env.example` to a private `.env.local`, fill the server values, then run `npm ci`, `npm run db:migrate`, and `npm run dev` (port 5173). Configure the app's exact HTTPS domain in Neon's trusted domains; local IP addresses such as 127.0.0.1 also need their own entry. The authentication UI uses email verification codes with Neon's shared email provider.

`npm test` runs deterministic tests. `npm run typecheck` checks TypeScript. `npm run build` makes the production build. Real Postgres/Blob integration checks use `MURMUR_PLATFORM_TEST=1 node --env-file=.env.local --experimental-strip-types --test tests/postgres.test.ts` with disposable fixtures. The authenticated API suite additionally requires private `MURMUR_TEST_URL` and `MURMUR_TEST_COOKIE` environment values. Never print or commit credentials or session cookies.

Deploy through the connected Vercel project. Its runtime environment must contain the server values listed in `.env.example`. Apply immutable SQL migrations using `npm run db:migrate` before publishing a version that requires them.
