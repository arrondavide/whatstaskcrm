import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let _app: App | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY environment variables."
    );
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return _app;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp());
  return _db;
}

export function getAdminStorage(): Storage {
  if (!_storage) _storage = getStorage(getAdminApp());
  return _storage;
}

// Lazy-initialized exports using getters
// These only initialize Firebase Admin when actually accessed at runtime
export const adminAuth = new Proxy({} as Auth, {
  get: (_target, prop) => {
    const auth = getAdminAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (auth as any)[prop];
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get: (_target, prop) => {
    const db = getAdminDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any)[prop];
  },
});

export const adminStorage = new Proxy({} as Storage, {
  get: (_target, prop) => {
    const storage = getAdminStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (storage as any)[prop];
  },
});
