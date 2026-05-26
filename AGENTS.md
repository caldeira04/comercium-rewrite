# Repository Guidelines

## Project Structure & Module Organization

This is a Bun workspace with separate frontend and backend packages.

- `frontend/`: TanStack Start + React application. Source lives in
  `frontend/src`, with routes under `src/routes`, shared UI in
  `src/components/ui`, feature components in `src/components`, hooks in
  `src/hooks`, and static files in `frontend/public`.
- `backend/`: Bun + Elysia API. Entry point is `backend/src/index.ts`; domain
  services are in `src/domain`, route modules in `src/routes`, database schema
  in `src/db/schema`, and Drizzle migrations/config in `backend/drizzle`.
- `bun.lock`: shared dependency lockfile. Use Bun commands.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies.
- `bun run dev`: start frontend on `http://localhost:5173` and backend on
  `http://localhost:3000`.
- `bun run --cwd frontend build`: build the frontend.
- `bun run --cwd frontend typecheck`: run TypeScript checks for the frontend.
- `bun run --cwd frontend lint`: run the TanStack ESLint config.
- `bun run --cwd frontend test`: run Vitest tests.
- `bun run --cwd backend dev`: run the API in watch mode.
- `bun run --cwd backend db:master:migrate` and
  `bun run --cwd backend db:tenant:migrate:all`: apply Drizzle migrations.

## Coding Style & Naming Conventions

Use TypeScript, ESM imports, and aliases such as `@/components/ui/button` where
configured. Prettier in `frontend/.prettierrc` uses 2 spaces, double quotes, no
semicolons, LF endings, ES5 trailing commas, and Tailwind class sorting. Prefer
PascalCase for React components and service classes, camelCase for functions and
variables, and kebab-case filenames when matching current frontend patterns.

## Testing Guidelines

Frontend tests use Vitest with Testing Library dependencies available. Place
tests near covered code as `*.test.ts` or `*.test.tsx`, and run
`bun run --cwd frontend test`. Backend automated tests are not configured yet;
`bun run --cwd backend test` is a placeholder that exits with an error.

## Commit & Pull Request Guidelines

History mixes short informal commits with conventional `feat:` commits. Prefer
clear imperative subjects using `feat:`, `fix:`, or `chore:` when applicable,
for example `feat: add cash summary filters`. Pull requests should describe the
change, list verification commands, link issues, mention migration impact, and
include screenshots or recordings for visible UI changes.

## Security & Configuration Tips

Keep local secrets out of git; backend local environment files belong in
`backend/.env.local`. Review migrations before applying them, especially tenant
migrations that can affect multiple databases.
