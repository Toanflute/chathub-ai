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

Open `/knowledge` for provider configuration and website knowledge ingestion. Open `/workflows` to create automations, use the built-in "Trợ lý AI trả lời khách 24/7" template, and edit graphs with React Flow. Configure and enable an AI provider in `/knowledge` to use Workflow Copilot.

Workflow APIs validate graph node/edge types and cap graph size. AI-generated changes are shown as a proposal; they are not applied until explicitly accepted in the editor. Protect all admin APIs with authentication and authorization before public deployment.

The Prisma schema declares the PostgreSQL `vector` extension and stores embeddings as `vector(1536)`. Similarity search over Prisma's `Unsupported` field requires parameterized raw SQL. Do not expose AI API keys; encrypt them at rest before production use.

## API routes

- `GET/POST /api/settings` — retrieve masked provider configuration and test/save it.
- `GET/POST/PATCH/DELETE /api/knowledge/groups` — manage knowledge groups.
- `POST /api/crawler` — crawl one page or same-domain pages and return a preview.
- `POST /api/knowledge/save` — create embeddings and persist documents/chunks.
- `GET/POST /api/workflows` — list and create workflows or the 24/7 assistant template.
- `GET/PATCH/DELETE /api/workflows/:id` — retrieve, update, activate/deactivate, and delete workflows.
- `POST /api/workflows/copilot` — return a validated AI-proposed graph from the current graph and a Vietnamese instruction.

## Scripts

- `npm run dev` — start Next.js in development
- `npm run build` — generate Prisma Client and build the app
- `npm run db:migrate` — create/apply a development migration
- `npm run db:studio` — open Prisma Studio
