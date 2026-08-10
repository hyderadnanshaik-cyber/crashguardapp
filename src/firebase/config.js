/**
 * @file config.js
 * @description Firebase project initialization with safe error boundary guards & optional Analytics.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyBt4AtpsdNumSbpZCLpWdMUJFGiqThjF0g',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'crashguardapp-8d2ab.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'crashguardapp-8d2ab',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'crashguardapp-8d2ab.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '244115379991',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:244115379991:web:ba5e55606136da520cc952',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-Z1H9WCVSE2',
};

// Initialize Firebase app (singleton pattern)
let appInstance = null;
try {
  appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.warn('[Firebase] App initialization notice:', err.message);
}

export const app = appInstance;

// Safe Auth instance + Google provider
let authInstance = null;
let googleProviderInstance = null;

try {
  if (app) {
    authInstance = getAuth(app);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  }
} catch (err) {
  console.warn('[Firebase] Auth notice:', err.message);
}

export const auth = authInstance;
export const googleProvider = googleProviderInstance;

// Safe Firestore instance
let dbInstance = null;
try {
  if (app) {
    dbInstance = getFirestore(app);
  }
} catch (err) {
  console.warn('[Firebase] Firestore notice:', err.message);
}

export const db = dbInstance;

// Safe Analytics instance (only initializes in supported browser environments)
let analyticsInstance = null;
if (app && typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch((err) => {
    console.warn('[Firebase] Analytics not supported in current environment:', err.message);
  });
}

export const analytics = analyticsInstance;

// Online/Offline network control helpers
export const goOnline  = () => db ? enableNetwork(db).catch(console.warn) : Promise.resolve();
export const goOffline = () => db ? disableNetwork(db).catch(console.warn) : Promise.resolve();
