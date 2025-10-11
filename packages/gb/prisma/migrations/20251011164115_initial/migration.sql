-- CreateTable
CREATE TABLE "ProductGenre" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPlatform" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL,
    "skuId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isPreorder" BOOLEAN NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimilarProduct" (
    "product_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToProductGenre" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductToProductGenre_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProductToProductPlatform" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductToProductPlatform_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimilarProduct_product_id_name_key" ON "SimilarProduct"("product_id", "name");

-- CreateIndex
CREATE INDEX "_ProductToProductGenre_B_index" ON "_ProductToProductGenre"("B");

-- CreateIndex
CREATE INDEX "_ProductToProductPlatform_B_index" ON "_ProductToProductPlatform"("B");

-- AddForeignKey
ALTER TABLE "_ProductToProductGenre" ADD CONSTRAINT "_ProductToProductGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductGenre" ADD CONSTRAINT "_ProductToProductGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductPlatform" ADD CONSTRAINT "_ProductToProductPlatform_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductPlatform" ADD CONSTRAINT "_ProductToProductPlatform_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
