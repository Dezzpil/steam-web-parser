-- CreateTable
CREATE TABLE "AppOnline" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "value" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppOnline_id_key" ON "AppOnline"("id");

-- AddForeignKey
ALTER TABLE "AppOnline" ADD CONSTRAINT "AppOnline_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
