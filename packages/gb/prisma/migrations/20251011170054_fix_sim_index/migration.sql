/*
  Warnings:

  - You are about to drop the column `product_id` on the `SimilarProduct` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,name]` on the table `SimilarProduct` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `SimilarProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skuId` to the `SimilarProduct` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SimilarProduct_product_id_name_key";

-- AlterTable
ALTER TABLE "SimilarProduct" DROP COLUMN "product_id",
ADD COLUMN     "productId" INTEGER NOT NULL,
ADD COLUMN     "skuId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SimilarProduct_productId_name_key" ON "SimilarProduct"("productId", "name");
