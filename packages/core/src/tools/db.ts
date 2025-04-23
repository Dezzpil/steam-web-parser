import prisma from '../prisma';
import { AppItem } from '../workers/appGrabber';
import { TaskType } from './task';

export async function findAppUrl(id: number) {
  const appUrl = await prisma.appUrl.findUniqueOrThrow({ where: { id } });
  if (appUrl.grabbedAt) {
    throw new Error(`appUrl ${id} already grabbed`);
  }
  return appUrl;
}

export async function insertApp(id: number, item: AppItem) {
  // TODO use transaction
  await prisma.appUrl.update({ where: { id }, data: { grabbedAt: new Date() } });
  return await prisma.app.create({
    data: {
      id,
      ...item,
    },
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

export async function findNotGrabbedAppsUrls() {
  return await prisma.appUrl.findMany({ where: { grabbedAt: null } });
}

export async function linkApps(appId: number, urls: TaskType[]) {
  await prisma.appToApp.createMany({
    data: urls.map((url) => ({ leftId: appId, rightId: url.appId })),
    skipDuplicates: true,
  });
}
