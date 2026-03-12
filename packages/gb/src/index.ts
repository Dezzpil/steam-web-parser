import { createBrowser } from './tools/browser';
import { queue } from 'async';
import { ProductType } from './types';
import { CatalogGrabber } from './workers/catalogGrabber';
import { ProductGrabber } from './workers/productGrabber';
import { insertProduct, insertSimilarForProduct, isProductExists } from './tools/db';
import { sleep } from './tools/time';

const QueueConcurrency = 3;

(async () => {
  const b = await createBrowser();
  process.on('exit', (code) => {
    b.close().finally(() => process.exit(code));
  });

  const productGrabber = new ProductGrabber(b);
  const q = queue<ProductType>(async (product, callback) => {
    try {
      console.log(`${product.id}:${product.skuCode} processing ...`);
      try {
        await insertProduct(product);
      } catch (e) {
        // console.log(e);
        console.log(`${product.id}:${product.skuCode} already exists in db`);
        return callback && callback();
      }

      console.log(`${product.id}:${product.skuCode} prepare to grab ...`);
      const similar = await productGrabber.grab(product);
      console.log(
        `${product.id}:${product.skuCode} found similar ${similar.length}: ${similar
          .map((s) => s.name)
          .join(', ')}`,
      );

      if (similar.length) {
        console.log(`${product.id}:${product.skuCode} ${similar.length} similar`);
        await insertSimilarForProduct(product.id, similar);

        for (const s of similar) {
          if (!(await isProductExists(s.id))) {
            console.log(
              `${product.id}:${product.skuCode} -> adding similar to queue: ${s.id}:${s.skuCode}`,
            );
            q.push(s);
          }
        }
      }
      return callback && callback();
    } catch (e) {
      console.error(`${product.id}:${product.skuCode} error: ${(e as any).message}`);
      process.exit(1);
      // return callback && callback(e as Error);
    }
  }, QueueConcurrency);

  // получить первые ссылки
  const catalogGrabber = new CatalogGrabber(b);
  const items = await catalogGrabber.grab();
  console.log(`first catalog grabbed, items len: ${items.length}`);
  await q.push(items);

  q.drain(async () => {
    console.log('queue drained');

    if (!catalogGrabber.isFinished()) {
      // process.exit(0);
      await sleep(5000);
      console.log('grabbing more from catalog\n-\t-\t-\t-\t-');
      const items = await catalogGrabber.grab();
      console.log(`grabbed more ${items.length} items`);
      await q.push(items);
    } else {
      console.log('catalog grabbing is finished');
      process.exit(0);
    }
  });
})();
