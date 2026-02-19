import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import folderRoutes from './routes/folderRoutes';
import fileRoutes from './routes/fileRoutes';
import { logger } from './lib/logger';
import { ensureUploadDir } from './lib/uploads';
import { files_request_limit } from './lib/multer';

dotenv.config();

ensureUploadDir();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware (multer/fileFilter errors → 400)
app.use((err: Error & { code?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled middleware error', err);
  if (err.message?.includes('File type not allowed')) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'File too large (max 10 MB)' });
    return;
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(400).json({ error: 'Too many files (limit: ' + files_request_limit + ')' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Auth routes: http://localhost:${PORT}/api/auth`);
});
