import { createBrowser } from './tools/browser';
import { findNotGrabbedAppsUrls } from './tools/db';
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

    const findUrlsToGrab = async () => {
      const orphanedAppsUrls = await findNotGrabbedAppsUrls();
      if (orphanedAppsUrls.length) {
        console.log(`adding not-grabbed urls ${orphanedAppsUrls.length} to queue...`);
        for (const url of orphanedAppsUrls) {
          await crawler.queue.push([{ appId: url.id, href: url.path, forMainLoop: true }]);
        }
      }
    };

    crawler.queue.drain(async () => {
      console.log('all tasks processed');
      await findUrlsToGrab();
    });

    // стартуем
    await findUrlsToGrab();
  })();
}
