CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "serviceName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "assignedTo" TEXT NOT NULL DEFAULT 'Ai cũng được',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointments_startsAt_assignedTo_idx" ON "appointments"("startsAt", "assignedTo");
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");

ALTER TABLE "appointments"
ADD CONSTRAINT "appointments_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "contacts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
