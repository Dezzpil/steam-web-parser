-- CreateTable
CREATE TABLE "AppToApp" (
    "leftId" INTEGER NOT NULL,
    "rightId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppToApp_leftId_rightId_key" ON "AppToApp"("leftId", "rightId");
