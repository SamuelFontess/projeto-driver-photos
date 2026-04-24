import WebSocket from 'ws';
import { sseManager } from './sseManager';
import { logger } from './logger';

const MAX_RECONNECT_DELAY_MS = 30_000;

function connect(attempt = 0): void {
  const url = process.env.EMAIL_WORKER_WS_URL;
  const apiKey = process.env.EMAIL_WORKER_ADMIN_API_KEY;

  if (!url || !apiKey) {
    logger.warn('EMAIL_WORKER_WS_URL or EMAIL_WORKER_ADMIN_API_KEY not set — SSE routing disabled');
    return;
  }

  const ws = new WebSocket(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  let reconnectAttempt = attempt;

  ws.on('open', () => {
    logger.info('Connected to email-worker WS');
    reconnectAttempt = 0;
  });

  ws.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString()) as { event?: string; userId?: string };
      if (event.event === 'email:status' && event.userId) {
        sseManager.emit(event.userId, event);
      } else if (event.event === 'message') {
        sseManager.broadcast(event);
      }
    } catch {
      // ignora mensagens malformadas
    }
  });

  ws.on('close', () => {
    const delay = Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    logger.info(`Email-worker WS disconnected, reconnecting in ${delay}ms`);
    setTimeout(() => connect(reconnectAttempt + 1), delay);
  });

  ws.on('error', (err) => {
    logger.warn('Email-worker WS error', { error: err.message });
  });
}

export function startWsClient(): void {
  connect();
}
