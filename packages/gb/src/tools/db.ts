import prisma from './prisma';
import {
  ProductGenresMapType,
  ProductGenreType,
  ProductPlatformsMapType,
  ProductPlatformType,
  ProductType,
} from '../types';

export async function insertProduct(item: ProductType) {
  if (!item.id) throw new Error('Product ID is missing');
  console.log(`${item.id}:${item.name} inserting product`);
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

export async function fetchGenres(
  asMap = false,
): Promise<ProductGenresMapType | ProductGenreType[]> {
  const list = await prisma.productGenre.findMany({
    select: { id: true, name: true },
  });
  if (asMap) {
    const map = new Map();
    for (const item of list) {
      map.set(item.name, item);
    }
    return map;
  }
  return list;
}

export async function fetchPlatforms(
  asMap = false,
): Promise<ProductPlatformsMapType | ProductPlatformType[]> {
  const list = await prisma.productPlatform.findMany({
    select: { id: true, name: true },
  });
  if (asMap) {
    const map = new Map();
    for (const item of list) {
      map.set(item.name, item);
    }
    return map;
  }
  return list;
}
