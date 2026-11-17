# ChatHub AI

Next.js App Router starter for an AI customer-support platform with a PostgreSQL/pgvector data model.

## Requirements

- Node.js 20+
- PostgreSQL with the `vector` (pgvector) extension installed/enabled

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL in .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open `/knowledge` to configure the provider and ingest website knowledge. Open `/workflows` to create and activate a flow. On the home page, use the bottom-right chat bubble to test it; the API stores conversations and message history, traverses the active graph, and uses pgvector retrieval for configured AI Agent nodes.

The chat API runs the most recently updated active workflow. Configure and enable an AI provider and use an embedding model that returns 1536 dimensions. RAG only searches active documents in the groups selected on the AI Agent node. The widget renders assistant Markdown without enabling raw HTML.

Before deploying publicly, add authentication for admin APIs, plus production-grade rate limiting/abuse protection and encrypt stored AI credentials. Public chat is intended as a demo until those protections are configured.

## API routes

- `GET/POST /api/settings` — retrieve masked provider configuration and test/save it.
- `GET/POST/PATCH/DELETE /api/knowledge/groups` — manage knowledge groups.
- `POST /api/crawler` — crawl one page or same-domain pages and return a preview.
- `POST /api/knowledge/save` — create embeddings and persist documents/chunks.
- `GET/POST /api/workflows` — list and create workflows or the 24/7 assistant template.
- `GET/PATCH/DELETE /api/workflows/:id` — retrieve, update, activate/deactivate, and delete workflows.
- `POST /api/workflows/copilot` — return a validated AI-proposed graph from the current graph and a Vietnamese instruction.
- `GET/POST /api/chat` — load visitor conversation history and execute a turn through the active workflow and RAG agent.

## Scripts

- `npm run dev` — start Next.js in development
- `npm run build` — generate Prisma Client and build the app
- `npm run db:migrate` — create/apply a development migration
- `npm run db:studio` — open Prisma Studio
