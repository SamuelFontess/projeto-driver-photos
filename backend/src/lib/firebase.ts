import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

let app: admin.app.App | null = null;

type JsonServiceAccount = { project_id?: string; client_email?: string; private_key?: string };

function getProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  const fromJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (fromJson) {
    try {
      const parsed = JSON.parse(fromJson) as JsonServiceAccount;
      return parsed.project_id || null;
    } catch {
      return null;
    }
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) return null;
  try {
    const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    const raw = fs.readFileSync(resolved, 'utf-8');
    const json = JSON.parse(raw) as JsonServiceAccount;
    return json.project_id || null;
  } catch {
    return null;
  }
}

function jsonToCertFormat(parsed: JsonServiceAccount): admin.ServiceAccount {
  const key = (parsed.private_key || '').replace(/\\n/g, '\n').trim();
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: key,
  };
}

type CredentialResult = { type: 'cert'; credential: admin.credential.Credential } | { type: 'adc' } | null;

function getFirebaseCredential(): CredentialResult {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as JsonServiceAccount;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          type: 'cert',
          credential: admin.credential.cert(jsonToCertFormat(parsed)),
        };
      }
    } catch (e) {
      logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON invalid', e);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    const key = privateKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
    return {
      type: 'cert',
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: key,
      }),
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { type: 'adc' };
  }

  return null;
}

export function initFirebase(): admin.app.App | null {
  if (app) return app;

  const cred = getFirebaseCredential();
  if (cred === null) {
    logger.warn(
      'Firebase not configured: set FIREBASE_SERVICE_ACCOUNT_JSON (prod), or FIREBASE_*, or GOOGLE_APPLICATION_CREDENTIALS'
    );
    return null;
  }

  try {
    const projectId = getProjectId();
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : undefined);
    app =
      cred.type === 'cert'
        ? admin.initializeApp({ credential: cred.credential, projectId: projectId || undefined, storageBucket })
        : admin.initializeApp({ projectId: projectId || undefined, storageBucket });
    logger.info('Firebase Admin initialized');
    return app;
  } catch (error) {
    logger.error('Firebase Admin init failed', error);
    return null;
  }
}

export function getFirebaseBucket(): ReturnType<ReturnType<typeof getStorage>['bucket']> | null {
  const firebaseApp = initFirebase();
  if (!firebaseApp) return null;

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    (getProjectId() ? `${getProjectId()}.firebasestorage.app` : null);
  if (!bucketName) {
    logger.warn('Firebase Storage bucket unknown: set FIREBASE_STORAGE_BUCKET or credentials with project_id');
    return null;
  }
  return getStorage(firebaseApp).bucket(bucketName);
}

export function isFirebaseStorageEnabled(): boolean {
  return getFirebaseBucket() !== null;
}
