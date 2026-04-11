import type { Response } from 'express';

class SseManager {
  private connections = new Map<string, Set<Response>>();

  add(userId: string, res: Response): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(res);
  }

  remove(userId: string, res: Response): void {
    const set = this.connections.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.connections.delete(userId);
  }

  emit(userId: string, data: unknown): void {
    const set = this.connections.get(userId);
    if (!set) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
      res.write(payload);
    }
  }

  broadcast(data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const set of this.connections.values()) {
      for (const res of set) {
        res.write(payload);
      }
    }
  }
}

export const sseManager = new SseManager();
