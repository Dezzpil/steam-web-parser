-- AlterTable
ALTER TABLE "App" ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "App_updatedAt_idx" ON "App"("updatedAt");
