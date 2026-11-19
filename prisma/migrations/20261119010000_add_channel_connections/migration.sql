CREATE TABLE "channel_connections" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_config',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "groupSync" BOOLEAN NOT NULL DEFAULT false,
    "groups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "conversations" ADD COLUMN "channelConnectionId" TEXT;

CREATE UNIQUE INDEX "channel_connections_code_key" ON "channel_connections"("code");
CREATE INDEX "channel_connections_platform_idx" ON "channel_connections"("platform");
CREATE INDEX "channel_connections_status_enabled_idx" ON "channel_connections"("status", "enabled");
CREATE INDEX "conversations_channelConnectionId_idx" ON "conversations"("channelConnectionId");

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_channelConnectionId_fkey"
FOREIGN KEY ("channelConnectionId") REFERENCES "channel_connections"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
