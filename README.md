# comercium

Comercium is a Bun workspace with a TanStack Start frontend and an Elysia API.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## ERP assistant

The authenticated ERP includes a help assistant backed by the Comercium guides in
`backend/knowledge`. It uses OpenRouter for chat completions and embeddings.

For local development, copy `backend/.env.example` to `backend/.env.local` and
set `OPENROUTER_API_KEY`. The backend indexes changed help documents into the
shared master database on startup. Assistant questions are not persisted.
