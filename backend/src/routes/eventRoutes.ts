import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sseManager } from '../lib/sseManager';

const router = Router();

const SSE_KEEPALIVE_INTERVAL_MS = 25_000;

router.get('/', authenticate, (req, res) => {
  const userId = req.user!.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sseManager.add(userId, res);

  const keepalive = setInterval(() => {
    res.write(':\n\n');
  }, SSE_KEEPALIVE_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(keepalive);
    sseManager.remove(userId);
  });
});

export default router;
