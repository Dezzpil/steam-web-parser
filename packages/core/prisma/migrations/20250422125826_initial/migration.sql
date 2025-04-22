-- CreateTable
CREATE TABLE "Url" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "parsedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "urlId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "developer" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "genre" TEXT[],
    "popularTags" TEXT[]
);

-- CreateTable
CREATE TABLE "MoreGamesLikeThis" (
    "thisId" INTEGER NOT NULL,
    "anotherId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Url_id_key" ON "Url"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Game_id_key" ON "Game"("id");

-- CreateIndex
CREATE UNIQUE INDEX "MoreGamesLikeThis_thisId_anotherId_key" ON "MoreGamesLikeThis"("thisId", "anotherId");
