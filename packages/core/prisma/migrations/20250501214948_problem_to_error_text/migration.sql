/*
  Warnings:

  - You are about to drop the column `problem` on the `AppUrl` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AppUrl" DROP COLUMN "problem",
ADD COLUMN     "error" TEXT;
