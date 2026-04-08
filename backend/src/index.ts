import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFileFromArg = envArg?.replace('--env-file=', '').trim();
const backendRootPath = path.resolve(__dirname, '..');
let loadedEnvFileName: string | null = null;

if (envFileFromArg) {
  const envFilePath = path.resolve(backendRootPath, envFileFromArg);
  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `Missing required environment file: ${envFileFromArg}. ` +
        `Create ${envFileFromArg} in backend/ before starting the server.`
    );
  }

  const dotenvResult = dotenv.config({ path: envFilePath });
  if (dotenvResult.error) {
    throw dotenvResult.error;
  }
  loadedEnvFileName = envFileFromArg;
} else {
  const fallbackEnvFiles = ['.env.local', '.env'];
  for (const fileName of fallbackEnvFiles) {
    const fallbackPath = path.resolve(backendRootPath, fileName);
    if (!fs.existsSync(fallbackPath)) {
      continue;
    }

    const dotenvResult = dotenv.config({ path: fallbackPath });
    if (dotenvResult.error) {
      throw dotenvResult.error;
    }
    loadedEnvFileName = fileName;
    break;
  }
}

async function bootstrap() {
  const { validateEnv } = await import('./utils/validateEnv');
  validateEnv();

  const { initFirebase } = await import('./lib/firebase');
  const { app } = await import('./app');
  initFirebase();
  const { getRedisClient } = await import('./lib/redis');

  const { startWsClient } = await import('./lib/wsClient');
  const PORT = process.env.PORT || 3000;
  if (require.main === module) {
    app.listen(PORT, async () => {
      if (loadedEnvFileName) {
        console.log(`Loaded environment from ${loadedEnvFileName}`);
      } else {
        console.log('No local .env file found. Using process environment variables.');
      }
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Auth routes: http://localhost:${PORT}/api/auth`);

      getRedisClient()
        .then((client) => {
          if (client) {
            console.log('Redis cache: connected');
          } else {
            console.log('Redis cache: not available (preview cache will be skipped)');
          }
        })
        .catch(() => {
          console.log('Redis cache: not available (preview cache will be skipped)');
        });
      console.log('Redis queue: managed by BullMQ (connects on first job publish)');
      startWsClient();
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server:', error);
  process.exit(1);
});
