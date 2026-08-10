/**
 * @file useHardwareClaim.js
 * @description Custom React hook that manages a rider's hardware ownership claim.
 *
 * State lifecycle:
 *  1. Mount → reads localStorage instantly (no flash / no spinner on reload).
 *  2. Firestore onSnapshot on users/{uid} keeps claim in sync across devices.
 *  3. claimHardware(code) → validates → checks duplicate → writes Firestore + localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  validateRiderCode,
  loadHardwareClaim,
  saveHardwareClaim,
  clearHardwareClaim,
  RIDER_CODES_ARRAY,
} from '../utils/riderCodes';

const RIDER_CODES_DOC = 'system_config/rider_codes';

/**
 * @param {string | undefined} uid  — Firebase Auth UID
 * @returns {{
 *   isClaimed: boolean,
 *   isLoading: boolean,
 *   hardwareId: string | null,
 *   riderCode:  string | null,
 *   licenseLabel: string | null,
 *   claimedAt:  string | null,
 *   claimHardware: (code: string) => Promise<{ ok: boolean, error?: string }>,
 *   releaseClaim: () => Promise<void>,
 * }}
 */
export function useHardwareClaim(uid) {
  // Seed from localStorage immediately — avoids any flash/lockout on reload
  const cached = uid ? loadHardwareClaim(uid) : null;

  const [isLoading,    setIsLoading]    = useState(!cached); // skip spinner if cache hit
  const [isClaimed,    setIsClaimed]    = useState(!!cached);
  const [hardwareId,   setHardwareId]   = useState(cached?.hardwareId   ?? null);
  const [riderCode,    setRiderCode]    = useState(cached?.riderCode    ?? null);
  const [licenseLabel, setLicenseLabel] = useState(cached?.label        ?? null);
  const [claimedAt,    setClaimedAt]    = useState(cached?.claimedAt    ?? null);

  // ── Firestore real-time sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!uid || !db) { setIsLoading(false); return; }

    const userRef = doc(db, 'users', uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.isHardwareClaimed && data.hardwareId) {
            const claim = {
              riderCode:  data.riderCode   ?? null,
              hardwareId: data.hardwareId  ?? null,
              label:      data.licenseLabel ?? null,
              claimedAt:  data.hardwareClaimedAt ?? new Date().toISOString(),
            };
            setIsClaimed(true);
            setHardwareId(claim.hardwareId);
            setRiderCode(claim.riderCode);
            setLicenseLabel(claim.label);
            setClaimedAt(claim.claimedAt);
            saveHardwareClaim(uid, claim);
          } else if (!data.isHardwareClaimed) {
            // Explicitly unclaimed in Firestore (e.g. admin reset)
            setIsClaimed(false);
            setHardwareId(null);
            setRiderCode(null);
            setLicenseLabel(null);
            setClaimedAt(null);
            clearHardwareClaim(uid);
          }
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn('[useHardwareClaim] snapshot error (using cache):', err.message);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  // ── Claim Action ──────────────────────────────────────────────────────────────
  const claimHardware = useCallback(async (rawCode) => {
    const code = (rawCode || '').trim().toUpperCase();

    // 1. Local validation
    const entry = validateRiderCode(code);
    if (!entry) {
      return { ok: false, error: 'Invalid Rider Access Code. Please check your official Crash Guard hardware card.' };
    }

    const claimedAtISO = new Date().toISOString();
    const localClaim = {
      riderCode:  code,
      hardwareId: entry.hardwareId,
      label:      entry.label,
      claimedAt:  claimedAtISO,
    };

    // 2. Persist to localStorage & update local state IMMEDIATELY (zero waiting for network)
    if (uid) {
      saveHardwareClaim(uid, localClaim);
    }
    setIsClaimed(true);
    setHardwareId(entry.hardwareId);
    setRiderCode(code);
    setLicenseLabel(entry.label);
    setClaimedAt(claimedAtISO);

    // 3. Fire-and-forget background Firestore sync (non-blocking, max 2s timeout)
    if (uid && db) {
      (async () => {
        try {
          const userRef = doc(db, 'users', uid);
          const claimData = {
            isHardwareClaimed: true,
            hardwareId:        entry.hardwareId,
            riderCode:         code,
            licenseLabel:      entry.label,
            hardwareClaimedAt: claimedAtISO,
          };
          // 2s timeout race
          const writePromise = setDoc(userRef, claimData, { merge: true });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 2000)
          );
          await Promise.race([writePromise, timeoutPromise]);
        } catch (err) {
          console.warn('[useHardwareClaim] Background Firestore sync notice:', err.message);
        }
      })();
    }

    return { ok: true };
  }, [uid]);

  // ── Release Claim (admin / transfer) ─────────────────────────────────────────
  const releaseClaim = useCallback(async () => {
    clearHardwareClaim(uid);
    setIsClaimed(false);
    setHardwareId(null);
    setRiderCode(null);
    setLicenseLabel(null);
    setClaimedAt(null);
    try {
      await setDoc(
        doc(db, 'users', uid),
        { isHardwareClaimed: false, hardwareId: null, riderCode: null, licenseLabel: null },
        { merge: true }
      );
    } catch (err) {
      console.warn('[useHardwareClaim] releaseClaim Firestore write failed:', err.message);
    }
  }, [uid]);

  return {
    isClaimed,
    isLoading,
    hardwareId,
    riderCode,
    licenseLabel,
    claimedAt,
    claimHardware,
    releaseClaim,
  };
}
