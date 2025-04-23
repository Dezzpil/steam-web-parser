import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';
import TagElement = cheerio.TagElement;

export type AppItem = {
  title: string;
  description: string;
  genre: string[];
  popularTags: string[];
  linkToMoreLikeThis: string;
};

const DescTitleRegExp = new RegExp(/^(About This Software)+|(About This Game)+/gimu);
const MoreLikeThisSelector = 'div[data-featuretarget=storeitems-carousel]';
const MoreLikeThisSectionsSelectors = ['#released', '#newreleases', '#topselling'];

export class AppGrabber extends EventEmitter {
  constructor(private _browser: Browser) {
    super();
  }

  private _page: Page | undefined;

  async grabAndParseAppPage(url: string): Promise<AppItem> {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });
    await this._page.waitForSelector(MoreLikeThisSelector, { timeout: 10000 });
    const html = await this._page.content();

    const $ = load(html);

    const moreLikeThisData = $(MoreLikeThisSelector).data();
    const linkToMoreLikeThis = (moreLikeThisData.props as unknown as { seeAllLink: string })
      .seeAllLink;

    // Example: Extract all game titles
    const title = $('#appHubAppName').text().trim();
    let description = $('#game_area_description').text();
    description = description.replace(DescTitleRegExp, '').replace(/\s+/gm, ' ').trim();
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

    return {
      title,
      description,
      genre,
      popularTags,
      linkToMoreLikeThis,
    };
  }

  async grabAndParseMorePage(url: string) {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });

    for (const selector of MoreLikeThisSectionsSelectors) {
      try {
        await this._page.waitForSelector(selector, { visible: true, timeout: 5000 });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // skip
      }
    }

    const html = await this._page.content();
    const $ = load(html);

    const urls: Array<TaskType> = [];
    for (const selector of MoreLikeThisSectionsSelectors) {
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

  async close() {
    if (this._page) {
      await this._page.close();
    }
  }
}
