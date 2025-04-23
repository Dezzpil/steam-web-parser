import { createBrowser } from './tools/page';
import { TopSellerGrabber } from './workers/topsellerGrabber';
import { queue } from 'async';
import { AppGrabber, AppItem } from './workers/appGrabber';
import { TaskType } from './tools/task';

if (require.main === module) {
  (async () => {
    const browser = await createBrowser();
    process.on('exit', (code) => {
      browser.close().finally(() => process.exit(code));
    });

    const q = queue<TaskType>((task, callback) => {
      console.log(`${task.appId}: started`);
      const appGrabber = new AppGrabber(browser);
      appGrabber
        .grabAndParseAppPage(task.href)
        .then((item: AppItem) => {
          console.log(`${task.appId}: "${item.title}" parsed: ${item.popularTags}`);
          appGrabber
            .grabAndParseMorePage(item.linkToMoreLikeThis)
            .then((urls) => {
              console.log(`${task.appId}: more ${urls.length} parsed`);
              if (urls.length) {
                q.push(urls);
                console.log(`${task.appId}: more ${urls.length} added to queue`);
              }

              callback();
            })
            .catch((e) => {
              console.error(`${task.appId}: error skipped on 'more' step: ${e.message}`);
              callback();
            });
        })
        .catch((e) => {
          console.error(`${task.appId}: error commited on 'app' step: ${e.message}`);
          callback(e);
        });
    }, 2);

    const topSellerGrabber = new TopSellerGrabber(browser);
    const urls = await topSellerGrabber.grabAndParse();
    console.log(`top sellers: ${urls.length}`);
    await q.push(urls[0]);

    q.drain(() => {
      console.log('all tasks processed');
      topSellerGrabber.scroll().then((urls) => {
        if (urls.length) {
          console.log(`scrolled to next top sellers: ${urls.length}`);
          q.push(urls);
        } else {
          console.log('no more top sellers, exiting');
          process.exit(0);
        }
      });
    });
  })();
}
