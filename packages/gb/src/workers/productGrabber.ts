import { Browser } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { load } from 'cheerio';
import { ProductGenreType, ProductPlatformType, ProductType } from '../types';

export class ProductGrabber {
  constructor(public readonly browser: Browser) {}

  async grab(product: ProductType) {
    const page = await getNewBrowserPage(this.browser);
    const url = `https://gamersbase.store/game/${product.skuCode}`;
    console.log(`${product.id}:${product.skuCode} going to ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    } catch (e) {
      console.log(`${product.id}:${product.skuCode} error: ${(e as any).message}`);
      await page.close();
      return [];
    }
    const content = await page.content();
    const $ = load(content);
    console.log(`${product.id}:${product.skuCode} grabbed ${content.length} bytes`);

    // div.product-card-same-products
    const similar: ProductType[] = [];
    $('div.product-card-same-products a.js-ecommerce-select-item').each((i, el) => {
      const data = $(el).attr('data-product');
      if (data) {
        const item = JSON.parse(data);
        if (item.productId && item.productSkuId) {
          const p: ProductType = {
            id: item.productId,
            skuId: item.productSkuId,
            skuCode: item.productSkuCode,
            name: item.name,
            type: item.type,
            parentId: item.parentProductId,
            isPreorder: item.isPreorder,
            genres: [] as ProductGenreType[],
            platforms: [] as ProductPlatformType[],
            isSale: item.isSale || false,
            priceStandart: +item.standardPrice || 0,
            priceActual: +item.actualPrice || 0,
            currency: item.currency || 'RUB',
          };
          if (item.genres) {
            for (const genre of item.genres) {
              p.genres.push({ id: genre.id as number, name: genre.name as string });
            }
          }
          if (item.platforms) {
            for (const platform of item.platforms) {
              p.platforms.push({ id: platform.id, name: platform.name });
            }
          }
          similar.push(p);
        }
      }
    });

    await page.close();
    return similar;
  }
}
