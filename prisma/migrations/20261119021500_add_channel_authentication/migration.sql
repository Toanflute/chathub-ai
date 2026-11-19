ALTER TABLE "channel_connections"
ADD COLUMN "credentialsEncrypted" TEXT,
ADD COLUMN "externalAccountId" TEXT,
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "lastError" TEXT;
