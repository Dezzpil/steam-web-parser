-- CreateTable
CREATE TABLE "PriceOnlineProcess" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'created',
    "error" TEXT,
    "priceCollected" INTEGER NOT NULL DEFAULT 0,
    "onlineCollected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PriceOnlineProcess_pkey" PRIMARY KEY ("id")
);
