import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  countApps,
  findAllApps,
  findAppById,
  findRelatedApps,
  countFreeVsPaidApps,
  countDownloadableContent,
} from '../tools/db';
import dotenv from 'dotenv';
import { createBrowser } from '../tools/browser';
import { processAndNotify } from './searchSimilar';

export async function createWebServer(port: number, q?: any): Promise<Express.Application> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/queue/length', (req: Request, res: Response) => {
    return res.json({ length: q ? q.length() : 0 });
  });

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

  const browser = await createBrowser();

  app.post('/api/search-similar', async (req, res) => {
    const { games, callbackUrl } = req.body;

    if (!games || !Array.isArray(games) || !callbackUrl) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Start background processing
    processAndNotify(browser, games, callbackUrl).catch((err: any) => {
      console.error('Background processing error:', err);
    });

    return res.status(202).send({
      status: 'Accepted',
      message: 'Processing started. Results will be sent to the callback URL.',
    });
  });

  // starting server
  return new Promise((resolve) => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`API running on port ${port}`);
      resolve(app);
    });
  });
}

dotenv.config();

const port = parseInt(process.env.PORT || '3000');
if (require.main === module) {
  createWebServer(port)
    .then(() => {
      // console.log(`API started on port ${port}`);
    })
    .catch((error) => {
      console.error('Error starting API:', error);
    });
}
