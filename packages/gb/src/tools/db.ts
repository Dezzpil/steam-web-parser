import prisma from './prisma';
import { ProductType } from '../types';

export async function insertProduct(item: ProductType) {
  if (!item.id) throw new Error('Product ID is missing');
  return prisma.product.create({
    data: {
      id: item.id,
      name: item.name,
      type: item.type,
      parentId: item.parentId,
      skuId: item.skuId,
      isPreorder: item.isPreorder,
      isSale: item.isSale,
      priceStandart: item.priceStandart,
      priceActual: item.priceActual,
      currency: item.currency,
      skuCode: item.skuCode,
      Genres: {
        connectOrCreate: item.genres.map((genre) => ({
          where: { id: genre.id },
          create: { id: genre.id, name: genre.name },
        })),
      },
      Platforms: {
        connectOrCreate: item.platforms.map((platform) => ({
          where: { id: platform.id },
          create: { id: platform.id, name: platform.name },
        })),
      },
    },
  });
}

export async function insertSimilarForProduct(
  productId: number,
  similar: { name: string; skuId: number }[],
) {
  const data = similar.map((item) => ({
    productId,
    name: item.name,
    skuId: item.skuId,
  }));
  return prisma.similarProduct.createMany({
    data,
    skipDuplicates: true,
  });
}

export async function isProductExists(id: number) {
  if (!id) return null;
  return prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
}
