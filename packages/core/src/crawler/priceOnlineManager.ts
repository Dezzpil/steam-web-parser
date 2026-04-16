import path from 'path';
import dotenv from 'dotenv';
import axios, { AxiosError } from 'axios';
import prisma from '../tools/prisma';
import { App } from '@prisma/client';
import { sleep } from '../tools/time';
import {
  PriceOnlineProcessData,
  createPriceOnlineProcess,
  startPriceOnlineProcess,
  finishPriceOnlineProcess,
  updatePriceOnlineCounters,
  findActivePriceOnlineProcess,
  markStalePriceOnlineProcessesAsFinished,
} from '../tools/priceOnlineProcess';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MAX_MESSAGES = parseInt(process.env.PRICE_ONLINE_MAX_MESSAGES || '200', 10);

export interface PriceOnlineMessage {
  ts: number;
  text: string;
}

type PriceInfo = {
  finalFormatted: string;
  final: number;
  initialFormatted: string;
  initial: number;
  discount: number;
  currency: string;
};

class PriceOnlineManager {
  private _activeProcess: PriceOnlineProcessData | null = null;
  private _messages: PriceOnlineMessage[] = [];
  private _priceCollected = 0;
  private _onlineCollected = 0;
  private _stopped = false;

  private _log(text: string) {
    const msg: PriceOnlineMessage = { ts: Date.now(), text };
    console.log(`[price-online] ${text}`);
    this._messages.push(msg);
    if (this._messages.length > MAX_MESSAGES) {
      this._messages.shift();
    }
  }

  private async _updateCounters() {
    if (!this._activeProcess) return;
    this._activeProcess.priceCollected = this._priceCollected;
    this._activeProcess.onlineCollected = this._onlineCollected;
    await updatePriceOnlineCounters(
      this._activeProcess.id,
      this._priceCollected,
      this._onlineCollected,
    ).catch(() => void 0);
  }

  async init() {
    await markStalePriceOnlineProcessesAsFinished();
    const stale = await findActivePriceOnlineProcess();
    if (stale) {
      await finishPriceOnlineProcess(stale.id, 'Процесс прерван: сервис был перезапущен');
    }
  }

  get activeProcess(): PriceOnlineProcessData | null {
    return this._activeProcess;
  }

  get messages(): PriceOnlineMessage[] {
    return [...this._messages];
  }

  isRunning(): boolean {
    return this._activeProcess !== null;
  }

  async stop(): Promise<void> {
    if (!this._activeProcess) return;
    this._stopped = true;
    const processId = this._activeProcess.id;
    this._log(`Процесс #${processId} остановлен пользователем`);
    await finishPriceOnlineProcess(processId, 'Остановлено пользователем').catch(() => void 0);
    this._activeProcess = null;
  }

  async start(): Promise<PriceOnlineProcessData> {
    if (this.isRunning()) {
      throw new Error('Сбор цены и онлайна уже запущен');
    }

    const process = await createPriceOnlineProcess();
    this._activeProcess = process;
    this._messages = [];
    this._priceCollected = 0;
    this._onlineCollected = 0;
    this._stopped = false;

    this._log(`Процесс #${process.id} создан`);

    this._run(process.id).catch((err) => {
      console.error('[price-online] unhandled error in _run:', err);
    });

    return process;
  }

  private async _getCurrentPlayersOnline(apiKey: string, appId: number): Promise<number> {
    const url = process.env.STEAM_API_ONLINE_URL || '';
    const response = await axios.get(url, { params: { key: apiKey, appid: appId } });
    if (response.data.response && response.data.response.result === 1) {
      return response.data.response.player_count;
    }
    return 0;
  }

  private async _getPrices(appIds: number[], retries = 5): Promise<Record<number, PriceInfo>> {
    const result: Record<number, PriceInfo> = {};
    for (const appId of appIds) {
      if (this._stopped) break;
      try {
        const url = process.env.STEAM_STORE_APP_DETAILS_URL || '';
        const response = await axios.get(url, {
          params: { appids: appId, cc: 'ru', filters: 'price_overview' },
        });
        if (response.data) {
          for (const key in response.data) {
            const po = response.data[key]?.data?.price_overview;
            if (!po) continue;
            const id = +key;
            result[id] = {
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
        const err = e as AxiosError;
        if (err.response && err.response.status === 429) {
          if (retries > 0) {
            this._log(`429 ошибка, ждём минуту и повторяем. Осталось попыток: ${retries}`);
            await sleep(1000 * 60);
            return this._getPrices(appIds, retries - 1);
          } else {
            this._log('429 ошибка, лимит повторов исчерпан');
          }
        } else {
          this._log(`Ошибка получения цены: ${(e as any).message}`);
        }
      }
      await sleep(200);
    }
    return result;
  }

  private async _run(processId: number): Promise<void> {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      await finishPriceOnlineProcess(processId, 'STEAM_API_KEY не задан').catch(() => void 0);
      this._activeProcess = null;
      return;
    }

    const updated = await startPriceOnlineProcess(processId);
    this._activeProcess = updated;
    this._log(`Процесс #${processId} запущен`);

    try {
      const oneDayAgoDate = new Date(new Date().getTime() - 1000 * 60 * 60 * 2);
      let cursor: { id: number } | undefined = undefined;
      let apps: App[] | null = null;

      do {
        if (this._stopped) break;

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

        if (apps.length === 0) break;

        const appsIds: number[] = [];

        for (const app of apps) {
          if (this._stopped) break;
          appsIds.push(app.id);

          try {
            const online = await this._getCurrentPlayersOnline(apiKey, app.id);
            await prisma.appOnline.create({
              data: { appId: app.id, value: online, createdAt: new Date() },
            });
            await prisma.app.update({
              where: { id: app.id },
              data: { updatedAt: new Date(), lastOnline: online },
            });
            this._onlineCollected += 1;
            this._log(`#${app.id} онлайн: ${online}`);
          } catch (e) {
            this._log(`#${app.id} ошибка онлайна: ${(e as any).message}`);
          }

          cursor = { id: app.id };
          await sleep(500);
        }

        if (this._stopped) break;

        this._log(`Получаем цены для: ${appsIds.join(', ')}`);
        const prices = await this._getPrices(appsIds);

        for (const key in prices) {
          if (this._stopped) break;
          const price = prices[key];
          const appId = +key;
          await prisma.appPrice.create({
            data: { appId, createdAt: new Date(), ...price },
          });
          await prisma.app.update({
            where: { id: appId },
            data: { updatedAt: new Date(), lastPrice: price.final },
          });
          this._priceCollected += 1;
          this._log(`#${appId} цена: ${price.finalFormatted}`);
        }

        await this._updateCounters();
      } while (apps !== null && apps.length > 0);

      if (!this._stopped) {
        await finishPriceOnlineProcess(processId, null);
        this._activeProcess = null;
        this._log(`Процесс #${processId} завершён`);
      }
    } catch (err) {
      if (this._stopped) return;
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`Процесс #${processId} завершён с ошибкой: ${msg}`);
      await finishPriceOnlineProcess(processId, msg).catch(() => void 0);
      this._activeProcess = null;
    }
  }
}

export const priceOnlineManager = new PriceOnlineManager();
