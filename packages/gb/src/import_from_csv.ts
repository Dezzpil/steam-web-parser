import { createReadStream, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createBrowser } from './tools/browser';
import { ProductGrabber } from './workers/productGrabber';
import {
  fetchGenres,
  fetchPlatforms,
  insertProduct,
  insertSimilarForProduct,
  isProductExists,
} from './tools/db';
import { ProductGenresMapType, ProductPlatformsMapType, ProductProxyFromCSV } from './types';

type CliOptions = {
  file: string;
  idCol: string;
  nameCol: string;
  skuIdCol: string;
  skuCodeCol: string;
  typeCol: string;
  isPreorderCol: string;
  isSaleCol: string;
  dryRun: boolean;
  limit: number | null;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    file: '',
    idCol: 'Id',
    nameCol: 'Name',
    skuIdCol: 'Skuid',
    skuCodeCol: 'Skucode',
    typeCol: 'Type',
    isPreorderCol: 'Ispreorder',
    isSaleCol: 'Issale',
    dryRun: false,
    limit: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const [key, valRaw] = a.startsWith('--') ? a.split('=') : [a, ''];
    switch (key) {
      case '--file':
        opts.file = valRaw || argv[++i];
        break;
      case '--id-col':
        opts.idCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--name-col':
        opts.nameCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--skuid-col':
        opts.skuIdCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--skucode-col':
        opts.skuCodeCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--type-col':
        opts.typeCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--ispreorder-col':
        opts.isPreorderCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--issale-col':
        opts.isSaleCol = (valRaw || argv[++i] || '').trim();
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--limit':
        opts.limit = Number(valRaw || argv[++i]);
        if (!Number.isFinite(opts.limit)) opts.limit = null;
        break;
      case '-h':
      case '--help':
        printUsageAndExit(0);
        break;
      default:
        // ignore unknown
        break;
    }
  }

  if (!opts.file) {
    console.error('Не указан путь к CSV-файлу.');
    printUsageAndExit(1);
  }
  return opts;
}

function printUsageAndExit(code: number) {
  console.log(`Использование:
  pnpm --filter @steam-web-parser/gb run import:csv -- --file packages/gb/exports/file.csv [опции]

Опции:
  --id-col <Id>               Название колонки с ID продукта (по умолчанию: Id)
  --name-col <Name>           Название колонки с именем продукта (по умолчанию: Name)
  --skuid-col <Skuid>         Название колонки с SKU ID (по умолчанию: Skuid)
  --skucode-col <Skucode>     Название колонки со SKU-кодом (по умолчанию: Skucode)
  --type-col <Type>           Название колонки с типом продукта (по умолчанию: Type)
  --ispreorder-col <IsPreorder> Название колонки с флагом предзаказа (по умолчанию: IsPreorder)
  --issale-col <IsSale>       Название колонки с флагом продажи (по умолчанию: IsSale)
  --limit <N>                 Ограничить обработку первыми N строками
  --dry-run                   Ничего не записывать в БД, только логировать и собирать статистику
`);
  process.exit(code);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
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

type Stats = {
  rowsTotal: number;
  processed: number;
  skippedExisting: number;
  inserted: number;
  similarSaved: number;
  errors: { line: number; reason: string; id?: number; skuCode?: string; name?: string }[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
};

async function main() {
  const opts = parseArgs(process.argv);
  const resolvedPath = path.resolve(process.cwd(), opts.file);
  console.log(`Чтение CSV: ${resolvedPath}`);

  const startedAt = new Date();
  const stats: Stats = {
    rowsTotal: 0,
    processed: 0,
    skippedExisting: 0,
    inserted: 0,
    similarSaved: 0,
    errors: [],
    startedAt: startedAt.toISOString(),
  };

  const browser = await createBrowser();
  process.on('exit', (code) => {
    browser.close().finally(() => process.exit(code));
  });

  const rl = createInterface({
    input: createReadStream(resolvedPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  let cIdx = {
    id: -1,
    skuId: -1,
    skuCode: -1,
    name: -1,
    type: -1,
    isPreorder: -1,
    isSale: -1,
  };
  let lineNo = 0;
  let processedCount = 0;

  const toBool = (v: string | undefined) => (v || '').toLowerCase() === 'true';
  const toInt = (v: string | undefined) => {
    if (!v) return NaN;
    const n = Number(String(v).replace(/\D+/g, ''));
    return Number.isFinite(n) ? n : NaN;
  };

  try {
    for await (const line of rl) {
      lineNo++;
      if (!header) {
        header = parseCsvLine(line).map((c) => c.trim().replace(/^\uFEFF/, ''));
        cIdx = {
          id: header.findIndex((c) => c === opts.idCol),
          name: header.findIndex((c) => c === opts.nameCol),
          skuId: header.findIndex((c) => c === opts.skuIdCol),
          skuCode: header.findIndex((c) => c === opts.skuCodeCol),
          type: header.findIndex((c) => c === opts.typeCol),
          isPreorder: header.findIndex((c) => c === opts.isPreorderCol),
          isSale: header.findIndex((c) => c === opts.isSaleCol),
        };
        if (
          cIdx.id < 0 ||
          cIdx.skuId < 0 ||
          cIdx.name < 0 ||
          cIdx.skuCode < 0 ||
          cIdx.isPreorder < 0 ||
          cIdx.isSale < 0
        ) {
          throw new Error(`Не найдены обязательные колонки!`);
        }
        continue;
      }

      if (!line.trim()) continue;
      stats.rowsTotal++;

      if (opts.limit && processedCount >= opts.limit) break;

      const cells = parseCsvLine(line);

      const id = cIdx.id >= 0 ? toInt(cells[cIdx.id]) : NaN;
      const name = (cells[cIdx.name] || '').trim();
      const skuId = cIdx.skuId >= 0 ? toInt(cells[cIdx.skuId]) : NaN;
      const skuCode = (cells[cIdx.skuCode] || '').trim();

      if (!id || !name || !skuCode) {
        stats.errors.push({ line: lineNo, reason: 'Пустые id/name/skuCode', id, name, skuCode });
        continue;
      }

      try {
        const exists = await isProductExists(id);
        if (exists) {
          stats.skippedExisting++;
          continue;
        }

        // Собираем минимальный ProductType из CSV
        const proxy: ProductProxyFromCSV = {
          id,
          skuId,
          skuCode,
          name,
          type: cIdx.type >= 0 ? (cells[cIdx.type] || 'game').trim() : 'game',
          isPreorder: cIdx.isPreorder >= 0 ? toBool(cells[cIdx.isPreorder]) : false,
          isSale: cIdx.isSale >= 0 ? toBool(cells[cIdx.isSale]) : false,
        };

        if (!Number.isFinite(proxy.id) || !Number.isFinite(proxy.skuId)) {
          // Без корректных ID вставка не состоится — логируем и пропускаем
          stats.errors.push({
            line: lineNo,
            reason: 'Отсутствует числовой Id/Skuid для продукта',
            skuCode,
            name,
          });
          continue;
        }

        const genres = await fetchGenres(true);
        const platforms = await fetchPlatforms(true);

        const grabber = new ProductGrabber(browser);
        const result = await grabber.grab(
          proxy,
          genres as ProductGenresMapType,
          platforms as ProductPlatformsMapType,
        );

        if (!result) {
          stats.errors.push({
            line: lineNo,
            reason: 'Не удалось получить продукт',
            skuCode,
            name,
          });
          continue;
        }

        const { product, similar } = result;
        if (!opts.dryRun) {
          try {
            await insertProduct(product);
            stats.inserted++;
          } catch (e) {
            // Возможно, уже есть запись с таким id
            const msg = (e as any)?.message || String(e);
            console.log(`${product.id}:${product.skuCode} insert error: ${msg}`);
          }
        }

        // Парсинг страницы и сохранение похожих
        // const similar = await grabber.grabSimilar(proxy);
        if (!opts.dryRun && similar && similar.length) {
          await insertSimilarForProduct(proxy.id, similar);
        }
        stats.similarSaved += similar ? similar.length : 0;
        processedCount++;
        stats.processed++;
      } catch (e) {
        stats.errors.push({
          line: lineNo,
          reason: (e as any).message || String(e),
          skuCode,
          name,
        });
      }
    }
  } catch (e) {
    console.error(`Ошибка обработки CSV: ${(e as any).message}`);
    process.exitCode = 1;
  }

  stats.finishedAt = new Date().toISOString();
  stats.durationMs = Date.now() - Date.parse(stats.startedAt);

  const outDir = path.dirname(resolvedPath);
  const base = path.basename(resolvedPath).replace(/\.[^.]+$/, '');
  const outPath = path.join(outDir, `${base}.report.json`);
  writeFileSync(outPath, JSON.stringify(stats, null, 2), 'utf-8');
  console.log(`Статистика сохранена в: ${outPath}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
