type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();

  if (meta !== undefined) {
    console[level](`[${timestamp}] ${message}`, meta);
    return;
  }

  console[level](`[${timestamp}] ${message}`);
}

export const logger = {
  info(message: string, meta?: unknown): void {
    write('info', message, meta);
  },
  warn(message: string, meta?: unknown): void {
    write('warn', message, meta);
  },
  error(message: string, meta?: unknown): void {
    write('error', message, meta);
  },
};
