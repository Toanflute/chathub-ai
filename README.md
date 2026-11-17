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

The Prisma schema declares the PostgreSQL `vector` extension and stores document embeddings as `vector(1536)`. Similarity searches over this Prisma `Unsupported` field should be implemented with parameterized raw SQL. Do not expose or log AI API keys; encrypt them at rest before production use.

## Scripts

- `npm run dev` — start Next.js in development
- `npm run build` — generate Prisma Client and build the app
- `npm run db:migrate` — create/apply a development migration
- `npm run db:studio` — open Prisma Studio
