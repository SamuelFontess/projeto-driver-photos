import type { Response } from 'express';

class SseManager {
  private connections = new Map<string, Response>();

  add(userId: string, res: Response): void {
    this.connections.set(userId, res);
  }

  remove(userId: string): void {
    this.connections.delete(userId);
  }

  emit(userId: string, data: unknown): void {
    const res = this.connections.get(userId);
    if (!res) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

export const sseManager = new SseManager();
