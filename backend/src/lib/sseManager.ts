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
    // deletar do Set durante for...of é seguro em JS — o iterador não é afetado
    for (const res of set) {
      if (res.writableEnded || res.destroyed) {
        set.delete(res);
        continue;
      }
      try {
        res.write(payload);
      } catch {
        set.delete(res);
      }
    }
    if (set.size === 0) this.connections.delete(userId);
  }

  broadcast(data: unknown): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const [userId, set] of this.connections) {
      for (const res of set) {
        if (res.writableEnded || res.destroyed) {
          set.delete(res);
          continue;
        }
        try {
          res.write(payload);
        } catch {
          set.delete(res);
        }
      }
      if (set.size === 0) this.connections.delete(userId);
    }
  }
}

export const sseManager = new SseManager();
