/**
 * Validates that all required environment variables are set.
 * Call this at the very beginning of bootstrap() in index.ts — before any imports
 * that read process.env at module load time.
 *
 * Throws with a descriptive message listing every missing variable so the developer
 * fixes them all at once instead of discovering them one by one.
 */
export function validateEnv(): void {
  const required: string[] = [
    'JWT_SECRET',
    'REFRESH_JWT_SECRET',
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_STORAGE_BUCKET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
        'Set them in your .env file or environment before starting the server.'
    );
  }
}
