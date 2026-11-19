CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "secretEncrypted" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);
