import EventEmitter from 'node:events';
import { Browser, Page } from 'puppeteer';
import { TaskType } from '../tools/task';
import { load } from 'cheerio';

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

  async overcomeAgeWidget(page: Page) {
    try {
      await page.waitForSelector('#view_product_page_btn', { timeout: 3000 });
      await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#ageYear').value = 1993;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#ageDay').value = 25;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        document.querySelector('#view_product_page_btn').click();
      });
      // Дождаться завершения перехода после преодоления age gate,
      // иначе дальнейшие операции могут обратиться к отцепленному фрейму
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 });
      } catch (e) {
        // В некоторых случаях навигации может не быть (редирект через JS),
        // тогда убедимся что основной селектор страницы приложения появился
        await page.waitForSelector('#appHubAppName', { timeout: 7000 });
      }
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

  async grabAndParseAppPage(url: string, page: Page): Promise<AppItem> {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid URL protocol');
    if (!parsed.hostname.endsWith('steampowered.com')) throw new Error('Invalid domain');

    const resp = await page.goto(parsed.toString(), { waitUntil: 'domcontentloaded' });
    if (resp && resp.status() === 429) {
      const e = new Error('HTTP_429: Too Many Requests');
      // mark specially for throttling
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      e.code = 'HTTP_429';
      throw e;
    }
    try {
      await page.waitForSelector('#appHubAppName', { timeout: 5500 });
    } catch (e) {
      // If selector missing due to age gate try to overcome it, otherwise propagate timeout
      try {
        await this.overcomeAgeWidget(page);
        // гарантируем, что после преодоления видим основной селектор
        await page.waitForSelector('#appHubAppName', { timeout: 7000 });
      } catch (err) {
        const ex = err as Error;
        if (ex.name === 'TimeoutError') {
          const navErr = new Error('NAVIGATION_TIMEOUT');
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          navErr.code = 'NAVIGATION_TIMEOUT';
          throw navErr;
        }
        throw err;
      }
    }

    const isDownloadableContent = await this.checkIsDownloadableContent(page);
    if (!isDownloadableContent) {
      await page.waitForSelector(MoreLikeThisSelector, { timeout: 10500 });
    }

    const html = await page.content();
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
        return el.attribs.href.includes('genre');
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

  async grabAndParseMorePage(url: string, page: Page) {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Invalid URL protocol');
    if (!parsed.hostname.endsWith('steampowered.com')) throw new Error('Invalid domain');

    const resp = await page.goto(parsed.toString(), { waitUntil: 'domcontentloaded' });
    if (resp && resp.status() === 429) {
      const e = new Error('HTTP_429: Too Many Requests');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      e.code = 'HTTP_429';
      throw e;
    }

    for (const selector of MoreLikeThisSectionsSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 10000 });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // skip
      }
    }

    const html = await page.content();
    const $ = load(html);

    const urls: Array<TaskType> = [];
    for (const selector of MoreLikeThisSectionsSelectors) {
      $(`${selector}`)
        .find('div.similar_grid_item > a')
        .each((i, el) => {
          const href = el.attribs.href;
          const appId = href.match(/app\/(\d+)\//)?.[1];
          const title = $(el).find('div.similar_grid_item_name').text().trim();
          if (appId)
            urls.push({ href, appId: +appId, title: title || undefined, forMainLoop: true });
        });
    }

    return urls;
  }

  async close() {}
}
