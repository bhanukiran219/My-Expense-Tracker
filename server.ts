import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createServer as createViteServer } from 'vite';
import { router as apiRouter } from './server/routes.js';
import { exec } from 'child_process';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Mount API routes
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/data/**/*',
            '**/data/db.json',
            '**/server/**',
            '**/*.json',
            '**/.system_generated/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const localUrl = `http://localhost:${PORT}`;
    console.log(`\n==================================================`);
    console.log(`  🚀 Ledgerly Expense Tracker`);
    console.log(`  🔗 Local URL:  ${localUrl}`);
    console.log(`  🌐 Network:    http://0.0.0.0:${PORT}`);
    console.log(`==================================================\n`);

    if (process.env.NODE_ENV !== 'production' && process.env.AUTO_OPEN !== 'false') {
      const openCommand = process.platform === 'win32'
        ? `start "" "${localUrl}"`
        : process.platform === 'darwin'
        ? `open "${localUrl}"`
        : `xdg-open "${localUrl}"`;

      exec(openCommand, (err) => {
        if (err) {
          // Non-critical: fail silently if browser cannot be launched
        }
      });
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
