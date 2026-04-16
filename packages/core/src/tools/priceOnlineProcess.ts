import prisma from './prisma';

export interface PriceOnlineProcessData {
  id: number;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  status: string;
  error: string | null;
  priceCollected: number;
  onlineCollected: number;
}

export async function createPriceOnlineProcess(): Promise<PriceOnlineProcessData> {
  return prisma.priceOnlineProcess.create({ data: {} });
}

export async function startPriceOnlineProcess(id: number): Promise<PriceOnlineProcessData> {
  return prisma.priceOnlineProcess.update({
    where: { id },
    data: { status: 'started', startedAt: new Date() },
  });
}

export async function finishPriceOnlineProcess(
  id: number,
  error: string | null = null,
): Promise<PriceOnlineProcessData> {
  return prisma.priceOnlineProcess.update({
    where: { id },
    data: { status: 'finished', finishedAt: new Date(), error },
  });
}

export async function updatePriceOnlineCounters(
  id: number,
  priceCollected: number,
  onlineCollected: number,
): Promise<void> {
  await prisma.priceOnlineProcess.update({
    where: { id },
    data: { priceCollected, onlineCollected },
  });
}

export async function findActivePriceOnlineProcess(): Promise<PriceOnlineProcessData | null> {
  return prisma.priceOnlineProcess.findFirst({
    where: { status: { in: ['created', 'started'] } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markStalePriceOnlineProcessesAsFinished(): Promise<void> {
  await prisma.priceOnlineProcess.updateMany({
    where: { status: { in: ['created', 'started'] } },
    data: {
      status: 'finished',
      finishedAt: new Date(),
      error: 'Процесс прерван: сервис был перезапущен',
    },
  });
}

export async function findPriceOnlineProcesses(
  limit = 20,
  offset = 0,
): Promise<{ items: PriceOnlineProcessData[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.priceOnlineProcess.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.priceOnlineProcess.count(),
  ]);
  return { items, total };
}
