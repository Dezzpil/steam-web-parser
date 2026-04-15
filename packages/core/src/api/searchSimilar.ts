import axios from 'axios';
import { LRUCache } from 'lru-cache';
import { BaseCrawler } from '../crawler/base';
import { SearchGrabber } from '../workers/searchGrabber';
import { TaskType } from '../tools/task';
import { Browser } from 'puppeteer';
import { createAppsUrls, findAppByTitle, findRelatedAppsForApps, findAppsBasic } from '../tools/db';
import { inspect } from 'node:util';

export type SearchSimilarCommonType = {
  id: number;
  title: string;
  genre: string[];
  popularTags: string[];
  linkToLogoImg: string;
  appId: number; // duplicate of id for consumer convenience
};

export type SearchSimilarPerTitle = {
  app: SearchSimilarCommonType | null;
  similar: SearchSimilarCommonType[];
  foundByAnotherTerm?: string;
};

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

async function fetchAndCallback(
  callbackUrl: string,
  titleToTasks: Record<string, TaskType[]>,
  foundByAnotherTerm: Record<string, string> = {},
) {
  const results: Record<string, SearchSimilarPerTitle> = {};

  // собрать все appId, чтобы одной выборкой получить данные по основным играм
  const allIds = Array.from(
    new Set(
      Object.values(titleToTasks)
        .flat()
        .map((t) => t.appId),
    ),
  );

  const mainApps = await findAppsBasic(allIds);
  const mainAppsById = new Map<number, Omit<SearchSimilarCommonType, 'appId'> & { appId?: number }>(
    mainApps.map((a) => [a.id, a]),
  );

  for (const entry of Object.entries(titleToTasks)) {
    const [title, tasks] = entry;
    const rawSimilar = await findRelatedAppsForApps(tasks.map((t) => t.appId));

    const similar = rawSimilar.map((item) => ({
      ...item,
      appId: item.id,
    })) as SearchSimilarCommonType[];

    const primary = tasks[0]?.appId ? mainAppsById.get(tasks[0].appId) || null : null;
    const app = primary
      ? ({
          ...(primary as any),
          appId: primary.id,
        } as SearchSimilarCommonType)
      : null;

    results[title] = {
      app,
      similar,
      foundByAnotherTerm: foundByAnotherTerm[title],
    };
  }

  try {
    await axios.post(callbackUrl, { results });
    console.log(`Callback sent to ${callbackUrl} with result: ${inspect(results, false, 2)}`);
  } catch (err) {
    console.error(`Failed to call callback URL ${callbackUrl}:`, (err as Error).message);
  }
  unregisterCallback(callbackUrl);
}

export async function processAndNotify(browser: Browser, titles: string[], callbackUrl: string) {
  const crawler = new BaseCrawler(browser);
  await crawler.init(2, false);
  console.log(`crawler initialized with ${crawler.queue.length()} tasks`);

  const searchGrabber = new SearchGrabber(crawler.browser);
  const titleToTasks: Record<string, TaskType[]> = {};
  const foundByAnotherTerm: Record<string, string> = {};

  for (const originalTitle of titles) {
    const trimmedTitle = originalTitle.trim();
    if (!trimmedTitle) continue;

    let foundTasks: TaskType[] = [];
    let currentFoundByTerm: string | undefined;

    // 1. Сначала пробуем по данному названию
    try {
      const existingApp = await findAppByTitle(trimmedTitle);
      if (existingApp) {
        foundTasks = [existingApp];
        console.log(`found title "${trimmedTitle}" in DB`);
      } else {
        console.log(`searching for title "${trimmedTitle}"`);
        foundTasks = await searchGrabber.searchApps(trimmedTitle);
      }
    } catch (err) {
      console.error(`error searching for title "${trimmedTitle}":`, (err as Error).message);
    }

    // 2. Эвристики
    if (foundTasks.length === 0) {
      // 2a. Разбиение по +
      if (trimmedTitle.includes('+')) {
        const parts = trimmedTitle
          .split('+')
          .map((s) => s.trim())
          .filter((s) => s);
        console.log(`trying heuristic (+) for "${trimmedTitle}": ${parts.join(', ')}`);
        for (const part of parts) {
          try {
            const partExistingApp = await findAppByTitle(part);
            if (partExistingApp) {
              foundTasks.push(partExistingApp);
            } else {
              const partSearchTasks = await searchGrabber.searchApps(part);
              foundTasks.push(...partSearchTasks);
            }
          } catch (err) {
            console.error(`error heuristic (+) for part "${part}":`, (err as Error).message);
          }
        }
        if (foundTasks.length > 0) {
          currentFoundByTerm = parts.join(' + ');
        }
      }

      // 2b. Отбрасывание слова Bundle в конце строки
      if (foundTasks.length === 0 && /bundle$/i.test(trimmedTitle)) {
        const titleWithoutBundle = trimmedTitle.replace(/\s*bundle\s*$/i, '').trim();
        if (titleWithoutBundle) {
          console.log(`trying heuristic (bundle) for "${trimmedTitle}": ${titleWithoutBundle}`);
          try {
            const bundleExistingApp = await findAppByTitle(titleWithoutBundle);
            if (bundleExistingApp) {
              foundTasks = [bundleExistingApp];
            } else {
              foundTasks = await searchGrabber.searchApps(titleWithoutBundle);
            }
            if (foundTasks.length > 0) {
              currentFoundByTerm = titleWithoutBundle;
            }
          } catch (err) {
            console.error(
              `error heuristic (bundle) for title "${titleWithoutBundle}":`,
              (err as Error).message,
            );
          }
        }
      }

      // 2c. Отбрасывание части после -
      if (foundTasks.length === 0) {
        const hyphenIndex = trimmedTitle.indexOf('-');
        if (hyphenIndex !== -1) {
          const shortTitle = trimmedTitle.substring(0, hyphenIndex).trim();
          if (shortTitle) {
            console.log(`trying heuristic (-) for "${trimmedTitle}": ${shortTitle}`);
            try {
              const shortExistingApp = await findAppByTitle(shortTitle);
              if (shortExistingApp) {
                foundTasks = [shortExistingApp];
              } else {
                foundTasks = await searchGrabber.searchApps(shortTitle);
              }
              if (foundTasks.length > 0) {
                currentFoundByTerm = shortTitle;
              }
            } catch (err) {
              console.error(
                `error heuristic (-) for short title "${shortTitle}":`,
                (err as Error).message,
              );
            }
          }
        }
      }

      // 2d. Отбрасывание части после :
      if (foundTasks.length === 0) {
        const colonIndex = trimmedTitle.indexOf(':');
        if (colonIndex !== -1) {
          const shortTitle = trimmedTitle.substring(0, colonIndex).trim();
          if (shortTitle) {
            console.log(`trying heuristic (:) for "${trimmedTitle}": ${shortTitle}`);
            try {
              const shortExistingApp = await findAppByTitle(shortTitle);
              if (shortExistingApp) {
                foundTasks = [shortExistingApp];
              } else {
                foundTasks = await searchGrabber.searchApps(shortTitle);
              }
              if (foundTasks.length > 0) {
                currentFoundByTerm = shortTitle;
              }
            } catch (err) {
              console.error(
                `error heuristic (:) for short title "${shortTitle}":`,
                (err as Error).message,
              );
            }
          }
        }
      }
    }

    if (foundTasks.length > 0) {
      titleToTasks[originalTitle] = foundTasks;
      if (currentFoundByTerm && currentFoundByTerm.toLowerCase() !== trimmedTitle.toLowerCase()) {
        foundByAnotherTerm[originalTitle] = currentFoundByTerm;
      }
    } else {
      titleToTasks[originalTitle] = [];
    }
  }

  await searchGrabber.close();

  if (Object.keys(titleToTasks).length === 0) {
    await fetchAndCallback(callbackUrl, titleToTasks, foundByAnotherTerm);
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
    await fetchAndCallback(callbackUrl, titleToTasks, foundByAnotherTerm);
  } else {
    crawler.queue.drain(async () => {
      if (crawler.processed === 0) return;
      console.log('all tasks processed');
      await fetchAndCallback(callbackUrl, titleToTasks, foundByAnotherTerm);
    });
    for (const task of urls) {
      await crawler.queue.push(task);
    }
  }
}
