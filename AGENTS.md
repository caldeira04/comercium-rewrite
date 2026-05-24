# Agent Notes

## Repo Shape

- Bun workspace: root `package.json` has `workspaces: ["backend/", "frontend/"]`.
- Frontend is TanStack Start + React + Vite in `frontend/`; routes live in `frontend/src/routes`, shadcn UI components in `frontend/src/components/ui`, generated route tree in `frontend/src/routeTree.gen.ts`.
- Backend is Elysia on Bun in `backend/`; entrypoint is `backend/src/index.ts`, master routes are under `/master`, tenant routes are under `/tenant`.
- Backend uses two Drizzle/SQLite schemas: master schema at `backend/src/db/schema/master`, tenant schema at `backend/src/db/schema/tenant`.

## Commands

- Install from repo root with `bun install`.
- Run both apps from root with `bun run dev`; this starts frontend and backend concurrently.
- Frontend dev server: `bun run --cwd frontend dev` on port `5173`.
- Backend dev server: `bun run --cwd backend dev` on port `3000`; CORS currently allows `http://localhost:5173`.
- Frontend checks: `bun run --cwd frontend lint`, `bun run --cwd frontend typecheck`, `bun run --cwd frontend test`, `bun run --cwd frontend build`.
- There is no usable backend test suite yet; `bun run --cwd backend test` intentionally exits with an error.

## Frontend Notes

- Use the `@/*` alias inside `frontend` for `frontend/src/*` imports.
- Do not edit `frontend/src/routeTree.gen.ts`; TanStack Router regenerates it.
- Frontend formatting is `frontend/.prettierrc`: 2 spaces, no semicolons, double quotes, ES5 trailing commas, 80-column width, Tailwind class sorting via `prettier-plugin-tailwindcss`.
- shadcn is configured by `frontend/components.json` with style `radix-nova`; add/use UI primitives under `frontend/src/components/ui` and import as `@/components/ui/...`.

## Backend And Data Notes

- Master DB path is `backend/data/master.sqlite`; tenant DBs are expected in `backend/data/tenants/<tenantSlug>.sqlite`.
- `backend/src/db/db.ts` throws at startup if `backend/data/master.sqlite` is missing; run master migrations before starting a fresh backend.
- Migration commands are split by DB: `bun run --cwd backend db:master:generate`, `bun run --cwd backend db:master:migrate`, `bun run --cwd backend db:tenant:generate`, `bun run --cwd backend db:tenant:migrate`.
- `bun run --cwd backend db:tenant:migrate` targets `backend/data/tenant-template.sqlite`; `bun run --cwd backend db:tenant:migrate:all` applies tenant migrations to every SQLite file in `backend/data/tenants`.
- `backend/data/*` and local env files are ignored; do not commit local SQLite databases or secrets.
