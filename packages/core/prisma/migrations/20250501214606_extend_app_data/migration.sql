/*
  Warnings:

  - Added the required column `descriptionMini` to the `App` table without a default value. This is not possible if the table is not empty.
  - Added the required column `linkToLogoImg` to the `App` table without a default value. This is not possible if the table is not empty.
  - Added the required column `releaseDate` to the `App` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewsSummaryExplain` to the `App` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "App" ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "descriptionMini" TEXT NOT NULL,
ADD COLUMN     "developers" TEXT[],
ADD COLUMN     "linkToLogoImg" TEXT NOT NULL,
ADD COLUMN     "releaseDate" TEXT NOT NULL,
ADD COLUMN     "reviewsSummaryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsSummaryExplain" TEXT NOT NULL;
