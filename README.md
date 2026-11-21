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
npm run db:deploy
npm run dev
```

The development server writes to `.next-dev`; production builds and `next start` use `.next`, so running a build does not replace assets served by a development server.

The included initial migration targets an empty PostgreSQL database with `pgvector` installed. If the database already contains tables created outside Prisma Migrate, baseline that database before running `db:deploy`. Contact and order features may initialize their starter records once; channel, inbox, and notification reads use persisted rows and return empty lists when no records exist.

The inbox, contacts, and notifications screens use authenticated APIs for conversation status, messages, notes, contact CRUD and CSV import/export, and notification state. The local sign-in is currently a fixed development account and must be replaced with production identity management before deployment.
The `/channels` screen manages channel accounts and filters inbox conversations by account. Facebook/Instagram and Zalo OA use OAuth; Discord uses the bot-install authorization flow; Telegram Bot tokens are verified with `getMe`; Chat Plugin provides a per-account iframe snippet. Set `CHANNELS_BASE_URL` to the exact public app origin. Register `CHANNELS_BASE_URL/api/channels/facebook/oauth/callback` with Meta and `CHANNELS_BASE_URL/api/channels/oauth/callback` with Zalo and Discord. Set `CHANNEL_CREDENTIALS_KEY` to a persistent 32-byte base64 key (`openssl rand -base64 32`) so provider tokens, system secrets, and AI API keys are encrypted with AES-256-GCM at rest. App ID/secret can be set in `/settings` or in the server environment; never put secrets in client code or chat. Instagram requires an eligible professional account linked to a Facebook Page. Discord requires both its app ID and bot token. Personal Zalo/Telegram accounts do not expose an official messaging login API and are not connected by this flow.

OAuth/token validation only authenticates the account. Configure the provider's webhook, permissions, and messaging subscription as well; Meta webhook endpoints currently support subscription verification, while receiving and sending social-platform messages requires provider-specific event handling. Telegram Bot message delivery likewise requires registering its webhook.
The orders screen includes seeded order history, searchable/filterable server pagination, internal notes, delivery transitions, and cancellation refunds to the customer's Credits balance.
The appointments screen stores schedules in PostgreSQL, checks overlapping bookings before create/reschedule, and supports day/week/month views and status updates. Its AI Agent uses the configured provider, only receives appointments in the currently visible range, and returns a draft for review; it never writes a schedule itself.

Open `/settings` to manage system, appearance, channel, and provider settings. Public settings are merged into the server-side `data/settings.json` file (override its path with `CHATHUB_SETTINGS_FILE`) and mirrored to browser local storage as a fallback. Secret values are encrypted before being written to either store and are never returned by settings APIs; keep `CHANNEL_CREDENTIALS_KEY` stable to retain access. Database synchronization is best-effort, so settings remain available when the database has not yet been initialized. Open `/knowledge` to ingest website knowledge. Open `/workflows` to create and activate a flow. On the home page, use the bottom-right chat bubble to test it; the API stores conversations and message history, traverses the active graph, and uses pgvector retrieval for configured AI Agent nodes.

The chat API runs the most recently updated active workflow. Configure and enable an AI provider and use an embedding model that returns 1536 dimensions. RAG only searches active documents in the groups selected on the AI Agent node. The widget renders assistant Markdown without enabling raw HTML.

Before deploying publicly, replace the local sign-in with production identity management and add rate limiting/abuse protection for admin APIs.

## Desktop app

Electron runs the production Next.js server on a loopback port and stores JSON data under the operating system's `userData` directory. Development uses `npm run electron:dev` with the Next.js server on port 3000. Build installers on the matching operating system with `npm run electron:build:mac`, `npm run electron:build:win`, or `npm run electron:build:linux`; artifacts are written to `release/`.

Desktop login windows use a persistent Electron session partition per channel. They open provider websites in isolated windows, but do not read provider cookies, local storage, or page contents and cannot automatically verify personal-account login or sync those accounts. Use the supported OAuth, bot, and webhook integrations for authenticated messaging.

## API routes

- `GET/POST/PUT /api/settings` — read the global settings object, merge section or full-object updates, and save/test the AI provider without exposing saved API keys.
- `GET/POST /api/system-settings` — read and update system settings; the server-side JSON store remains available when the database is unavailable, and secret values are write-only and encrypted.
- `POST /api/system-settings/suggest-colors` — generate a validated theme palette using the configured AI provider.
- `GET/POST/PATCH/DELETE /api/knowledge/groups` — manage knowledge groups.
- `POST /api/crawler` — crawl one page or same-domain pages and return a preview.
- `POST /api/knowledge/save` — create embeddings and persist documents/chunks.
- `GET/POST /api/workflows` — list and create workflows or the 24/7 assistant template.
- `GET/PATCH/DELETE /api/workflows/:id` — retrieve, update, activate/deactivate, and delete workflows.
- `POST /api/workflows/copilot` — return a validated AI-proposed graph from the current graph and a Vietnamese instruction.
- `GET/POST /api/chat` — load visitor conversation history and execute a turn through the active workflow and RAG agent.
- `GET/POST /api/contacts` and `PATCH/DELETE /api/contacts/:id` — manage contacts.
- `POST /api/contacts/import` — import a CSV-derived JSON contact list.
- `GET/PATCH /api/inbox/conversations` and `PATCH/DELETE /api/inbox/conversations/:id` — manage inbox conversations.
- `POST /api/inbox/conversations/:id/messages` — send a reply.
- `GET/PATCH/DELETE /api/notifications` — list and update notifications.
- `GET/POST /api/channels` and `PATCH/DELETE /api/channels/:id` — manage channel accounts and their inbox associations.
- `GET /api/channels/:id/connect` and `GET /api/channels/oauth/callback` — start and complete Zalo OA or Discord authorization.
- `GET /api/channels/facebook/oauth/callback` — complete Facebook/Instagram authorization.
- `GET /api/channels/webhooks/facebook` and `/api/channels/webhooks/instagram` — verify Meta webhook subscriptions.
- `POST /api/channels/:id/connect` — validate and encrypt a Telegram Bot token.
- `POST /api/channels/:id/check` and `POST /api/channels/:id/disconnect` — verify or remove saved channel credentials.
- `/widget/:channelId` — embedded Chat Plugin for one channel account.
- `GET /api/orders` and `PATCH /api/orders/:id` — list orders, update internal notes, deliver orders, and cancel eligible orders with a wallet refund.
- `GET/POST /api/appointments` — query schedules and counts for a date range, or create an appointment with a conflict check.
- `PATCH/DELETE /api/appointments/:id` — update schedule details/status or delete an appointment.
- `POST /api/appointments/agent` — ask the configured AI provider about the visible schedule or receive a validated booking/reschedule draft for review.

## Scripts

- `npm run dev` — start Next.js in development
- `npm run build` — generate Prisma Client and build the app
- `npm run db:migrate` — create/apply a development migration
- `npm run db:studio` — open Prisma Studio
- `npm run sync:github` - lệnh cập nhật