declare module 'redis' {
  export type RedisClientType = {
    isOpen: boolean;
    isReady: boolean;
    on(event: string, listener: (...args: unknown[]) => void): void;
    connect(): Promise<void>;
    get(options: unknown, key: string): Promise<Buffer | null>;
    set(key: string, value: Buffer, options: { EX: number }): Promise<void>;
  };

  export function createClient(options?: { url?: string }): RedisClientType;
  export function commandOptions(options: { returnBuffers: boolean }): unknown;
}
