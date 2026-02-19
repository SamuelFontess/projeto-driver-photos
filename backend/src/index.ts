import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envArg = process.argv.find((arg) => arg.startsWith('--env-file='));
const envFileFromArg = envArg?.replace('--env-file=', '').trim();

if (!envFileFromArg) {
  throw new Error(
    'Missing required --env-file argument. Use npm run dev (for .env.local) or npm run start (for .env).'
  );
}

const envFileName = envFileFromArg;
const backendRootPath = path.resolve(__dirname, '..');
const envFilePath = path.resolve(backendRootPath, envFileName);

if (!fs.existsSync(envFilePath)) {
  throw new Error(
    `Missing required environment file: ${envFileName}. ` +
      `Create ${envFileName} in backend/ before starting the server.`
  );
}

const dotenvResult = dotenv.config({ path: envFilePath });
if (dotenvResult.error) {
  throw dotenvResult.error;
}

async function bootstrap() {
  const { ensureUploadDir } = await import('./lib/uploads');
  const { app } = await import('./app');

  ensureUploadDir();

  const PORT = process.env.PORT || 3000;
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`Loaded environment from ${envFileName}`);
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Auth routes: http://localhost:${PORT}/api/auth`);
    });
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server:', error);
  process.exit(1);
});
