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
2. Prepare environment variables
   ```bash
   cp .env.example .env
   openssl rand -base64 32
   ```
   Put the generated string into `.env`.
3. Start dev server
   ```bash
   bun run dev
   ```
   The development command creates an isolated temporary SQLite database and
   applies the checked-in Turso migration and seed before starting the server.
   Docker, PostgreSQL, and a manual seed are not required for local development.
4. Open `http://localhost:3000`

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
Run `bun run tipitaka:read-model` before local Tipiṭaka display work, or run `bun run tipitaka:read-model --remote` to update the production KV namespace.

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
