import { createBrowser } from './tools/browser';
import { TopSellerGrabber } from './workers/topsellerGrabber';
import { createAppsUrls, findNotGrabbedAppsUrls } from './tools/db';
import { createFilteredTopSellerAppUrls } from './tools/url';
import { writeFileSync } from 'node:fs';
import { BaseCrawler } from './crawler/base';

const QueueConcurrency = 3;

if (require.main === module) {
  const started = process.hrtime();

  (async () => {
    const browser = await createBrowser();
    process.on('exit', (code) => {
      browser.close().finally(() => process.exit(code));
    });

    const crawler = new BaseCrawler(browser);
    await crawler.init(QueueConcurrency);

    process.on('exit', () => {
      const ended = process.hrtime(started);
      writeFileSync('report.txt', JSON.stringify({ processed: crawler.processed, ended }));
    });

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
        await createAppsUrls(newUrls, null, true);
        await crawler.queue.push(newUrls);
        console.log(`added to queue: ${newUrls.length}`);
      } else {
        console.log('no more top sellers');
        await scrollAndFindNewTopSellers();
      }
    };

    crawler.queue.drain(async () => {
      console.log('all tasks processed');
      // await scrollAndFindNewTopSellers();
    });

    // стартуем сбор данных о приложениях из списка Top Sellers
    const newUrls = await createFilteredTopSellerAppUrls(topSellerGrabber);
    if (newUrls.length > 0) {
      await createAppsUrls(newUrls);
      await crawler.queue.push(newUrls);
      console.log(`added to queue from top sellers: ${newUrls.length}`);
    } else {
      await scrollAndFindNewTopSellers();
    }
  })();
}
