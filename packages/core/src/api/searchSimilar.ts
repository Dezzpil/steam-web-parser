import axios from 'axios';
import { LRUCache } from 'lru-cache';
import { BaseCrawler } from '../crawler/base';
import { SearchGrabber } from '../workers/searchGrabber';
import { TaskType } from '../tools/task';
import { Browser } from 'puppeteer';
import { createAppsUrls, findAppByTitle, findRelatedAppsForApps } from '../tools/db';

export type SearchSimilarCommonType = {
  id: number;
  title: string;
  genre: string[];
};

async function processGameTitles(titles: string[]) {
  const processedTitles = new Set<string>();

  for (const title of titles) {
    const trimmedTitle = title.trim().toLowerCase();
    if (!trimmedTitle) continue;

    processedTitles.add(trimmedTitle);

    const hyphenIndex = trimmedTitle.indexOf('-');
    if (hyphenIndex !== -1) {
      const shortTitle = trimmedTitle.substring(0, hyphenIndex).trim();
      if (shortTitle) {
        processedTitles.add(shortTitle);
      }
    }
  }

  return Array.from(processedTitles);
}

const callbackCache = new LRUCache<string, boolean>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

export function isCallbackPending(callbackUrl: string): boolean {
  return callbackCache.has(callbackUrl);
}

export function registerCallback(callbackUrl: string) {
  callbackCache.set(callbackUrl, true);
}

export function unregisterCallback(callbackUrl: string) {
  callbackCache.delete(callbackUrl);
}

async function fetchAndCallback(callbackUrl: string, titleToTasks: Record<string, TaskType[]>) {
  const results: Record<string, SearchSimilarCommonType[]> = {};
  for (const entry of Object.entries(titleToTasks)) {
    const [title, tasks] = entry;
    results[title] = await findRelatedAppsForApps(tasks.map((t) => t.appId));
    try {
      await axios.post(callbackUrl, { results });
      console.log(`Callback sent to ${callbackUrl}`);
    } catch (err) {
      console.error(`Failed to call callback URL ${callbackUrl}:`, (err as Error).message);
    }
  }
  unregisterCallback(callbackUrl);
}

export async function processAndNotify(browser: Browser, titles: string[], callbackUrl: string) {
  const crawler = new BaseCrawler(browser);
  await crawler.init(2, false);
  console.log(`crawler initialized with ${crawler.queue.length()} tasks`);

  const processedTitles = await processGameTitles(titles);
  if (processedTitles.length === 0) {
    console.log('no valid titles found');
    await fetchAndCallback(callbackUrl, {});
    return;
  }
  console.log(`found ${processedTitles.length} valid titles`);

  const searchGrabber = new SearchGrabber(crawler.browser);
  const titleToTasks: Record<string, TaskType[]> = {};
  for (const title of processedTitles) {
    try {
      const existingApp = await findAppByTitle(title);
      if (existingApp) {
        titleToTasks[title] = [existingApp];
        console.log(`found title "${title}" in DB, skipping search`);
        continue;
      }
      titleToTasks[title] = await searchGrabber.searchApps(title);
    } catch (err) {
      console.error(`error searching for title "${title}":`, (err as Error).message);
    }
  }
  await searchGrabber.close();

  if (Object.keys(titleToTasks).length === 0) {
    await fetchAndCallback(callbackUrl, titleToTasks);
    return;
  }

  let tasksCnt = 0;
  const urls: TaskType[] = [];
  for (const entry of Object.entries(titleToTasks)) {
    const [title, tasks] = entry;
    tasksCnt += tasks.length;
    const urlsForTitle = await createAppsUrls(tasks, null, false, title);
    urls.push(...urlsForTitle);
  }
  console.log(`added new ${urls.length} urls from ${tasksCnt} tasks`);

  if (urls.length === 0) {
    await fetchAndCallback(callbackUrl, titleToTasks);
  } else {
    crawler.queue.drain(async () => {
      if (crawler.processed === 0) return;
      console.log('all tasks processed');
      await fetchAndCallback(callbackUrl, titleToTasks);
    });
    for (const task of urls) {
      await crawler.queue.push(task);
    }
  }
}
