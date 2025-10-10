import { Browser } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { load } from 'cheerio';
import { ProductType } from '../types';

export class ProductGrabber {
  constructor(public readonly browser: Browser) {}

  async grab(product: ProductType): Promise<string[]> {
    const page = await getNewBrowserPage(this.browser);
    await page.goto('/game/' + product.name, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    const $ = load(content);

    // div.product-card-same-products
    const similar: string[] = [];
    $('div.product-card-same-products div.game-info--title').each((i, el) => {
      similar.push(el.data + '');
    });
    return similar;
  }
}
