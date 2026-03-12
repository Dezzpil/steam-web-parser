import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { getNewBrowserPage } from '../tools/browser';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';
import TagElement = cheerio.TagElement;

export type AppItem = {
  title: string;
  linkToLogoImg: string;
  descriptionMini: string;
  releaseDate: string;
  developers: string[];
  reviewsSummaryExplain: string;
  reviewsSummaryCount: number;
  genre: string[];
  popularTags: string[];
  categories: string[];
  description: string;
  linkToMoreLikeThis: string;
  isDownloadableContent: boolean;
};

const MoreLikeThisSelector = 'div[data-featuretarget=storeitems-carousel]';
const MoreLikeThisSectionsSelectors = ['#released', '#newreleases', '#topselling'];

export class AppGrabber extends EventEmitter {
  constructor(private _browser: Browser) {
    super();
  }

  private _page: Page | undefined;

  async overcomeAgeWidget(page: Page) {
    try {
      await page.waitForSelector('#view_product_page_btn', { timeout: 2000 });
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#ageYear').value = 1994;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#ageDay').value = 11;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#view_product_page_btn').click();
      });
    } catch (e) {
      throw e;
    }
  }

  async checkIsDownloadableContent(page: Page): Promise<boolean> {
    try {
      await page.waitForSelector('#game_area_purchase .game_area_bubble', {
        timeout: 1000,
      });
      return true;
    } catch (e) {
      return !e;
    }

    // game_area_dlc_bubble
    // game_area_soundtrack_bubble
  }

  async grabAndParseAppPage(url: string): Promise<AppItem> {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });
    try {
      await this._page.waitForSelector('#appHubAppName', { timeout: 5000 });
    } catch (e) {
      await this.overcomeAgeWidget(this._page);
    }

    const isDownloadableContent = await this.checkIsDownloadableContent(this._page);
    if (!isDownloadableContent) {
      await this._page.waitForSelector(MoreLikeThisSelector, { timeout: 10000 });
    }

    const html = await this._page.content();
    const $ = load(html);

    const reviewsBlock = $('#userReviews');
    const targetReviewsBlock = reviewsBlock.find('div.user_reviews_summary_row').last();
    let reviewsSummaryExplain = targetReviewsBlock.data('tooltip-html');
    if (!reviewsSummaryExplain) reviewsSummaryExplain = '-';
    const reviewsSummaryCountStr = targetReviewsBlock.find('span.responsive_hidden').text();
    const reviewsSummaryCount = +reviewsSummaryCountStr.replace(/\D+/g, '');

    const releaseDate = $('div.release_date').find('.date').text();
    const developers = $('#developers_list')
      .find('a')
      .map((i, el) => $(el).text().trim())
      .get();

    const title = $('#appHubAppName').text().trim();
    const linkToLogoImg = $('#gameHeaderImageCtn').find('img').first().attr('src');
    let descriptionMini = $('div.rightcol div.game_description_snippet').text();
    descriptionMini = descriptionMini.replace(/\s{2,}/gm, ' ').trim();

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

    const categories = $('#category_block')
      .find('.game_area_details_specs_ctn')
      .map((i, el) => $(el).find('.label').text().trim())
      .get();

    const description = $('#game_area_description').html();

    let linkToMoreLikeThis = '';
    const moreLikeThisData = $(MoreLikeThisSelector).data();
    if (moreLikeThisData) {
      linkToMoreLikeThis = (moreLikeThisData.props as unknown as { seeAllLink: string }).seeAllLink;
    }

    return {
      title,
      linkToLogoImg,
      descriptionMini,
      releaseDate,
      developers,
      reviewsSummaryExplain,
      reviewsSummaryCount,
      genre,
      popularTags,
      categories,
      description,
      linkToMoreLikeThis,
      isDownloadableContent,
    } as AppItem;
  }

  async grabAndParseMorePage(url: string) {
    this._page = this._page || (await getNewBrowserPage(this._browser));
    await this._page.goto(url, { waitUntil: 'domcontentloaded' });

    for (const selector of MoreLikeThisSectionsSelectors) {
      try {
        await this._page.waitForSelector(selector, { visible: true, timeout: 10000 });
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
          const title = $(el).find('div.similar_grid_item_name').text().trim();
          if (appId) urls.push({ href, appId: +appId, title: title || undefined });
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
