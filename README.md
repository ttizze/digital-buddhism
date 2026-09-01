# Digital Buddhism

A Cloudflare Worker for reading and translating the Pali Tipiṭaka with annotations.

## Quick start (development)
Run all project toolchain commands below inside `nix develop`.
Supported systems are Apple silicon macOS and aarch64/x86_64 Linux. Intel macOS is unsupported because the pinned nixpkgs release no longer supports `x86_64-darwin`.

```bash
nix develop
```

1. Install dependencies
   ```bash
   bun install
   ```
2. Prepare optional integrations
   ```bash
   cp .env.example .env.local
   ```
   Core local development works without editing this file. Configure only the
   authentication, translation, or analytics services you need.
3. Start dev server
   ```bash
   bun run dev
   ```
   The development command starts Nix-managed `sqld` on
   `http://127.0.0.1:18080` and persists it under
   `.data/digital-buddshim.sqld`. DB, import, read-model commands, and the local
   Worker share that database. Local commands reject file and external URLs.
	 The Cloudflare Vite plugin runs the local Worker runtime. KV and Queue
   use the bindings in `wrangler.jsonc`; their local state is persisted under
   `.wrangler/state`.
4. Open `http://localhost:3000`

The repository does not contain Tipiṭaka source text. To populate a local DB,
prepare the source described in `scripts/tipitaka-import/TIPITAKA_IMPORT.md` and
run `bun run tipitaka`. The import also updates the local Workers KV read model.
If the DB is already populated and only KV needs rebuilding, run
`bun run tipitaka:read-model`.

## Checks

Run the repository checks inside `nix develop`:

```bash
bun run lint
bun run typecheck
bun run doctor
```

`bun run doctor` adds React-specific correctness, accessibility, performance, and
maintainability diagnostics. It exits non-zero when React Doctor reports an
error; use `bun run doctor --blocking none` for an advisory-only full scan.

Production keeps the source of truth in Turso (libSQL) and serves public Tipiṭaka pages from the `TIPITAKA_READ_MODELS` Workers KV binding.
Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` through the deployment secret manager; do not commit either value.
Production also requires a random `BETTER_AUTH_SECRET` of at least 32
characters. Google sign-in requires both `AUTH_GOOGLE_ID` and
`AUTH_GOOGLE_SECRET`; Magic Link is enabled when `AUTH_RESEND_KEY` is set.
Use `bun run tipitaka:read-model:remote` only with an explicitly configured
production Turso connection to update the production KV namespace.

Production translations use the Gemini Developer API through Google's official
GenAI SDK. Configure the server-side API key as a Cloudflare Worker secret:

```bash
wrangler secret put GEMINI_API_KEY
```

Do not commit the key or expose it to browser code.

## Key links

- Docs entry: `docs/README.md`
- AI context: `AI_CONTEXT.md`
- AI rules: `AGENTS.md`

## Repo structure (summary)

- `src/routes`: TanStack Start routes
- `src/app`: Shared implementation during the migration
- `src/db`: Kysely connection, database types, and local SQLite helpers
- `src/drizzle`: SQLite/Turso schema and migrations
- `src/components`: Shared UI

See `docs/architecture/architecture.md` for details.
