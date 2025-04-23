-- CreateTable
CREATE TABLE "AppUrl" (
    "id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "fromAppId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grabbedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "App" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "genre" TEXT[],
    "popularTags" TEXT[],
    "linkToMoreLikeThis" TEXT NOT NULL,
    "moreGrabbedAt" TIMESTAMP(3),
    "moreLen" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUrl_id_key" ON "AppUrl"("id");

-- CreateIndex
CREATE UNIQUE INDEX "App_id_key" ON "App"("id");
