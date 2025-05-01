import { createBrowser } from './tools/browser';
import { TopSellerGrabber } from './workers/topsellerGrabber';
import { queue } from 'async';
import { AppGrabber, AppItem } from './workers/appGrabber';
import { TaskType } from './tools/task';
import {
  createAppsUrls,
  findAppUrl,
  findNotGrabbedAppsUrls,
  insertApp,
  linkApps,
  updateAppWithMore,
} from './tools/db';
import type { AppUrl, App } from '@prisma/client';
import { createWebServer } from './server';

const QueueConcurrency = 2;
const Port = parseInt(process.env.PORT || '3000');

if (require.main === module) {
  (async () => {
    const browser = await createBrowser();
    process.on('exit', (code) => {
      browser.close().finally(() => process.exit(code));
    });

    const q = queue<TaskType>(async (task, callback) => {
      let appUrl: AppUrl;
      try {
        appUrl = await findAppUrl(task.appId);
      } catch (e) {
        return callback(e as unknown as Error);
      }

      console.log(`${task.appId}: started`);
      const appGrabber = new AppGrabber(browser);

      let item: AppItem;
      let app: App;
      try {
        item = await appGrabber.grabAndParseAppPage(task.href);
        app = await insertApp(appUrl.id, item);
        console.log(`${task.appId}: "${item.title}" parsed and persisted: ${item.popularTags}`);
      } catch (e) {
        const err = e as unknown as Error;
        console.error(`${task.appId}: error commited on 'app' step: ${err.message}`);
        await appGrabber.close();
        console.log(`${task.appId}: appGrabber page closed`);
        return callback(err);
      }

      try {
        const urls = await appGrabber.grabAndParseMorePage(item.linkToMoreLikeThis);
        console.log(`${task.appId}: more ${urls.length} parsed`);
        await updateAppWithMore(app.id, urls.length);
        if (urls.length) {
          await linkApps(app.id, urls);
          console.log(`${task.appId}: add ${urls.length} links to app`);
          const newUrls = await createAppsUrls(urls, app.id);
          if (newUrls.length) {
            await q.push(newUrls);
            console.log(`${task.appId}: more ${newUrls.length} added to queue`);
          }
        }
        return callback && callback();
      } catch (e) {
        const err = e as unknown as Error;
        console.error(`${task.appId}: error skipped on 'more' step: ${err.message}`);
        return callback && callback();
      } finally {
        await appGrabber.close();
        console.log(`${task.appId}: appGrabber page closed`);
      }
    }, QueueConcurrency);

    await createWebServer(Port, q);

    const orphanedAppsUrlsSet = new Set<number>();
    const orphanedAppsUrls = await findNotGrabbedAppsUrls();
    console.log(`orphaned apps: ${orphanedAppsUrls.length}`);
    for (const url of orphanedAppsUrls) {
      orphanedAppsUrlsSet.add(url.id);
    }

    const topSellerGrabber = new TopSellerGrabber(browser, orphanedAppsUrlsSet);
    const urls = await topSellerGrabber.grabUrls();
    console.log(`top sellers: ${urls.length}`);
    if (urls.length > 0) {
      await createAppsUrls(urls);
      await q.push(urls);
      console.log(`added to queue from top sellers: ${urls.length}`);
    } else {
      console.log(`adding orphaned urls ${urls.length} to queue...`);
      for (const url of orphanedAppsUrls) {
        await q.push({ appId: url.id, href: url.path });
      }
    }

    q.drain(async () => {
      console.log('all tasks processed');
      const urls = await topSellerGrabber.scrollAndGrabUrlsAfter();
      console.log(`scrolled to next top sellers: ${urls.length}`);
      if (urls.length) {
        await createAppsUrls(urls);
        await q.push(urls);
        console.log(`added to queue: ${urls.length}`);
      } else {
        console.log('no more top sellers, exiting');
        process.exit(0);
      }
    });
  })();
}
