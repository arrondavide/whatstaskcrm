import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

export const googleProvider = new GoogleAuthProvider();
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApp();
  } else {
    _app = initializeApp(firebaseConfig);
  }

  return _app;
}

export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getClientStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(getFirebaseApp());
  return _storage;
}

// Lazy getters — only initialize when accessed at runtime (not during build)
export const auth = typeof window !== "undefined"
  ? new Proxy({} as Auth, {
      get: (_target, prop) => {
        const a = getClientAuth();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (a as any)[prop];
      },
    })
  : ({} as Auth);

export const db = typeof window !== "undefined"
  ? new Proxy({} as Firestore, {
      get: (_target, prop) => {
        const d = getClientDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (d as any)[prop];
      },
    })
  : ({} as Firestore);

export const storage = typeof window !== "undefined"
  ? new Proxy({} as FirebaseStorage, {
      get: (_target, prop) => {
        const s = getClientStorage();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (s as any)[prop];
      },
    })
  : ({} as FirebaseStorage);
