import { Browser } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { load } from 'cheerio';
import { ProductType } from '../types';

export class ProductGrabber {
  constructor(public readonly browser: Browser) {}

  async grab(product: ProductType) {
    const page = await getNewBrowserPage(this.browser);
    const url = `https://gamersbase.store/game/${product.skuCode}`;
    console.log(`${product.id}:${product.skuCode} going to ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const content = await page.content();
    const $ = load(content);
    console.log(`${product.id}:${product.skuCode} grabbed ${content.length} bytes`);

    // div.product-card-same-products
    const similar: Array<{ name: string; skuId: number }> = [];
    $('div.product-card-same-products a.js-ecommerce-select-item').each((i, el) => {
      const data = $(el).attr('data-product');
      if (data) {
        const json = JSON.parse(data);
        similar.push({ name: json.name, skuId: +json.productSkuId });
      }
    });

    await page.close();
    return similar;
  }
}
