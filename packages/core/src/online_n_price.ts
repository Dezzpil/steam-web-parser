import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import prisma from './tools/prisma';
import { App } from '@prisma/client';
import { sleep } from './tools/time';

dotenv.config();

const SteamApiKey = process.env.STEAM_API_KEY;

async function getCurrentPlayersOnline(appId: number): Promise<number> {
  const response = await axios.get(
    'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/',
    {
      params: {
        key: SteamApiKey,
        appid: appId,
      },
    },
  );

  if (response.data.response && response.data.response.result === 1) {
    return response.data.response.player_count;
  }
  return 0;
}

type PriceInfo = {
  finalFormatted: string;
  final: number;
  initialFormatted: string;
  initial: number;
  discount: number;
  currency: string;
};

async function getPrices(appIds: number[]): Promise<Record<number, PriceInfo>> {
  const result: Record<number, PriceInfo> = {};
  try {
    const response = await axios.get(`https://store.steampowered.com/api/appdetails/`, {
      params: {
        appids: appIds.join(','),
        cc: 'ru',
        filters: 'price_overview',
      },
    });
    if (response.data) {
      for (const key in response.data) {
        const po = response.data[key].data.price_overview;
        if (!po) continue;

        const appId = +key;
        result[appId] = {
          currency: po.currency,
          discount: po.discount_percent,
          initial: po.initial,
          initialFormatted: po.initial_formatted,
          final: po.final,
          finalFormatted: po.final_formatted,
        };
      }
    }
  } catch (e) {
    console.log('error', (e as any).message);
    const err = e as AxiosError;
    if (err.response && err.response.status === 429) {
      console.log('429 error, sleeping');
      await sleep(1000 * 60);
      return getPrices(appIds);
    }
  }
  return result;
}

let cursor: { id: number } | undefined = undefined;
const oneDayAgoDate = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 1);

if (require.main === module) {
  (async () => {
    let apps: App[] | null = null;
    do {
      const appsIds = [];
      apps = await prisma.app.findMany({
        take: 10,
        skip: cursor ? 1 : 0,
        cursor,
        where: {
          isDownloadableContent: false,
          OR: [{ updatedAt: null }, { updatedAt: { lte: oneDayAgoDate } }],
        },
        orderBy: { id: 'asc' },
      });

      for (const app of apps) {
        appsIds.push(app.id);
        try {
          const online = await getCurrentPlayersOnline(app.id);
          await prisma.appOnline.create({
            data: {
              appId: app.id,
              value: online,
              createdAt: new Date(),
            },
          });
          console.log(`${app.id} - online ${online} saved`);
        } catch (e) {
          console.log(`${app.id} - online fetch error: ${(e as any).message}`);
        }

        await prisma.app.update({ where: { id: app.id }, data: { updatedAt: new Date() } });
        console.log(`${app.id} updated`);
        cursor = { id: app.id };
        await sleep(500);
      }

      console.log(`get prices for appsIds: ${appsIds.join(',')}`);
      const prices = await getPrices(appsIds);
      for (const key in prices) {
        const price = prices[key];
        const appId = +key;
        await prisma.appPrice.create({
          data: {
            appId,
            createdAt: new Date(),
            ...price,
          },
        });
        console.log(`${appId} - price ${price ? price.finalFormatted : 0} saved`);
      }
    } while (apps !== null);
  })();
}
