-- CreateTable
CREATE TABLE "CrawlProcess" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "sortBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "error" TEXT,
    "seen" INTEGER NOT NULL DEFAULT 0,
    "added" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CrawlProcess_pkey" PRIMARY KEY ("id")
);
