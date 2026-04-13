import prisma from './prisma';
import { AppItem } from '../workers/appGrabber';
import { TaskExtendedType, TaskType } from './task';
import { AppUrl } from '../../generated/client';

export async function findAppUrl(id: number, throwGrabbedError = true) {
  const appUrl = await prisma.appUrl.findUniqueOrThrow({ where: { id } });
  if (throwGrabbedError && appUrl.grabbedAt) {
    throw new Error(`appUrl ${id} already grabbed`);
  }
  return appUrl;
}

export async function insertApp(id: number, item: AppItem) {
  return prisma.$transaction(async (tx) => {
    await tx.appUrl.update({ where: { id }, data: { grabbedAt: new Date() } });
    return tx.app.upsert({
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
  forMainLoop = false,
  foundByTerm: string | null = null,
): Promise<Array<TaskType>> {
  const appUrls = await prisma.appUrl.createManyAndReturn({
    data: urls.map((url) => ({
      id: url.appId,
      path: url.href,
      fromAppId,
      forMainLoop,
      foundByTerm,
    })),
    skipDuplicates: true,
  });
  return appUrls.map((appUrl: AppUrl) => {
    return {
      appId: appUrl.id,
      href: appUrl.path,
      fromAppId: appUrl.fromAppId || undefined,
      forMainLoop: appUrl.forMainLoop,
    };
  });
}

export async function updateAppsUrlForMainLoop(tasks: TaskType[]) {
  await prisma.appUrl.updateMany({
    where: { id: { in: tasks.map((task) => task.appId) } },
    data: { forMainLoop: true },
  });
}

export async function saveErrorToAppUrl(id: number, error: string) {
  await prisma.appUrl.update({ where: { id }, data: { error } });
}

export async function findNotGrabbedAppsUrls(forMainLoop = true) {
  return prisma.appUrl.findMany({ where: { grabbedAt: null, error: null, forMainLoop } });
}

export async function linkApps(appId: number, urls: TaskType[]) {
  await prisma.appToApp.createMany({
    data: urls.map((url) => ({ leftId: appId, rightId: url.appId })),
    skipDuplicates: true,
  });
}

export async function findAllApps(limit = 20, offset = 0, sortBy = 'updatedAt') {
  const orderBy: any = {};
  const where: any = {};

  switch (sortBy) {
    case 'maxOnline':
      orderBy.lastOnline = 'desc';
      break;
    case 'price':
      orderBy.lastPrice = 'asc';
      break;
    case 'free':
      where.Price = {
        none: {},
      };
      break;
    case 'updatedAt':
    default:
      orderBy.updatedAt = { sort: 'desc', nulls: 'last' };
      break;
  }

  return prisma.app.findMany({
    take: limit,
    skip: offset,
    where,
    include: {
      Online: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      Price: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy,
  });
}

export async function findAppById(id: number) {
  return prisma.app.findUnique({
    where: { id },
    include: {
      Related: {
        select: {
          rightId: true,
        },
      },
      Online: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
      Price: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      },
    },
  });
}

export async function findRelatedAppsForApps(ids: number[]) {
  const rels = await prisma.appToApp.findMany({
    where: { leftId: { in: ids } },
    select: { rightId: true },
  });

  return prisma.app.findMany({
    where: { id: { in: rels.map((rel) => rel.rightId) } },
    select: {
      id: true,
      title: true,
      genre: true,
      popularTags: true,
      linkToLogoImg: true,
    },
  });
}

export async function findAppsBasic(ids: number[]) {
  if (!ids.length) return [] as const;
  return prisma.app.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      genre: true,
      popularTags: true,
      linkToLogoImg: true,
    },
  });
}

export async function findRelatedApps(appId: number) {
  const relations = await prisma.appToApp.findMany({
    where: { leftId: appId },
    select: { rightId: true },
  });

  const relatedIds = relations.map((relation: { rightId: number }) => relation.rightId);

  return prisma.app.findMany({
    where: {
      id: {
        in: relatedIds,
      },
    },
    include: {
      Online: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      Price: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

export async function findAppByTitle(title: string): Promise<TaskExtendedType | null> {
  const app = await prisma.app.findFirst({
    where: {
      title: {
        equals: title,
        mode: 'insensitive',
      },
    },
    include: {
      AppUrl: true,
    },
  });

  if (!app) return null;

  return {
    appId: app.id,
    href: app.AppUrl.path,
    forMainLoop: app.AppUrl.forMainLoop,
    title: app.title,
    genre: app.genre,
    popularTags: app.popularTags,
    linkToLogoImg: app.linkToLogoImg,
  };
}

export async function countApps() {
  return prisma.app.count();
}

export async function countFreeVsPaidApps() {
  const freeApps = await prisma.app.count({
    where: {
      Price: {
        none: {},
      },
    },
  });

  const paidApps = await prisma.app.count({
    where: {
      Price: {
        some: {
          final: {
            gt: 0,
          },
        },
      },
    },
  });

  return { freeApps, paidApps };
}

export async function countDownloadableContent() {
  const downloadable = await prisma.app.count({
    where: {
      isDownloadableContent: true,
    },
  });

  const nonDownloadable = await prisma.app.count({
    where: {
      isDownloadableContent: false,
    },
  });

  return { downloadable, nonDownloadable };
}

export async function findAppUrlsFoundBySearch(limit = 20, offset = 0) {
  const [appUrls, total] = await Promise.all([
    prisma.appUrl.findMany({
      where: {
        foundByTerm: {
          not: null,
        },
      },
      include: {
        App: true,
      },
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.appUrl.count({
      where: {
        foundByTerm: {
          not: null,
        },
      },
    }),
  ]);
  return { appUrls, total };
}
