/*
  Warnings:

  - Added the required column `isSale` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'RUB',
ADD COLUMN     "isSale" BOOLEAN NOT NULL,
ADD COLUMN     "priceActual" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priceStandart" INTEGER NOT NULL DEFAULT 0;
