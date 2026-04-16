import { Browser } from 'puppeteer';
import { createBrowser } from '../tools/browser';
import { createAppsUrls, findNotGrabbedAppsUrls } from '../tools/db';
import { createFilteredTopSellerAppUrls } from '../tools/url';
import { TopSellerGrabber } from '../workers/topsellerGrabber';
import { BaseCrawler } from './base';
import {
  CrawlType,
  CrawlSortBy,
  CrawlProcessData,
  createCrawlProcess,
  startCrawlProcess,
  finishCrawlProcess,
  updateCrawlProcessCounters,
  findActiveCrawlProcess,
  markStaleProcessesAsFinished,
} from '../tools/crawlProcess';
import { TaskType } from '../tools/task';

const MAX_MESSAGES = parseInt(process.env.CRAWL_MAX_MESSAGES || '200', 10);

export interface CrawlMessage {
  ts: number;
  text: string;
}

class CrawlManager {
  private _browser: Browser | null = null;
  private _activeProcess: CrawlProcessData | null = null;
  private _activeCrawler: BaseCrawler | null = null;
  private _messages: CrawlMessage[] = [];
  private _seen = 0;
  private _added = 0;
  private _stopped = false;

  private _log(text: string) {
    const msg: CrawlMessage = { ts: Date.now(), text };
    console.log(`[crawl] ${text}`);
    this._messages.push(msg);
    if (this._messages.length > MAX_MESSAGES) {
      this._messages.shift();
    }
  }

  private async _updateCounters() {
    if (!this._activeProcess) return;
    this._activeProcess.seen = this._seen;
    this._activeProcess.added = this._added;
    await updateCrawlProcessCounters(this._activeProcess.id, this._seen, this._added).catch(
      () => void 0,
    );
  }

  async init() {
    await markStaleProcessesAsFinished();
    const stale = await findActiveCrawlProcess();
    if (stale) {
      await finishCrawlProcess(stale.id, 'Процесс прерван: сервис был перезапущен');
    }
  }

  get activeProcess(): CrawlProcessData | null {
    return this._activeProcess;
  }

  get messages(): CrawlMessage[] {
    return [...this._messages];
  }

  get queueLength(): number {
    return this._activeCrawler ? this._activeCrawler.queue.length() : 0;
  }

  isRunning(): boolean {
    return this._activeProcess !== null;
  }

  async stop(): Promise<void> {
    if (!this._activeProcess) return;
    this._stopped = true;
    const processId = this._activeProcess.id;
    this._log(`Краулинг #${processId} остановлен пользователем`);
    if (this._activeCrawler) {
      try {
        this._activeCrawler.queue.kill();
      } catch {
        /* ignore */
      }
      this._activeCrawler = null;
    }
    await finishCrawlProcess(processId, 'Остановлено пользователем').catch(() => void 0);
    this._activeProcess = null;
  }

  async start(type: CrawlType, sortBy: CrawlSortBy = null): Promise<CrawlProcessData> {
    if (this.isRunning()) {
      throw new Error('Краулинг уже запущен');
    }

    const process = await createCrawlProcess(type, sortBy);
    this._activeProcess = process;
    this._messages = [];
    this._seen = 0;
    this._added = 0;
    this._stopped = false;

    this._log(`Краулинг #${process.id} создан: type=${type}, sortBy=${sortBy}`);

    // запускаем асинхронно, не ждем
    this._run(process.id, type, sortBy).catch((err) => {
      console.error('[crawl] unhandled error in _run:', err);
    });

    return process;
  }

  private async _ensureBrowser(): Promise<Browser> {
    if (!this._browser || !this._browser.connected) {
      this._browser = await createBrowser();
    }
    return this._browser;
  }

  private async _run(processId: number, type: CrawlType, sortBy: CrawlSortBy): Promise<void> {
    let updated = await startCrawlProcess(processId);
    this._activeProcess = updated;
    this._log(`Краулинг #${processId} запущен`);

    try {
      const browser = await this._ensureBrowser();
      const crawler = new BaseCrawler(browser);
      crawler.setLogger((text) => this._log(text));
      await crawler.init(3);
      this._activeCrawler = crawler;

      if (type === 'crawl') {
        await this._runCrawl(processId, crawler);
      } else if (type === 'crawl:top') {
        await this._runCrawlTop(processId, crawler, browser);
      } else if (type === 'crawl:catalog') {
        await this._runCrawlCatalog(processId, crawler, browser, sortBy);
      }

      // Если краулинг был остановлен вручную — процесс уже завершён в stop()
      if (!this._stopped) {
        updated = await finishCrawlProcess(processId, null);
        this._activeProcess = null;
        this._activeCrawler = null;
        this._log(`Краулинг #${processId} завершен`);
      }
    } catch (err) {
      if (this._stopped) return;
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`Краулинг #${processId} завершен с ошибкой: ${msg}`);
      await finishCrawlProcess(processId, msg).catch(() => void 0);
      this._activeProcess = null;
    }
  }

  private async _runCrawl(processId: number, crawler: BaseCrawler): Promise<void> {
    return new Promise<void>((resolve) => {
      const findAndPush = async () => {
        const urls = await findNotGrabbedAppsUrls();
        this._seen += urls.length;
        this._log(`Найдено не обработанных URL: ${urls.length}`);
        await this._updateCounters();

        if (urls.length === 0) {
          this._log('Нет URL для обработки, завершаем');
          resolve();
          return;
        }

        for (const url of urls) {
          await crawler.queue.push([{ appId: url.id, href: url.path, forMainLoop: true }]);
        }
      };

      crawler.queue.drain(async () => {
        this._log('Очередь опустела, ищем новые URL...');
        const urls = await findNotGrabbedAppsUrls();
        if (urls.length === 0) {
          resolve();
          return;
        }
        this._seen += urls.length;
        await this._updateCounters();
        for (const url of urls) {
          await crawler.queue.push([{ appId: url.id, href: url.path, forMainLoop: true }]);
        }
      });

      findAndPush().catch(resolve as any);
    });
  }

  private async _runCrawlTop(
    processId: number,
    crawler: BaseCrawler,
    browser: Browser,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      (async () => {
        const orphanedAppsUrlsSet = new Set<number>();
        const orphanedAppsUrls = await findNotGrabbedAppsUrls();
        for (const url of orphanedAppsUrls) {
          orphanedAppsUrlsSet.add(url.id);
        }

        const topSellerGrabber = new TopSellerGrabber(browser, orphanedAppsUrlsSet);

        const scrollAndFind = async (): Promise<void> => {
          const newUrls = await createFilteredTopSellerAppUrls(topSellerGrabber, true);
          if (newUrls.length) {
            const added = await createAppsUrls(newUrls, null, true);
            this._seen += newUrls.length;
            this._added += added.length;
            await this._updateCounters();
            this._log(`Прокрутка: найдено ${newUrls.length}, добавлено ${added.length}`);
            await crawler.queue.push(added);
          } else {
            this._log('Топ-продавцы закончились');
            resolve();
          }
        };

        crawler.queue.drain(async () => {
          this._log('Очередь опустела, продолжаем прокрутку...');
          await scrollAndFind().catch(reject);
        });

        const newUrls = await createFilteredTopSellerAppUrls(topSellerGrabber);
        if (newUrls.length > 0) {
          const added = await createAppsUrls(newUrls, null, true);
          this._seen += newUrls.length;
          this._added += added.length;
          await this._updateCounters();
          this._log(`Начальная загрузка: найдено ${newUrls.length}, добавлено ${added.length}`);
          await crawler.queue.push(added);
        } else {
          await scrollAndFind();
        }
      })().catch(reject);
    });
  }

  private async _runCrawlCatalog(
    processId: number,
    crawler: BaseCrawler,
    browser: Browser,
    sortBy: CrawlSortBy,
  ): Promise<void> {
    const effectiveSortBy = sortBy || 'Released_DESC';
    const { CatalogGrabberInternal } = await import('./catalogGrabber');
    const catalogGrabber = new CatalogGrabberInternal(browser, undefined, effectiveSortBy);

    const grabAndFilter = async (scroll = false): Promise<TaskType[]> => {
      const urls = scroll
        ? await catalogGrabber.scrollAndGrabUrlsAfter()
        : await catalogGrabber.grabUrls();
      const message = scroll
        ? `Прокрутка каталога: найдено ${urls.length}`
        : `Начальная загрузка каталога: найдено ${urls.length}`;
      this._log(message);
      this._seen += urls.length;
      const newUrls = await createAppsUrls(urls, null, true);
      this._added += newUrls.length;
      await this._updateCounters();
      return newUrls;
    };

    return new Promise<void>((resolve, reject) => {
      const scrollAndFindNew = async (): Promise<void> => {
        const newUrls = await grabAndFilter(true);
        if (newUrls.length) {
          await crawler.queue.push(newUrls);
        } else {
          await scrollAndFindNew();
        }
      };

      crawler.queue.drain(async () => {
        this._log('Очередь каталога опустела, продолжаем...');
        await scrollAndFindNew().catch(reject);
      });

      grabAndFilter(false)
        .then(async (initial) => {
          if (initial.length > 0) {
            await crawler.queue.push(initial);
          } else {
            await scrollAndFindNew();
          }
        })
        .catch(reject);
    });
  }
}

export const crawlManager = new CrawlManager();
