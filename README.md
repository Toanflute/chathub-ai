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

Open `/knowledge` to configure the provider, create knowledge groups, and crawl website pages for preview and embedding storage. The crawler limits domain crawls to 25 pages and applies public-address checks to reduce SSRF risk. Run this app only behind authentication/authorization before exposing its admin APIs to the internet.

The Prisma schema declares the PostgreSQL `vector` extension and stores document embeddings as `vector(1536)`. Similarity searches over this Prisma `Unsupported` field should be implemented with parameterized raw SQL. The current save endpoint requires an embedding model that returns exactly 1536 dimensions. Do not expose AI API keys; encrypt them at rest before production use.

## API routes

- `GET/POST /api/settings` — retrieve masked provider configuration and test/save it.
- `GET/POST/PATCH/DELETE /api/knowledge/groups` — manage knowledge groups.
- `POST /api/crawler` — crawl one page or same-domain pages and return a preview.
- `POST /api/knowledge/save` — create embeddings and persist documents/chunks.

## Scripts

- `npm run dev` — start Next.js in development
- `npm run build` — generate Prisma Client and build the app
- `npm run db:migrate` — create/apply a development migration
- `npm run db:studio` — open Prisma Studio
