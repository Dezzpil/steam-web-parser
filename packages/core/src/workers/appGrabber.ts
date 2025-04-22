import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/page';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';
import TagElement = cheerio.TagElement;

export type AppItem = {
  title: string;
  description: string;
  popularTags: string[];
  genre: string[];
  developer: string;
  publisher: string;
  releasedAt: Date;
  linkToMoreLikeThis: string;
};

export class AppGrabber extends EventEmitter {
  constructor(private _browser: Browser) {
    super();
  }

  private _page: Page | undefined;
  private _appPageMoreLikeThisSelector = 'div[data-featuretarget=storeitems-carousel]';

  async grabAndParseAppPage(url: string): Promise<AppItem> {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });
    await this._page.waitForSelector(this._appPageMoreLikeThisSelector);
    const html = await this._page.content();

    const $ = load(html);

    const moreLikeThisData = $(this._appPageMoreLikeThisSelector).data();
    const linkToMoreLikeThis = (moreLikeThisData.props as unknown as { seeAllLink: string })
      .seeAllLink;

    // Example: Extract all game titles
    const title = $('#appHubAppName').text().trim();
    const description = $('#game_area_description').text().trim();
    const popularTags = $('#glanceCtnResponsiveRight')
      .find('a')
      .filter((i, el) => $(el).css('display') !== 'none')
      .map((i, el) => $(el).text().trim())
      .get();
    const genre = $('#genresAndManufacturer')
      .find('a')
      .filter((i, el) => {
        return (el as TagElement).attribs.href.includes('genre');
      })
      .map((i, el) => $(el).text().trim())
      .get();
    const developer = 'FooBar';
    const publisher = 'PewPew';
    const releasedAt = new Date();

    return {
      title,
      description,
      popularTags,
      genre,
      developer,
      publisher,
      releasedAt,
      linkToMoreLikeThis,
    };
  }

  async grabAndParseMorePage(url: string) {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });
    const selectors = ['#released', '#newreleases', '#topselling'];

    for (const selector of selectors) {
      try {
        await this._page.waitForSelector(selector, { visible: true, timeout: 5000 });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        continue;
      }
    }

    const html = await this._page.content();
    const $ = load(html);

    const urls: Array<TaskType> = [];
    for (const selector of selectors) {
      $(`${selector}`)
        .find('div.similar_grid_item > a')
        .each((i, el) => {
          const href = (el as TagElement).attribs.href;
          const appId = href.match(/app\/(\d+)\//)?.[1];
          if (appId) urls.push({ href, appId: +appId });
        });
    }

    return urls;
  }
}
