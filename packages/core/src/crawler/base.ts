import { Browser, Page } from 'puppeteer';
import { queue, QueueObject } from 'async';
import { TaskType } from '../tools/task';
import { App } from '@prisma/client';
import {
  createAppsUrls,
  insertApp,
  linkApps,
  saveErrorToAppUrl,
  updateAppsUrlForMainLoop,
  updateAppWithMore,
} from '../tools/db';
import { AppGrabber, AppItem } from '../workers/appGrabber';
import { getNewBrowserPage } from '../tools/browser';

export class BaseCrawler {
  private _processed = 0;
  private _queue: QueueObject<TaskType> | null = null;
  // Page pool state
  private _pagePool: Page[] = [];
  private _availablePages: Page[] = [];
  private _waiters: Array<(p: Page) => void> = [];
  // Throttling state
  private _initialConcurrency = 3;
  private _throttleLevel = 0; // how many steps we throttled
  private _nextRestoreAt = 0; // timestamp ms when we may restore by 1

  constructor(private _browser: Browser) {}

  async init(concurrency = 3, deep = true, forMainLoop = true) {
    this._processed = 0;
    this._initialConcurrency = Math.max(1, concurrency);
    await this._initPagePool(concurrency);
    this._queue = queue<TaskType>(async (task, callback) => {
      const appGrabber = new AppGrabber(this._browser);
      const page = await this.acquirePage();

      let item: AppItem;
      let app: App;
      try {
        item = await appGrabber.grabAndParseAppPage(task.href, page);
        app = await insertApp(task.appId, item);
        console.log(`${task.appId}: "${app.title}" parsed and persisted`);
      } catch (e) {
        const err = e as unknown as Error;
        // Dynamic throttling on HTTP 429 or navigation issues
        if (this._isThrottleWorthyError(err)) {
          this._decreaseConcurrency(`task ${task.appId}: throttling due to error: ${err.message}`);
        }
        try {
          await saveErrorToAppUrl(task.appId, err.message);
          console.error(`${task.appId}: error commited on 'app' step: ${err.message}`);
        } catch (e) {
          // skip
        }
        this._processed++;
        this.releasePage(page)
          .then(() => this._maybeRestoreConcurrency())
          .catch(() => void 0);
        return callback && callback(err);
      }

      try {
        if (item.linkToMoreLikeThis.trim().length === 0) {
          console.log(`${task.appId}: no link to more`);
          await updateAppWithMore(app.id, 0);
          this._processed++;
          return callback && callback();
        }

        const tasks = await appGrabber.grabAndParseMorePage(item.linkToMoreLikeThis, page);
        console.log(`${task.appId}: more ${tasks.length} parsed`);
        await updateAppWithMore(app.id, tasks.length);

        if (tasks.length) {
          await linkApps(app.id, tasks);
          console.log(`${task.appId}: add ${tasks.length} links to app`);
          const newUrls = await createAppsUrls(tasks, app.id, forMainLoop);
          if (newUrls.length) {
            if (task.fromAppId && !deep) {
              console.log(`${task.appId}: prevent to queue more`);
              if (!forMainLoop) await updateAppsUrlForMainLoop(newUrls);
              return callback && callback();
            }
            await this._queue!.push(newUrls);
            console.log(`${task.appId}: more ${newUrls.length} added to queue`);
          }
        }
        this._processed++;
        // try restore after successful finish
        this._maybeRestoreConcurrency();
        return callback && callback();
      } catch (e) {
        const err = e as unknown as Error;
        console.error(`${task.appId}: error skipped on 'more' step: ${err.message}`);
        this._processed++;
        // even on error, try restore timer
        this._maybeRestoreConcurrency();
        return callback && callback();
      } finally {
        await this.releasePage(page);
      }
    }, concurrency);
  }

  get queue(): QueueObject<TaskType> {
    if (!this._queue) {
      throw new Error('Queue is not initialized');
    }
    return this._queue;
  }

  get processed(): number {
    return this._processed;
  }

  get browser(): Browser {
    return this._browser;
  }

  private async _initPagePool(size: number) {
    // Close old pool if re-init
    if (this._pagePool.length) {
      try {
        await Promise.allSettled(this._pagePool.map((p) => p.close()));
      } catch (e) {
        // skip
      }
      this._pagePool = [];
      this._availablePages = [];
      this._waiters = [];
    }
    const pages: Page[] = [];
    for (let i = 0; i < size; i++) {
      const p = await getNewBrowserPage(this._browser);
      pages.push(p);
    }
    this._pagePool = pages;
    this._availablePages = [...pages];
  }

  async acquirePage(): Promise<Page> {
    if (this._availablePages.length > 0) {
      const p = this._availablePages.pop()!;
      return p;
    }
    return new Promise<Page>((resolve) => {
      this._waiters.push(resolve);
    });
  }

  async releasePage(page: Page): Promise<void> {
    // Проверяем, не "битая" ли страница: закрыта/фрейм отцеплен
    let healthy = true;
    try {
      if (page.isClosed()) healthy = false;
      else if (!page.mainFrame() || page.mainFrame().isDetached()) healthy = false;
    } catch (e) {
      healthy = false;
    }

    let pageToReturn: Page = page;
    if (!healthy) {
      try {
        if (!page.isClosed()) await page.close().catch(() => void 0);
      } catch (e) {
        // ignore
      }
      // создаём новую страницу взамен сломанной
      pageToReturn = await getNewBrowserPage(this._browser);
    }

    // If there is a waiter, give the page immediately
    const waiter = this._waiters.shift();
    if (waiter) {
      waiter(pageToReturn);
      return;
    }
    this._availablePages.push(pageToReturn);
  }

  private _isThrottleWorthyError(err: Error): boolean {
    const msg = (err && err.message) || '';
    const code = (err && (err as any).code) as string | undefined;
    if (code === 'HTTP_429') return true;
    if (code === 'NAVIGATION_TIMEOUT') return true;
    // Puppeteer timeouts
    if (err.name === 'TimeoutError') return true;
    if (/Too\s*Many\s*Requests/i.test(msg)) return true;
    if (/net::ERR_|Navigation\sfailed|blocked|temporarily\sdisabled/i.test(msg)) return true;
    // Detached frame / execution context lost — часто означает перегруз либо гонку навигации
    if (/detached\s*Frame|Execution\s*context\s*was\s*destroyed/i.test(msg)) return true;

    return false;
  }

  private _decreaseConcurrency(reason?: string) {
    if (!this._queue) return;
    const current = this._queue.concurrency;
    const next = Math.max(1, current - 1);
    if (next === current) return;
    this._queue.concurrency = next;
    this._throttleLevel++;
    const backoffMs = Math.min(5 * 60_000, 30_000 * this._throttleLevel);
    this._nextRestoreAt = Date.now() + backoffMs;
    console.warn(
      `[throttle] concurrency decreased ${current} -> ${next}; backoff ${Math.round(
        backoffMs / 1000,
      )}s${reason ? `; reason: ${reason}` : ''}`,
    );
  }

  private _maybeRestoreConcurrency() {
    if (!this._queue) return;
    if (this._throttleLevel <= 0) return;
    const now = Date.now();
    if (now < this._nextRestoreAt) return;
    const current = this._queue.concurrency;
    if (current >= this._initialConcurrency) {
      this._throttleLevel = 0;
      return;
    }
    const next = Math.min(this._initialConcurrency, current + 1);
    this._queue.concurrency = next;
    this._throttleLevel = Math.max(0, this._throttleLevel - 1);
    // schedule next step after 60s window
    this._nextRestoreAt = now + 60_000;
    console.info(`[throttle] concurrency restored ${current} -> ${next}`);
  }
}
