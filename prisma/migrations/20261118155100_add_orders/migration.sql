CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL,
    "workflow" TEXT NOT NULL DEFAULT 'Workflow bán tự động',
    "total" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'Credits',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "placedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "processingCode" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'Nội dung dùng chung',
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");
CREATE INDEX "orders_status_placedAt_idx" ON "orders"("status", "placedAt");
CREATE INDEX "orders_contactId_idx" ON "orders"("contactId");

ALTER TABLE "orders"
ADD CONSTRAINT "orders_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "contacts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
