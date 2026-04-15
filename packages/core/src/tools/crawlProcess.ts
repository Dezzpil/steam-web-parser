import prisma from './prisma';

export type CrawlType = 'crawl' | 'crawl:top' | 'crawl:catalog';
export type CrawlStatus = 'created' | 'started' | 'finished';
export type CrawlSortBy = 'Released_DESC' | 'Reviews_DESC' | null;

export interface CrawlProcessData {
  id: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  type: string;
  sortBy: string | null;
  status: string;
  error: string | null;
  seen: number;
  added: number;
}

export async function createCrawlProcess(
  type: CrawlType,
  sortBy: CrawlSortBy = null,
): Promise<CrawlProcessData> {
  return prisma.crawlProcess.create({
    data: { type, sortBy },
  });
}

export async function startCrawlProcess(id: number): Promise<CrawlProcessData> {
  return prisma.crawlProcess.update({
    where: { id },
    data: { status: 'started', startedAt: new Date() },
  });
}

export async function finishCrawlProcess(
  id: number,
  error: string | null = null,
): Promise<CrawlProcessData> {
  return prisma.crawlProcess.update({
    where: { id },
    data: { status: 'finished', finishedAt: new Date(), error },
  });
}

export async function updateCrawlProcessCounters(
  id: number,
  seen: number,
  added: number,
): Promise<void> {
  await prisma.crawlProcess.update({
    where: { id },
    data: { seen, added },
  });
}

export async function findActiveCrawlProcess(): Promise<CrawlProcessData | null> {
  return prisma.crawlProcess.findFirst({
    where: { status: { in: ['created', 'started'] } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markStaleProcessesAsFinished(): Promise<void> {
  await prisma.crawlProcess.updateMany({
    where: { status: { in: ['created', 'started'] } },
    data: {
      status: 'finished',
      finishedAt: new Date(),
      error: 'Процесс прерван: сервис был перезапущен',
    },
  });
}

export async function findCrawlProcesses(
  limit = 20,
  offset = 0,
): Promise<{ items: CrawlProcessData[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.crawlProcess.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.crawlProcess.count(),
  ]);
  return { items, total };
}
