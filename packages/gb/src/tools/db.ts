import prisma from './prisma';
import { ProductType } from '../types';

export async function insertProduct(item: ProductType) {
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
  const data = similar.map((item) => Object.assign({ productId }, item));
  return prisma.similarProduct.createMany({
    data: data as { productId: number; name: string; skuId: number }[],
    skipDuplicates: true,
  });
}

// export async function findAppUrl(id: number, throwGrabbedError = true) {
//   const appUrl = await prisma.appUrl.findUniqueOrThrow({ where: { id } });
//   if (throwGrabbedError && appUrl.grabbedAt) {
//     throw new Error(`appUrl ${id} already grabbed`);
//   }
//   return appUrl;
// }
//
// export async function insertApp(id: number, item: AppItem) {
//   return await prisma.$transaction(async (tx) => {
//     await tx.appUrl.update({ where: { id }, data: { grabbedAt: new Date() } });
//     return await tx.app.upsert({
//       where: { id },
//       create: {
//         id,
//         ...item,
//       },
//       update: {
//         ...item,
//         AppUrl: {
//           connect: { id },
//         },
//       },
//     });
//   });
// }
//
// export async function updateAppWithMore(id: number, len: number) {
//   await prisma.app.update({ where: { id }, data: { moreGrabbedAt: new Date(), moreLen: len } });
// }
//
// export async function createAppsUrls(
//   urls: Array<TaskType>,
//   fromAppId: number | null = null,
// ): Promise<Array<TaskType>> {
//   const appUrls = await prisma.appUrl.createManyAndReturn({
//     data: urls.map((url) => ({ id: url.appId, path: url.href, fromAppId })),
//     skipDuplicates: true,
//   });
//   return appUrls.map((appUrl) => {
//     return { appId: appUrl.id, href: appUrl.path, fromAppId: fromAppId || undefined };
//   });
// }
//
// export async function saveErrorToAppUrl(id: number, error: string) {
//   await prisma.appUrl.update({ where: { id }, data: { error } });
// }
//
// export async function findNotGrabbedAppsUrls() {
//   return await prisma.appUrl.findMany({ where: { grabbedAt: null, error: null } });
// }
//
// export async function linkApps(appId: number, urls: TaskType[]) {
//   await prisma.appToApp.createMany({
//     data: urls.map((url) => ({ leftId: appId, rightId: url.appId })),
//     skipDuplicates: true,
//   });
// }
//
// export async function findAllApps(limit = 20, offset = 0, sortBy = 'updatedAt') {
//   const orderBy: any = {};
//   const where: any = {};
//
//   switch (sortBy) {
//     case 'maxOnline':
//       orderBy.lastOnline = 'desc';
//       break;
//     case 'price':
//       orderBy.lastPrice = 'asc';
//       break;
//     case 'free':
//       where.Price = {
//         none: {},
//       };
//       break;
//     case 'updatedAt':
//     default:
//       orderBy.updatedAt = { sort: 'desc', nulls: 'last' };
//       break;
//   }
//
//   const apps = await prisma.app.findMany({
//     take: limit,
//     skip: offset,
//     where,
//     include: {
//       Online: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//       },
//       Price: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//       },
//     },
//     orderBy,
//   });
//
//   return apps;
// }
//
// export async function findAppById(id: number) {
//   return await prisma.app.findUnique({
//     where: { id },
//     include: {
//       Related: {
//         select: {
//           rightId: true,
//         },
//       },
//       Online: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//         take: 5,
//       },
//       Price: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//         take: 5,
//       },
//     },
//   });
// }
//
// export async function findRelatedApps(appId: number) {
//   const relations = await prisma.appToApp.findMany({
//     where: { leftId: appId },
//     select: { rightId: true },
//   });
//
//   const relatedIds = relations.map((relation) => relation.rightId);
//
//   return await prisma.app.findMany({
//     where: {
//       id: {
//         in: relatedIds,
//       },
//     },
//     include: {
//       Online: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//       },
//       Price: {
//         orderBy: {
//           createdAt: 'desc',
//         },
//       },
//     },
//   });
// }
//
// export async function countApps() {
//   return await prisma.app.count();
// }
//
// export async function countFreeVsPaidApps() {
//   const freeApps = await prisma.app.count({
//     where: {
//       Price: {
//         none: {},
//       },
//     },
//   });
//
//   const paidApps = await prisma.app.count({
//     where: {
//       Price: {
//         some: {
//           final: {
//             gt: 0,
//           },
//         },
//       },
//     },
//   });
//
//   return { freeApps, paidApps };
// }
//
// export async function countDownloadableContent() {
//   const downloadable = await prisma.app.count({
//     where: {
//       isDownloadableContent: true,
//     },
//   });
//
//   const nonDownloadable = await prisma.app.count({
//     where: {
//       isDownloadableContent: false,
//     },
//   });
//
//   return { downloadable, nonDownloadable };
// }
