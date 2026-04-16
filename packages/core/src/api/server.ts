import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {
  countApps,
  findAllApps,
  findAppById,
  findRelatedApps,
  countFreeVsPaidApps,
  countDownloadableContent,
  findAppUrlsFoundBySearch,
} from '../tools/db';
import { findCrawlProcesses } from '../tools/crawlProcess';
import { crawlManager } from '../crawler/manager';
import { CrawlType, CrawlSortBy } from '../tools/crawlProcess';
import { findPriceOnlineProcesses } from '../tools/priceOnlineProcess';
import { priceOnlineManager } from '../crawler/priceOnlineManager';
import dotenv from 'dotenv';

dotenv.config();

import { createBrowser } from '../tools/browser';
import { processAndNotify, isCallbackPending, registerCallback } from './searchSimilar';

export async function createWebServer(port: number, q?: any): Promise<Express.Application> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Инициализируем менеджер краулинга (помечаем зависшие процессы как завершённые)
  await crawlManager.init();
  // Инициализируем менеджер сбора цены и онлайна
  await priceOnlineManager.init();

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Steam Web Parser API',
        version: '1.0.0',
        description: 'API for accessing Steam web parser data',
      },
      servers: [
        {
          url: process.env.API_BASE_URL || `http://localhost:${port}`,
        },
      ],
      components: {
        schemas: {
          App: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              description: { type: 'string' },
              descriptionMini: { type: 'string' },
              releaseDate: { type: 'string' },
              developers: { type: 'array', items: { type: 'string' } },
              genre: { type: 'array', items: { type: 'string' } },
              popularTags: { type: 'array', items: { type: 'string' } },
              categories: { type: 'array', items: { type: 'string' } },
              isDownloadableContent: { type: 'boolean' },
              lastOnline: { type: 'integer', nullable: true },
              lastPrice: { type: 'integer', nullable: true },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          SearchSimilarResult: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              appId: { type: 'integer', description: 'Alias of id for convenience' },
              title: { type: 'string' },
              genre: { type: 'array', items: { type: 'string' } },
              popularTags: { type: 'array', items: { type: 'string' } },
              linkToLogoImg: { type: 'string' },
            },
          },
          SearchSimilarPerTitle: {
            type: 'object',
            description:
              'Result for a single requested game title: main app info and a list of similar apps',
            properties: {
              app: { $ref: '#/components/schemas/SearchSimilarResult', nullable: true },
              similar: {
                type: 'array',
                items: { $ref: '#/components/schemas/SearchSimilarResult' },
              },
            },
          },
          SearchSimilarCallbackPayload: {
            type: 'object',
            properties: {
              results: {
                type: 'object',
                additionalProperties: { $ref: '#/components/schemas/SearchSimilarPerTitle' },
                description:
                  'Record where key is the requested game title and value contains main app (app) info and similar apps list (similar)',
              },
            },
          },
        },
      },
    },
    apis: [path.join(__dirname, '*.ts')], // Path to the API docs
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Serve swagger docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Permanent link to the API description
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  /**
   * @openapi
   * /api/queue/length:
   *   get:
   *     summary: Get current crawler queue length
   *     responses:
   *       200:
   *         description: Returns the length of the queue
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 length:
   *                   type: integer
   */
  app.get('/api/queue/length', (req: Request, res: Response) => {
    return res.json({ length: crawlManager.queueLength });
  });

  /**
   * @openapi
   * /api/apps:
   *   get:
   *     summary: Get a list of apps
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of apps to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of apps to skip
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [updatedAt, maxOnline, price, free]
   *           default: updatedAt
   *         description: Field to sort by
   *     responses:
   *       200:
   *         description: A list of apps and total count
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 apps:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/App'
   *                 total:
   *                   type: integer
   */
  app.get('/api/apps', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const sortBy = (req.query.sortBy as string) || 'updatedAt';
      const apps = await findAllApps(limit, offset, sortBy);
      const total = await countApps();
      return res.json({ apps, total });
    } catch (error) {
      console.error('Error fetching apps:', error);
      return res.status(500).json({ error: 'Failed to fetch apps' });
    }
  });

  /**
   * @openapi
   * /api/apps/{id}:
   *   get:
   *     summary: Get app by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: The app ID
   *     responses:
   *       200:
   *         description: The app data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/App'
   *       404:
   *         description: App not found
   */
  app.get('/api/apps/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const app = await findAppById(id);
      if (!app) {
        return res.status(404).json({ error: 'App not found' });
      }
      return res.json(app);
    } catch (error) {
      console.error(`Error fetching app ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to fetch app' });
    }
  });

  /**
   * @openapi
   * /api/apps/{id}/related:
   *   get:
   *     summary: Get related apps for a specific app
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: The app ID
   *     responses:
   *       200:
   *         description: A list of related apps
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/App'
   */
  app.get('/api/apps/:id/related', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const relatedApps = await findRelatedApps(id);
      return res.json(relatedApps);
    } catch (error) {
      console.error(`Error fetching related apps for ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to fetch related apps' });
    }
  });

  /**
   * @openapi
   * /api/stats:
   *   get:
   *     summary: Get database statistics
   *     responses:
   *       200:
   *         description: Database statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalApps:
   *                   type: integer
   *                 freeApps:
   *                   type: integer
   *                 paidApps:
   *                   type: integer
   *                 downloadable:
   *                   type: integer
   *                 nonDownloadable:
   *                   type: integer
   */
  app.get('/api/stats', async (req, res) => {
    try {
      const totalApps = await countApps();
      const { freeApps, paidApps } = await countFreeVsPaidApps();
      const { downloadable, nonDownloadable } = await countDownloadableContent();

      return res.json({
        totalApps,
        freeApps,
        paidApps,
        downloadable,
        nonDownloadable,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  /**
   * @openapi
   * /api/search-results:
   *   get:
   *     summary: Get a list of app URLs found by search
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Maximum number of results to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of results to skip
   *     responses:
   *       200:
   *         description: A list of search results and total count
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 appUrls:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id: { type: 'integer' }
   *                       path: { type: 'string' }
   *                       foundByTerm: { type: 'string' }
   *                       createdAt: { type: 'string', format: 'date-time' }
   *                       grabbedAt: { type: 'string', format: 'date-time', nullable: true }
   *                       App: { $ref: '#/components/schemas/App', nullable: true }
   *                 total:
   *                   type: integer
   */
  app.get('/api/search-results', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const { appUrls, total } = await findAppUrlsFoundBySearch(limit, offset);
      return res.json({ appUrls, total });
    } catch (error) {
      console.error('Error fetching search results:', error);
      return res.status(500).json({ error: 'Failed to fetch search results' });
    }
  });

  const browser = await createBrowser();

  /**
   * @openapi
   * /api/search-similar:
   *   post:
   *     summary: Запустить поиск похожих игр
   *     description: |
   *       Выполняет поиск игр в Steam по переданным названиям и находит похожие.
   *       В callback придёт объект с ключами — искомыми названиями, значениями будут объекты с двумя полями:
   *       `app` — данные найденной игры (popularTags, genre, appId, linkToLogoImg),
   *       и `similar` — массив похожих игр.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               games:
   *                 type: array
   *                 items:
   *                   type: string
   *               callbackUrl:
   *                 type: string
   *                 description: URL that will receive a POST request with the search results.
   *     responses:
   *       202:
   *         description: Search started
   *     callbacks:
   *       onSearchComplete:
   *         '{$request.body#/callbackUrl}':
   *           post:
   *             summary: Post search results to callback URL
   *             requestBody:
   *               required: true
   *               content:
   *                 application/json:
   *                   schema:
   *                     $ref: '#/components/schemas/SearchSimilarCallbackPayload'
   *             responses:
   *               200:
   *                 description: Callback received successfully
   */
  app.post('/api/search-similar', async (req, res) => {
    const { games, callbackUrl } = req.body;

    if (!games || !Array.isArray(games) || !callbackUrl) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    if (isCallbackPending(callbackUrl)) {
      console.log(`Callback URL ${callbackUrl} is already being processed`);
      return res.status(409).json({ error: 'Callback URL is already being processed' });
    }

    registerCallback(callbackUrl);

    // Start background processing
    console.log(
      `Starting background processing for callback URL:${callbackUrl} and games:${games.join(',')}`,
    );
    processAndNotify(browser, games, callbackUrl).catch((err: any) => {
      console.error('Background processing error:', err);
    });

    return res.status(202).send({
      status: 'Accepted',
      message: 'Processing started. Results will be sent to the callback URL.',
    });
  });

  /**
   * @openapi
   * /api/crawlings:
   *   get:
   *     summary: Получить список краулингов с пагинацией
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: Список краулингов и общее кол-во
   */
  app.get('/api/crawlings', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const { items, total } = await findCrawlProcesses(limit, offset);
      return res.json({ items, total });
    } catch (error) {
      console.error('Error fetching crawlings:', error);
      return res.status(500).json({ error: 'Failed to fetch crawlings' });
    }
  });

  /**
   * @openapi
   * /api/crawlings/active:
   *   get:
   *     summary: Получить текущий активный краулинг и сообщения из памяти
   *     responses:
   *       200:
   *         description: Активный краулинг (или null) и список сообщений
   */
  app.get('/api/crawlings/active', (req, res) => {
    return res.json({
      process: crawlManager.activeProcess,
      messages: crawlManager.messages,
    });
  });

  /**
   * @openapi
   * /api/crawlings/start:
   *   post:
   *     summary: Запустить краулинг
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [type]
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [crawl, crawl:top, crawl:catalog]
   *               sortBy:
   *                 type: string
   *                 enum: [Released_DESC, Reviews_DESC]
   *                 nullable: true
   *     responses:
   *       202:
   *         description: Краулинг запущен
   *       409:
   *         description: Краулинг уже запущен
   *       400:
   *         description: Неверные параметры
   */
  /**
   * @openapi
   * /api/crawlings/stop:
   *   post:
   *     summary: Остановить активный краулинг
   *     responses:
   *       200:
   *         description: Краулинг остановлен
   *       404:
   *         description: Нет активного краулинга
   */
  app.post('/api/crawlings/stop', async (req, res) => {
    if (!crawlManager.isRunning()) {
      return res.status(404).json({ error: 'Нет активного краулинга' });
    }
    try {
      await crawlManager.stop();
      return res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/crawlings/start', async (req, res) => {
    const { type, sortBy = null } = req.body;

    const validTypes: CrawlType[] = ['crawl', 'crawl:top', 'crawl:catalog'];
    if (!type || !validTypes.includes(type as CrawlType)) {
      return res.status(400).json({ error: 'Неверный тип краулинга' });
    }

    const validSortBy: Array<CrawlSortBy> = ['Released_DESC', 'Reviews_DESC', null];
    if (!validSortBy.includes(sortBy as CrawlSortBy)) {
      return res.status(400).json({ error: 'Неверный sortBy' });
    }

    if (crawlManager.isRunning()) {
      return res.status(409).json({ error: 'Краулинг уже запущен' });
    }

    try {
      const process = await crawlManager.start(type as CrawlType, sortBy as CrawlSortBy);
      return res.status(202).json({ process });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: msg });
    }
  });

  /**
   * @openapi
   * /api/price-online:
   *   get:
   *     summary: Список процессов сбора цены и онлайна
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *     responses:
   *       200:
   *         description: Список процессов и общее количество
   */
  app.get('/api/price-online', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await findPriceOnlineProcesses(limit, offset);
      return res.json(result);
    } catch (error) {
      console.error('Error fetching price-online processes:', error);
      return res.status(500).json({ error: 'Failed to fetch price-online processes' });
    }
  });

  /**
   * @openapi
   * /api/price-online/active:
   *   get:
   *     summary: Активный процесс сбора цены/онлайна и сообщения из памяти
   *     responses:
   *       200:
   *         description: Активный процесс (или null) и список сообщений
   */
  app.get('/api/price-online/active', (req, res) => {
    return res.json({
      process: priceOnlineManager.activeProcess,
      messages: priceOnlineManager.messages,
    });
  });

  /**
   * @openapi
   * /api/price-online/start:
   *   post:
   *     summary: Запустить сбор цены и онлайна
   *     responses:
   *       202:
   *         description: Процесс запущен
   *       409:
   *         description: Процесс уже запущен
   */
  app.post('/api/price-online/start', async (req, res) => {
    if (priceOnlineManager.isRunning()) {
      return res.status(409).json({ error: 'Сбор цены и онлайна уже запущен' });
    }
    try {
      const process = await priceOnlineManager.start();
      return res.status(202).json({ process });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: msg });
    }
  });

  /**
   * @openapi
   * /api/price-online/stop:
   *   post:
   *     summary: Остановить активный сбор цены и онлайна
   *     responses:
   *       200:
   *         description: Процесс остановлен
   *       404:
   *         description: Нет активного процесса
   */
  app.post('/api/price-online/stop', async (req, res) => {
    if (!priceOnlineManager.isRunning()) {
      return res.status(404).json({ error: 'Нет активного процесса сбора цены и онлайна' });
    }
    try {
      await priceOnlineManager.stop();
      return res.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: msg });
    }
  });

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Проверка состояния сервиса
   *     responses:
   *       200:
   *         description: Сервис работает
   */
  app.get('/health', (_req, res) => {
    return res.json({ status: 'ok' });
  });

  // starting server
  return new Promise((resolve) => {
    // Listen on all interfaces to work inside Docker
    app.listen(port, '0.0.0.0', () => {
      console.log(`API running on port ${port}`);
      resolve(app);
    });
  });
}

const port = parseInt(process.env.API_PORT || '3000');
if (require.main === module) {
  createWebServer(port)
    .then(() => {
      // console.log(`API started on port ${port}`);
    })
    .catch((error) => {
      console.error('Error starting API:', error);
    });
}
