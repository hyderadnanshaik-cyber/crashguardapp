/**
 * @file riderCodes.js
 * @description Strict 1-to-1 Rider Access Code ↔ Hardware ID lookup table.
 * Single source of truth for all 10 authorised Crash Guard hardware units.
 */

// ── Lookup Map ─────────────────────────────────────────────────────────────────
export const RIDER_CODE_MAP = {
  RD82K9: { label: 'Rider License 01', hardwareId: 'CG-ESP32-RH001' },
  RD37M4: { label: 'Rider License 02', hardwareId: 'CG-ESP32-RH002' },
  RD91P5: { label: 'Rider License 03', hardwareId: 'CG-ESP32-RH003' },
  RD48X2: { label: 'Rider License 04', hardwareId: 'CG-ESP32-RH004' },
  RD63V7: { label: 'Rider License 05', hardwareId: 'CG-ESP32-RH005' },
  RD15T8: { label: 'Rider License 06', hardwareId: 'CG-ESP32-RH006' },
  RD74B3: { label: 'Rider License 07', hardwareId: 'CG-ESP32-RH007' },
  RD59W6: { label: 'Rider License 08', hardwareId: 'CG-ESP32-RH008' },
  RD26H1: { label: 'Rider License 09', hardwareId: 'CG-ESP32-RH009' },
  RD80Z9: { label: 'Rider License 10', hardwareId: 'CG-ESP32-RH010' },
};

// Also exported as array for Firestore seeding (mirrors RoleGateway INITIAL_RIDER_CODES)
export const RIDER_CODES_ARRAY = Object.entries(RIDER_CODE_MAP).map(([code, meta]) => ({
  code,
  label: meta.label,
  hardwareId: meta.hardwareId,
  usedBy: null,
  usedAt: null,
}));

// ── Validator ──────────────────────────────────────────────────────────────────
/**
 * Returns the hardware entry for a code, or null if invalid.
 * @param {string} rawCode
 * @returns {{ label: string, hardwareId: string } | null}
 */
export function validateRiderCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  return RIDER_CODE_MAP[code] ?? null;
}

// ── localStorage Helpers ───────────────────────────────────────────────────────
const LS_PREFIX = 'cg_hardware_';

/** @param {string} uid */
export function getHardwareLSKey(uid) {
  return `${LS_PREFIX}${uid}`;
}

/**
 * Load persisted hardware claim from localStorage.
 * @param {string} uid
 * @returns {{ riderCode: string, hardwareId: string, label: string, claimedAt: string } | null}
 */
export function loadHardwareClaim(uid) {
  try {
    const raw = localStorage.getItem(getHardwareLSKey(uid));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persist hardware claim to localStorage.
 * @param {string} uid
 * @param {{ riderCode: string, hardwareId: string, label: string, claimedAt: string }} data
 */
export function saveHardwareClaim(uid, data) {
  try {
    localStorage.setItem(getHardwareLSKey(uid), JSON.stringify(data));
  } catch (e) {
    console.warn('[riderCodes] localStorage write failed:', e);
  }
}

/** Remove hardware claim from localStorage (e.g. on transfer/reset). */
export function clearHardwareClaim(uid) {
  try {
    localStorage.removeItem(getHardwareLSKey(uid));
  } catch {}
}

/**
 * Completely resets and unbinds all 10 Rider Access Codes from test profiles,
 * wipes local storage keys, and resets Firestore system_config/rider_codes.
 */
export async function resetAllRiderCodesAndStorage(db, uid) {
  try {
    // 1. Wipe all local storage keys
    const keysToRemove = [
      'pairedRiderId',
      'pairedRiderSessionId',
      'pairedRiderName',
      'cg_watcher_device_id',
      'cg_role',
      'cg_watcher_code',
      'cg_has_visited',
      'cg_mascot_seen'
    ];
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    if (uid) {
      clearHardwareClaim(uid);
    }

    // Clear all localStorage keys starting with cg_
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cg_') || key.startsWith('paired'))) {
        localStorage.removeItem(key);
      }
    }

    // 2. If Firestore db reference is provided, unbind user doc and reset rider codes doc
    if (db && uid) {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Reset user's hardware claim
      await setDoc(doc(db, 'users', uid), {
        isHardwareClaimed: false,
        hardwareId: null,
        riderCode: null,
        accessCode: null,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(console.warn);

      // Reset system_config/rider_codes document
      const cleanCodesDoc = {};
      RIDER_CODES_ARRAY.forEach(item => {
        cleanCodesDoc[item.code] = {
          code: item.code,
          label: item.label,
          hardwareId: item.hardwareId,
          usedBy: null,
          usedAt: null,
          isAssigned: false,
        };
      });

      await setDoc(doc(db, 'system_config', 'rider_codes'), {
        codes: cleanCodesDoc,
        lastResetAt: serverTimestamp(),
      }, { merge: true }).catch(console.warn);
    }

    console.info('[riderCodes] ✅ All 10 Rider Access Codes and local test sessions have been reset.');
    return true;
  } catch (err) {
    console.error('[riderCodes] Failed to reset rider codes and storage:', err);
    return false;
  }
}

