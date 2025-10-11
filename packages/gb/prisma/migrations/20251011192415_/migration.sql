/*
  Warnings:

  - A unique constraint covering the columns `[productId,skuId]` on the table `SimilarProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SimilarProduct_productId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "SimilarProduct_productId_skuId_key" ON "SimilarProduct"("productId", "skuId");
