import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { load } from 'cheerio';
import {
  ProductGenreType,
  ProductGenresMapType,
  ProductPlatformType,
  ProductPlatformsMapType,
  ProductType,
  ProductProxyFromCSV,
} from '../types';

export class ProductGrabber {
  constructor(public readonly browser: Browser) {}

  async _openPage(id: number, skuCode: string) {
    const page = await getNewBrowserPage(this.browser);
    const url = `https://gamersbase.store/game/${skuCode}`;
    console.log(`${id}:${skuCode} going to ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForSelector('div.product-card-info.product-card-tabs', { timeout: 5000 });
      return page;
    } catch (e) {
      console.log(`${id}:${skuCode} error: ${(e as any).message}`);
      await page.close();
      return null;
    }
  }

  async grab(
    proxy: ProductProxyFromCSV,
    genresMap: ProductGenresMapType,
    platformsMap: ProductPlatformsMapType,
  ) {
    const page = await this._openPage(proxy.id, proxy.skuCode);
    if (!page) return null;

    const content = await page.content();
    const $ = load(content);
    console.log(`${proxy.id}:${proxy.skuCode} grabbed ${content.length} bytes`);

    const genres: ProductGenreType[] = [];
    const platforms: ProductPlatformType[] = [];
    $('div.product-card-main-properties a').each((i, el) => {
      const text = $(el).text();
      if (genresMap.has(text)) {
        genres.push(genresMap.get(text) as ProductGenreType);
      }
      if (platformsMap.has(text)) {
        platforms.push(platformsMap.get(text) as ProductPlatformType);
      }
    });

    let currency = 'RUB';
    let priceActual = 0;
    let priceStandart = 0;
    const data = $('div.buy-button').attr('data-product');
    if (data) {
      try {
        const json = JSON.parse(data);
        if (json.priceData) {
          priceActual = +json.priceData!.actualPrice;
          priceStandart = +json.priceData!.standardPrice;
          currency = json.priceData.currency;
        }
      } catch (error) {
        console.error(`${proxy.id}:${proxy.skuCode} failed to parse product data`, error);
      }
    } else {
      console.warn(`${proxy.id}:${proxy.skuCode} no BUY-button data found`);
    }

    const product: ProductType = {
      id: proxy.id,
      skuId: proxy.skuId,
      skuCode: proxy.skuCode,
      name: proxy.name,
      type: proxy.type,
      genres,
      platforms,
      currency,
      priceActual,
      priceStandart,
      isPreorder: proxy.isPreorder,
      isSale: proxy.isSale,
      parentId: null,
    };

    console.log(`${proxy.id}:${proxy.skuCode} try to find similar products`);
    const similar = await this.grabSimilar(product, page);
    return { product, similar };
  }

  async grabSimilar(product: ProductType, page?: Page | null) {
    if (!page) {
      page = await this._openPage(product.id, product.skuCode);
      if (!page) return null;
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
