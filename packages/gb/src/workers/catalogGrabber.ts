import { Browser, Page } from 'puppeteer';
import { ProductGenreType, ProductPlatformType, ProductType } from '../types';
import { getNewBrowserPage } from '../tools/browser';
import { writeFile } from 'node:fs/promises';

type CatalogGrabParamsType = {
  interface: string;
  partner: string;
  language: string;
  region: string;
  catalogGroup: string;
  imageDescriptors: null;
  sortingCriteria: null;
  listFilters: any[];
  rangeFilters: any[];
  binaryFilters: { filterCode: string; value: boolean }[];
  continuationToken: undefined | string;
};

export class CatalogGrabber {
  private _page: Page | null = null;
  private _params: CatalogGrabParamsType = {
    interface: 'catalogs',
    partner: 'GamersBase',
    language: 'EN',
    region: 'RU',
    catalogGroup: 'catalog',
    imageDescriptors: null,
    sortingCriteria: null,
    listFilters: [],
    rangeFilters: [],
    binaryFilters: [
      { filterCode: 'game-type', value: true },
      { filterCode: 'is-sale', value: false },
    ],
    continuationToken: undefined,
  };
  private _finished = false;

  constructor(public readonly browser: Browser) {}

  private _buildProductFromData(item: Record<string, any>): ProductType {
    const p = {
      id: item.productId,
      skuId: item.productSkuId,
      skuCode: item.productSkuCode,
      name: item.name,
      type: item.type,
      parentId: item.parentProductId,
      isPreorder: item.isPreorder,
      genres: [] as ProductGenreType[],
      platforms: [] as ProductPlatformType[],
    };
    for (const genre of item.genres) {
      p.genres.push({ id: genre.id as number, name: genre.name as string });
    }
    for (const platform of item.platforms) {
      p.platforms.push({ id: platform.id, name: platform.name });
    }
    return p;
  }

  async grab(): Promise<ProductType[]> {
    if (!this._page) {
      this._page = await getNewBrowserPage(this.browser);
      await this._page.goto('https://gamersbase.store/catalogs', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
    }

    if (this._finished) {
      return [];
    }

    const postBody = JSON.stringify(this._params);
    const result = await this._page.evaluate(async (body) => {
      try {
        const response = await fetch('/api/v1/catalogs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });
        const data = await response.json();
        return { data, error: null };
      } catch (e) {
        return { data: null, error: (e as any).message };
      }
    }, postBody);
    if (result.error) {
      throw new Error(result.error);
    }

    this._params.continuationToken = result.data.continuationToken;
    await writeFile('./catalog-grabber.json', JSON.stringify(result.data, null, 2), 'utf-8');

    if (result.data.products && result.data.products.length) {
      return result.data.products.map(this._buildProductFromData);
    } else {
      this._finished = true;
      return [];
    }
  }

  isFinished() {
    return this._finished;
  }
}
