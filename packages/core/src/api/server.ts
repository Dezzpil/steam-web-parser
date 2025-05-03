import express, { Request, Response } from 'express';
import cors from 'cors';
import { countApps, findAllApps, findAppById, findRelatedApps } from '../tools/db';
import dotenv from 'dotenv';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export function createWebServer(port: number, q: any): Promise<Express.Application> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  app.get('/api/queue/length', (req: Request, res: Response) => {
    return res.json({ length: q.length() });
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  app.get('/api/apps', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const apps = await findAllApps(limit, offset);
      const total = await countApps();
      return res.json({ apps, total });
    } catch (error) {
      console.error('Error fetching apps:', error);
      return res.status(500).json({ error: 'Failed to fetch apps' });
    }
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
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

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`API server running on port ${port}`);
      resolve(app);
    });
  });
}

dotenv.config();

const Port = parseInt(process.env.PORT || '3000');
if (require.main === module) {
  createWebServer(Port, [])
    .then((app) => {
      console.log(`App ${app} started`);
    })
    .catch((error) => {
      console.error('Error starting server:', error);
    });
}
