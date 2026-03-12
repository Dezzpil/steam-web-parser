import { Browser } from 'puppeteer';
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

export class BaseCrawler {
  private _processed = 0;
  private _queue: QueueObject<TaskType> | null = null;

  constructor(private _browser: Browser) {}

  async init(concurrency = 3, deep = true, forMainLoop = true) {
    this._processed = 0;
    this._queue = queue<TaskType>(async (task, callback) => {
      const appGrabber = new AppGrabber(this._browser);

      let item: AppItem;
      let app: App;
      try {
        item = await appGrabber.grabAndParseAppPage(task.href);
        app = await insertApp(task.appId, item);
        console.log(`${task.appId}: "${app.title}" parsed and persisted`);
      } catch (e) {
        const err = e as unknown as Error;
        try {
          await saveErrorToAppUrl(task.appId, err.message);
          console.error(`${task.appId}: error commited on 'app' step: ${err.message}`);
        } catch (e) {
          // skip
        }
        this._processed++;
        await appGrabber.close();
        return callback && callback(err);
      }

      try {
        if (item.linkToMoreLikeThis.trim().length === 0) {
          console.log(`${task.appId}: no link to more`);
          await updateAppWithMore(app.id, 0);
          this._processed++;
          return callback && callback();
        }

        const tasks = await appGrabber.grabAndParseMorePage(item.linkToMoreLikeThis);
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
        return callback && callback();
      } catch (e) {
        const err = e as unknown as Error;
        console.error(`${task.appId}: error skipped on 'more' step: ${err.message}`);
        this._processed++;
        return callback && callback();
      } finally {
        await appGrabber.close();
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
}
