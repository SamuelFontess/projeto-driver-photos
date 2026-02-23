import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import folderRoutes from './routes/folderRoutes';
import fileRoutes from './routes/fileRoutes';
import familyRoutes from './routes/familyRoutes';
import { logger } from './lib/logger';
import { files_request_limit, max_upload_file_size_bytes } from './lib/multer';

export const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware (multer/fileFilter errors → 400)
app.use(
  (
    err: Error & { code?: string },
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled middleware error', err);
    if (err.message?.includes('File type not allowed')) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json({ error: `File too large (max ${Math.floor(max_upload_file_size_bytes / (1024 * 1024))} MB)` });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ error: 'Too many files (limit: ' + files_request_limit + ')' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
);
