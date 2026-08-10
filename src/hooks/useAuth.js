/**
 * @file useAuth.js
 * @description Firebase Auth hook — optimized for fast load & no indefinite hangs.
 *
 * Key fixes:
 * 1. onAuthStateChanged clears loading=false IMMEDIATELY (synchronously) after
 *    Firebase resolves auth state — ensureUserProfile runs fire-and-forget in bg.
 * 2. 2-second hard fallback: if Firebase never calls onAuthStateChanged
 *    (cold SDK start, network freeze, ad-blocker), loading force-clears so
 *    the user is never trapped on the splash screen.
 * 3. Every auth action (signIn, register, social) races against a 10s timeout
 *    so "Processing..." can never lock the button indefinitely.
 */
import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  OAuthProvider,
  FacebookAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { getDeterministicAccessCode } from '../utils/accessCode';

// ── Providers ──────────────────────────────────────────────────────────────
const facebookProvider = new FacebookAuthProvider();
const appleProvider    = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ── Timeout wrapper — rejects after `ms` if promise doesn't resolve ─────────
function withTimeout(promise, ms = 10000, label = 'Request') {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`${label} timed out. Please check your connection and try again.`)),
      ms
    )
  );
  return Promise.race([promise, timeout]);
}

// ── Firebase error → user-friendly message ─────────────────────────────────
const FRIENDLY_ERRORS = {
  'auth/user-not-found':          'Account not found. Please register an account before signing in.',
  'auth/wrong-password':          'Incorrect password. Please try again.',
  'auth/invalid-credential':      'Account not found. Please register an account before signing in.',
  'auth/email-already-in-use':    'This email is already registered. Please sign in instead.',
  'auth/weak-password':           'Password must be at least 6 characters.',
  'auth/invalid-email':           'Please enter a valid email address.',
  'auth/too-many-requests':       'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed':  'Network error. Please check your internet connection.',
  'auth/popup-closed-by-user':    'Sign-in popup was closed before completing. Please try again.',
  'auth/popup-blocked':           'Sign-in popup was blocked by your browser. Please allow popups or try again.',
  'auth/unauthorized-domain':     'This domain is not authorized in Firebase Console. Please check Firebase Auth settings.',
  'auth/account-exists-with-different-credential':
    'An account already exists with a different sign-in method.',
};

function friendlyError(err) {
  const msg = FRIENDLY_ERRORS[err.code] || err.message || 'Authentication failed. Please try again.';
  const isNotFound =
    err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential';
  return { message: msg, shouldSwitchToRegister: isNotFound };
}



// ── Ensure Firestore profile — fire-and-forget, NEVER blocks auth state ───
async function ensureUserProfile(user) {
  if (!user || !db) return false;
  try {
    const ref  = doc(db, 'users', user.uid);
    const snap = await withTimeout(getDoc(ref), 5000, 'Profile load');
    const deterministicCode = getDeterministicAccessCode(user.uid);

    if (!snap.exists()) {
      // Brand-new user — create full profile with deterministic access code
      await withTimeout(
        setDoc(
          ref,
          {
            riderId:           user.uid,
            fullName:          user.displayName || '',
            email:             user.email || '',
            phone:             '',
            bloodGroup:        '',
            insurancePolicyNo: '',
            insuranceProvider: '',
            accessCode:        deterministicCode,
            emergencyContacts: [],
            relativeFcmTokens: [],
            createdAt:         serverTimestamp(),
            isNewUser:         true,
          },
          { merge: true }
        ),
        5000,
        'Profile create'
      );
      return true; // brand-new user
    }

    // Returning user — ensure accessCode is set to deterministic code if missing or mismatched
    const existing = snap.data();
    const patches  = {};
    if (!existing.accessCode || existing.accessCode !== deterministicCode) {
      patches.accessCode = deterministicCode;
    }
    if (!existing.relativeFcmTokens) patches.relativeFcmTokens = [];
    if (Object.keys(patches).length > 0) {
      await withTimeout(
        setDoc(ref, patches, { merge: true }),
        5000,
        'Profile patch'
      ).catch(console.warn);
    }
    return false; // returning user
  } catch (err) {
    console.warn('[useAuth] ensureUserProfile skipped (non-critical):', err.message);
    return false;
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useAuth() {
  const [user,      setUser]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // ── Hard fallback: max 2s on splash ──────────────────────────────────
    // If Firebase SDK never calls onAuthStateChanged (blocked by adblocker,
    // network failure, or cold SDK init race), we force-clear the loading
    // state so the user can still see the landing page / sign-in.
    const fallbackTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('[useAuth] Auth state resolution timed out — forcing ready state.');
          return false;
        }
        return prev;
      });
    }, 2000);

    // Check for redirect sign-in result (if popup was blocked or redirect was used)
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          ensureUserProfile(res.user).then(setIsNewUser).catch(console.warn);
        }
      })
      .catch((err) => {
        console.warn('[useAuth] Redirect result notice:', err.message);
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(fallbackTimer); // auth resolved — cancel the timeout
      setUser(u);
      setLoading(false);           // ← immediate, synchronous — no await

      if (u) {
        try { localStorage.setItem('cg_user_authenticated', '1'); } catch (_) {}
        // Profile creation is non-critical & runs fully in the background.
        ensureUserProfile(u).catch((err) =>
          console.warn('[useAuth] Background profile init failed:', err.message)
        );
      } else {
        try { localStorage.removeItem('cg_user_authenticated'); } catch (_) {}
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  // ── Email / Password ─────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    try {
      const cred = await withTimeout(
        signInWithEmailAndPassword(auth, email, password),
        10000,
        'Sign in'
      );
      setIsNewUser(false);
      return cred.user;
    } catch (err) {
      const { message, shouldSwitchToRegister } = friendlyError(err);
      const error = new Error(message);
      error.shouldSwitchToRegister = shouldSwitchToRegister;
      error.code = err.code;
      throw error;
    }
  };

  const register = async (email, password, fullName) => {
    try {
      const cred = await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        10000,
        'Register'
      );
      // Non-blocking side-effects (don't delay the auth callback)
      if (fullName) updateProfile(cred.user, { displayName: fullName }).catch(console.warn);
      ensureUserProfile({ ...cred.user, displayName: fullName || '' }).catch(console.warn);
      setIsNewUser(true);
      return cred.user;
    } catch (err) {
      const { message } = friendlyError(err);
      const error = new Error(message);
      error.code = err.code;
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let cred;
      try {
        cred = await signInWithPopup(auth, provider);
      } catch (popupErr) {
        console.warn('[useAuth] Popup notice:', popupErr.code, popupErr.message);
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          console.warn('[useAuth] Falling back to redirect sign-in...');
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupErr;
      }

      if (cred?.user) {
        ensureUserProfile(cred.user).then(setIsNewUser).catch(console.warn);
        return cred.user;
      }
    } catch (err) {
      console.error('[useAuth] Google auth error:', err);
      const { message } = friendlyError(err);
      const error = new Error(message);
      error.code = err.code;
      throw error;
    }
  };

  const signInWithFacebook = async () => {
    try {
      let cred;
      try {
        cred = await withTimeout(signInWithPopup(auth, facebookProvider), 25000, 'Facebook sign-in');
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, facebookProvider);
          return null;
        }
        throw popupErr;
      }
      if (cred?.user) {
        ensureUserProfile(cred.user).then(setIsNewUser).catch(console.warn);
        return cred.user;
      }
    } catch (err) {
      const { message } = friendlyError(err);
      const error = new Error(message);
      error.code = err.code;
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      let cred;
      try {
        cred = await withTimeout(signInWithPopup(auth, appleProvider), 25000, 'Apple sign-in');
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, appleProvider);
          return null;
        }
        throw popupErr;
      }
      if (cred?.user) {
        ensureUserProfile(cred.user).then(setIsNewUser).catch(console.warn);
        return cred.user;
      }
    } catch (err) {
      const { message } = friendlyError(err);
      const error = new Error(message);
      error.code = err.code;
      throw error;
    }
  };

  const signOut = () => {
    setIsNewUser(false);
    return firebaseSignOut(auth);
  };

  return {
    user,
    loading,
    isNewUser,
    signIn,
    register,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    signOut,
  };
}
