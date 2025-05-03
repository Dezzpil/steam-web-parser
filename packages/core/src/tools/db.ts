import prisma from './prisma';
import { AppItem } from '../workers/appGrabber';
import { TaskType } from './task';

export async function findAppUrl(id: number, throwGrabbedError = true) {
  const appUrl = await prisma.appUrl.findUniqueOrThrow({ where: { id } });
  if (throwGrabbedError && appUrl.grabbedAt) {
    throw new Error(`appUrl ${id} already grabbed`);
  }
  return appUrl;
}

export async function insertApp(id: number, item: AppItem) {
  return await prisma.$transaction(async (tx) => {
    await tx.appUrl.update({ where: { id }, data: { grabbedAt: new Date() } });
    return await tx.app.upsert({
      where: { id },
      create: {
        id,
        ...item,
      },
      update: {
        ...item,
        AppUrl: {
          connect: { id },
        },
      },
    });
  });
}

export async function updateAppWithMore(id: number, len: number) {
  await prisma.app.update({ where: { id }, data: { moreGrabbedAt: new Date(), moreLen: len } });
}

export async function createAppsUrls(
  urls: Array<TaskType>,
  fromAppId: number | null = null,
): Promise<Array<TaskType>> {
  const appUrls = await prisma.appUrl.createManyAndReturn({
    data: urls.map((url) => ({ id: url.appId, path: url.href, fromAppId })),
    skipDuplicates: true,
  });
  return appUrls.map((appUrl) => {
    return { appId: appUrl.id, href: appUrl.path, fromAppId: fromAppId || undefined };
  });
}

export async function saveErrorToAppUrl(id: number, error: string) {
  await prisma.appUrl.update({ where: { id }, data: { error } });
}

export async function findNotGrabbedAppsUrls() {
  return await prisma.appUrl.findMany({ where: { grabbedAt: null, error: null } });
}

export async function linkApps(appId: number, urls: TaskType[]) {
  await prisma.appToApp.createMany({
    data: urls.map((url) => ({ leftId: appId, rightId: url.appId })),
    skipDuplicates: true,
  });
}

export async function findAllApps(limit = 20, offset = 0) {
  return await prisma.app.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      genre: true,
      popularTags: true,
    },
    take: limit,
    skip: offset,
    orderBy: {
      title: 'asc',
    },
  });
}

export async function findAppById(id: number) {
  return await prisma.app.findUnique({
    where: { id },
    include: {
      Related: {
        select: {
          rightId: true,
        },
      },
    },
  });
}

export async function findRelatedApps(appId: number) {
  const relations = await prisma.appToApp.findMany({
    where: { leftId: appId },
    select: { rightId: true },
  });

  const relatedIds = relations.map((relation) => relation.rightId);

  return await prisma.app.findMany({
    where: {
      id: {
        in: relatedIds,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      genre: true,
      popularTags: true,
    },
  });
}

export async function countApps() {
  return await prisma.app.count();
}
