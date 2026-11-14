# Separate notebooks for friends

Lifecycle-ID: 152fc41b-f7af-4c96-8f84-27bb7cfb8d35

High risk: changes the authentication gate from one permitted email to any verified account. No release packaging overlay. The user chose public self-signup with email verification; this does not enable sharing notebooks.

Keep managed Neon registration, sessions and verification. Remove the single-email restriction from the auth proxy and verified-session gate. Notes, summaries, reminders, actions and private audio remain scoped to the trusted session user ID. Existing data stays under its original account; no migration or reassignment is needed. UI and setup docs should explain separate private notebooks.

Simplicity checkpoint: a small auth/UI/doc change, no runtime dependency, no new service, schema or sharing abstraction. Extend the existing Node runner with its built-in module mocking and SQLite for two-user handler integration tests; mock only the managed identity and storage boundaries.

Phases: commit this plan; reproduce refusal of a second verified user, implement self-signup and verify two-user isolation; independent correctness/security/quality review; exact-head required CI, one PR, merge/sync and production deploy.

Acceptance: two verified emails are accepted; missing and unverified identities are rejected; each account can create and list its own notes; a second account cannot read/change/delete another person's note, attach a follow-up, fetch its audio, transcribe or summarise it, or attach another account's staged recording. Auth requests for a different email reach the managed service. Existing owner access and all note behavior remain compatible.

Proof: deterministic tests, TypeScript/build, actual local auth proxy response for a non-owner synthetic email, and a sanitized final sign-up screenshot under artifacts/upload/friends-accounts.jpg. Real user passwords and verification codes remain user-controlled. Final UI captures use blank forms or synthetic data. Existing Postgres isolation/race evidence complements SQLite handler checks; no production data mutation is required.

Security and operations: identity always comes from the verified server session, never a client-supplied owner. Managed auth retains its rate limits and email checks. All users share the configured OpenRouter connection and storage services. Rollback redeploys the previous version to restore the single-account gate without changing or deleting records. No custom logging of identity or note contents is added.
