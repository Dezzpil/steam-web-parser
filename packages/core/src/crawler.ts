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
  saveErrorToAppUrl,
  updateAppWithMore,
} from './tools/db';
import type { AppUrl, App } from '@prisma/client';
import { createFilteredTopSellerAppUrls } from './tools/url';
import { writeFileSync } from 'node:fs';

const QueueConcurrency = 3;

if (require.main === module) {
  let processed = 0;
  const started = process.hrtime();

  process.on('exit', () => {
    const ended = process.hrtime(started);
    writeFileSync('report.txt', JSON.stringify({ processed, ended }));
  });

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
        processed++;
        return callback(e as unknown as Error);
      }

      console.log(`${task.appId}: started`);
      const appGrabber = new AppGrabber(browser);

      let item: AppItem;
      let app: App;
      try {
        item = await appGrabber.grabAndParseAppPage(task.href);
        app = await insertApp(appUrl.id, item);
        console.log(`${task.appId}: "${app.title}" parsed and persisted`);
      } catch (e) {
        const err = e as unknown as Error;
        await saveErrorToAppUrl(appUrl.id, err.message);
        console.error(`${task.appId}: error commited on 'app' step: ${err.message}`);
        await appGrabber.close();
        console.log(`${task.appId}: appGrabber page closed`);
        processed++;
        return callback(err);
      }

      try {
        if (item.linkToMoreLikeThis.trim().length === 0) {
          console.log(`${task.appId}: no link to more`);
          await updateAppWithMore(app.id, 0);
          processed++;
          return callback && callback();
        }

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
        processed++;
        return callback && callback();
      } catch (e) {
        const err = e as unknown as Error;
        console.error(`${task.appId}: error skipped on 'more' step: ${err.message}`);
        processed++;
        return callback && callback();
      } finally {
        await appGrabber.close();
        console.log(`${task.appId}: appGrabber page closed`);
      }
    }, QueueConcurrency);

    const orphanedAppsUrlsSet = new Set<number>();
    const orphanedAppsUrls = await findNotGrabbedAppsUrls();
    console.log(`orphaned url apps: ${orphanedAppsUrls.length}`);
    for (const url of orphanedAppsUrls) {
      orphanedAppsUrlsSet.add(url.id);
    }

    const topSellerGrabber = new TopSellerGrabber(browser, orphanedAppsUrlsSet);

    const scrollAndFindNewTopSellers = async () => {
      const newUrls = await createFilteredTopSellerAppUrls(topSellerGrabber, true);
      if (newUrls.length) {
        await createAppsUrls(newUrls);
        await q.push(newUrls);
        console.log(`added to queue: ${newUrls.length}`);
      } else {
        console.log('no more top sellers');
        await scrollAndFindNewTopSellers();
      }
    };

    // стартуем очереди
    if (orphanedAppsUrls.length) {
      console.log(`adding orphaned urls ${orphanedAppsUrls.length} to queue...`);
      for (const url of orphanedAppsUrls) {
        await q.push({ appId: url.id, href: url.path });
      }
    } else {
      const newUrls = await createFilteredTopSellerAppUrls(topSellerGrabber);
      if (newUrls.length > 0) {
        await createAppsUrls(newUrls);
        await q.push(newUrls);
        console.log(`added to queue from top sellers: ${newUrls.length}`);
      } else {
        await scrollAndFindNewTopSellers();
      }
    }

    q.drain(async () => {
      console.log('all tasks processed');
      await scrollAndFindNewTopSellers();
    });
  })();
}
