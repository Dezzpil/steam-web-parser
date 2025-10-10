import { createBrowser } from './tools/browser';
import { queue } from 'async';
import { ProductType } from './types';
import { CatalogGrabber } from './workers/catalogGrabber';
import { ProductGrabber } from './workers/productGrabber';

const ProductNameToIdMap = new Map<string, number>();

const QueueConcurrency = 3;

(async () => {
  const b = await createBrowser();
  process.on('exit', (code) => {
    b.close().finally(() => process.exit(code));
  });

  const productGrabber = new ProductGrabber(b);
  const q = queue<ProductType>(async (product, callback) => {
    ProductNameToIdMap.set(product.name, product.id);
    const similar = await productGrabber.grab(product);
    if (similar.length)
      for (const name of similar) {
        ProductNameToIdMap.get(name);
      }
    console.log(`${product.name}: ${similar.length} similar`);
    callback();
  }, QueueConcurrency);

  // получить первые ссылки
  const catalogGrabber = new CatalogGrabber(b);
  for (const p of await catalogGrabber.grab()) {
    await q.push(p);
  }
  console.log(`first catalog grabbed, queue len: ${q.length()}`);

  q.drain(async () => {
    console.log('queue drained');

    if (!catalogGrabber.isFinished()) {
      console.log('grabbing more from catalog');
      for (const p of await catalogGrabber.grab()) {
        await q.push(p);
      }
    } else {
      console.log('catalog grabbing is finished');
      process.exit(0);
    }
  });

  console.log('done');
})();
