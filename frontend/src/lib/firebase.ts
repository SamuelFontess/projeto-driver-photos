export function isFirebaseAuthEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export async function signInWithGoogle(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle can only be called in the browser');
  }
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !authDomain || !projectId) {
    throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.');
  }

  const { initializeApp, getApps } = await import('firebase/app');
  const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');

  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp({ apiKey, authDomain, projectId });
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return idToken;
}
