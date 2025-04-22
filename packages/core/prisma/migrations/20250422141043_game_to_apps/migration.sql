/*
  Warnings:

  - You are about to drop the `Game` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MoreGamesLikeThis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Url` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Game";

-- DropTable
DROP TABLE "MoreGamesLikeThis";

-- DropTable
DROP TABLE "Url";

-- CreateTable
CREATE TABLE "AppUrl" (
    "id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "fromAppId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grabbedAt" TIMESTAMP(3),
    "parsedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "App" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "genre" TEXT[],
    "popularTags" TEXT[]
);

-- CreateTable
CREATE TABLE "MoreAppsLikeThis" (
    "thisId" INTEGER NOT NULL,
    "anotherId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUrl_id_key" ON "AppUrl"("id");

-- CreateIndex
CREATE UNIQUE INDEX "App_id_key" ON "App"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MoreAppsLikeThis_thisId_anotherId_key" ON "MoreAppsLikeThis"("thisId", "anotherId");
