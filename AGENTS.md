# StudyHub — Agent guide

This repo has a **web** app (Next.js 16) and a **mobile** app (Expo SDK 57).
Read the AGENTS.md inside each subdir before touching its code:

- [web/AGENTS.md](web/AGENTS.md) — flags Next.js 16 as "not the one you know".
- [mobile/AGENTS.md](mobile/AGENTS.md) — flags Expo SDK 57 as "read the versioned docs".

## One-app-at-a-time rule

The two apps have **incompatible Node + tooling** — do not mix them.

| | web | mobile |
|---|---|---|
| Node ≥ | 20.9 | 22.13 |
| Package manager | pnpm | npm |
| ORM / DB | Prisma + Postgres | none (consume web API) |
| Auth | Auth.js v5 (cookies) | Bearer JWT (same `AUTH_SECRET`) |

When switching context, re-read the relevant `AGENTS.md` and `package.json` first.
When you change the API contract, update **both** apps in the same change.

## Repository conventions

- Branch from `main`. No direct pushes.
- Commits: `<scope>: <imperative summary>` — examples:
  - `web: add tag autocomplete to note editor`
  - `mobile: show note timestamps in local TZ`
  - `docs: document Dokploy deploy steps`
- Don't commit `node_modules/`, `.next/`, `.env*`, `postgres-data/`.
- PR description should mention whether Dokploy build was validated.

## Self-host expectations

The whole point of this project is to deploy to Dokploy. Before merging anything
in `web/` that affects:

- the Dockerfile
- `docker/entrypoint.js`
- Prisma schema or migrations
- `next.config.ts` (especially `output: "standalone"`)

…verify locally with `cd web && docker compose up --build` and hitting
http://localhost:3000. If the image works locally, it'll work in Dokploy.

## Things to fix in-scope

If you touch a file and notice a broken or stale thing nearby (a clearly wrong
doc, an outdated `.env.example`, a missing migration step), fix it **in the same
PR**. Don't farm out obvious fixes.
