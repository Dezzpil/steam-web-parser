import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { createBrowser } from './tools/browser';
import { BaseCrawler } from './crawler/base';
import { createAppsUrls } from './tools/db';
import { TaskType } from './tools/task';

const QueueConcurrency = 3;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        result.push(current);
        current = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function* iterateAppIdsFromCsv(csvPath: string): AsyncGenerator<number, void, unknown> {
  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headerParsed = false;
  let appIdIndex = -1;

  for await (const line of rl) {
    if (!headerParsed) {
      const headerCells = parseCsvLine(line).map((c) => c.trim().replace(/^\uFEFF/, ''));
      appIdIndex = headerCells.findIndex((c) => c.toLowerCase() === 'appid');
      headerParsed = true;
      if (appIdIndex === -1) {
        throw new Error("В CSV-файле не найдена колонка 'appId'.");
      }
      continue;
    }
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (appIdIndex >= cells.length) continue;
    const raw = (cells[appIdIndex] || '').trim();
    if (!raw) continue;
    const num = Number(raw.replace(/\D+/g, ''));
    if (!Number.isFinite(num) || num <= 0) continue;
    yield num;
  }
}

function toSteamAppUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

if (require.main === module) {
  (async () => {
    const [, , csvPathArg] = process.argv;
    if (!csvPathArg) {
      console.error('Использование: node --import tsx src/crawl_from_csv.ts <path/to/file.csv>');
      process.exit(1);
    }

    const resolvedPath = path.resolve(process.cwd(), csvPathArg);
    console.log(`Чтение CSV: ${resolvedPath}`);

    const browser = await createBrowser();
    process.on('exit', (code) => {
      browser.close().finally(() => process.exit(code));
    });

    const crawler = new BaseCrawler(browser);
    await crawler.init(QueueConcurrency, true, true);

    // Потоковая обработка CSV без загрузки всех appId в память
    const BATCH_SIZE = 200; // сколько appId собирать перед вставкой в БД/очередь
    const MAX_QUEUE_BACKLOG = 2000; // лимит отложенных задач в памяти очереди

    const idsIterator = iterateAppIdsFromCsv(resolvedPath);
    const toTasks = (ids: number[]): TaskType[] =>
      ids.map((id) => ({ appId: id, href: toSteamAppUrl(id), forMainLoop: true }));

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const waitQueueBelow = async (threshold: number) => {
      while (crawler.queue.length() > threshold) {
        await sleep(500);
      }
    };

    let batch: number[] = [];
    let seenAnyId = false;
    let fileDone = false;
    let totalQueued = 0;

    const onDrain = async () => {
      if (fileDone && crawler.queue.length() === 0 && crawler.queue.idle()) {
        console.log('Файл обработан, очередь пуста — завершаем.');
        process.exit(0);
      }
    };
    crawler.queue.drain(onDrain);

    const flushBatch = async () => {
      if (!batch.length) return;
      const tasks = toTasks(batch);
      batch = [];
      const tasksForQueue = await createAppsUrls(tasks, null, true);
      if (tasksForQueue.length) {
        await crawler.queue.push(tasksForQueue);
        totalQueued += tasksForQueue.length;
        if (crawler.queue.length() > MAX_QUEUE_BACKLOG) {
          await waitQueueBelow(Math.floor(MAX_QUEUE_BACKLOG / 2));
        }
      }
    };

    try {
      for await (const id of idsIterator) {
        seenAnyId = true;
        batch.push(id);
        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
        }
      }
      // файл дочитан
      fileDone = true;
      await flushBatch();
    } catch (e) {
      const err = e as Error;
      console.error(`Ошибка чтения CSV: ${err.message}`);
      process.exit(1);
    }

    if (!seenAnyId) {
      console.error('В CSV не найдено ни одного валидного appId.');
      process.exit(1);
    }

    console.log(`Инициализировано задач из CSV: ${totalQueued}. Ожидаем завершения очереди...`);
    // Возможно очередь уже пуста к этому моменту
    await onDrain();
  })();
}
