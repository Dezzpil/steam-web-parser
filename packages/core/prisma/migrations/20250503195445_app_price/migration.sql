-- CreateTable
CREATE TABLE "AppPrice" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "initial" INTEGER NOT NULL,
    "final" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "initialFormatted" TEXT NOT NULL,
    "finalFormatted" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppPrice_id_key" ON "AppPrice"("id");

-- AddForeignKey
ALTER TABLE "AppPrice" ADD CONSTRAINT "AppPrice_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
