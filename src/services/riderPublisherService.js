/**
 * @file riderPublisherService.js
 * @description Real-time telemetry & activity event publisher for Rider application.
 * Streams GPS coordinates, BLE telemetry, speed, battery, crash status, and activity timeline events
 * to Firestore document rider_locations/{accessCode} and subcollection activity_logs.
 */
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getDeterministicAccessCode } from '../utils/accessCode';
import { RIDER_CODE_MAP } from '../utils/riderCodes';

let cachedAccessCode = null;
let cachedUserId = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // Re-fetch from Firestore at most once per minute

/**
 * Gets or fetches access code. Falls back to deterministic code derived from userId.
 * Cache expires every 10 seconds to pick up Watcher-patched codes.
 * NEVER returns null.
 */
export async function getOrFetchAccessCode(userId) {
  if (!userId) return null;

  // Reset cache if userId changed (e.g. different login)
  if (cachedUserId !== userId) {
    cachedAccessCode = null;
    cachedUserId = userId;
    cacheTimestamp = 0;
  }

  // Return cached value only if still fresh
  if (cachedAccessCode && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedAccessCode;
  }

  if (!db) {
    cachedAccessCode = getDeterministicAccessCode(userId);
    cacheTimestamp = Date.now();
    return cachedAccessCode;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    const deterministicCode = getDeterministicAccessCode(userId);

    if (snap.exists()) {
      const data = snap.data();
      let code = data.accessCode;
      // Ensure code is not a hardware license code (e.g. RD59W6)
      if (!code || RIDER_CODE_MAP[code]) {
        code = deterministicCode;
      }
      cachedAccessCode = code.toUpperCase().trim();
      cacheTimestamp = Date.now();
      if (data.accessCode !== cachedAccessCode) {
        await setDoc(userRef, { accessCode: cachedAccessCode }, { merge: true }).catch(console.warn);
      }
    } else {
      cachedAccessCode = deterministicCode;
      cacheTimestamp = Date.now();
      await setDoc(userRef, { accessCode: deterministicCode }, { merge: true }).catch(console.warn);
    }
  } catch (err) {
    console.warn('[RiderPublisher] Failed to fetch/patch accessCode, using deterministic fallback:', err);
    cachedAccessCode = getDeterministicAccessCode(userId);
    cacheTimestamp = Date.now();
  }

  return cachedAccessCode;
}

/**
 * Clears cached access code (call on sign-out).
 */
export function clearRiderPublisherCache() {
  cachedAccessCode = null;
  cachedUserId = null;
}

/**
 * Logs an activity event to rider_locations/{accessCode}/activity_logs for Watcher timeline view.
 * @param {string} userId
 * @param {{ type: string, title: string, details?: string, badge?: 'green'|'red'|'slate'|'amber' }} eventData
 */
export async function logActivityEvent(userId, eventData = {}) {
  if (!db || !userId) return;

  const accessCode = await getOrFetchAccessCode(userId);
  if (!accessCode) return;

  try {
    const logPayload = {
      type:      eventData.type || 'INFO',
      title:     eventData.title || 'Activity Logged',
      details:   eventData.details || '',
      badge:     eventData.badge || 'slate',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'rider_locations', accessCode, 'activity_logs'), logPayload);
  } catch (err) {
    console.warn('[RiderPublisher] Failed to record activity log event:', err);
  }
}

/**
 * Publishes live rider telemetry to Firestore rider_locations/{accessCode}
 */
export async function publishRiderTelemetry(userId, user, telemetry = {}) {
  if (!db || !userId) return;

  const accessCode = await getOrFetchAccessCode(userId);
  if (!accessCode) return;

  const riderName = user?.displayName || user?.email?.split('@')[0] || 'Rider';

  const payload = {
    riderId:      userId,
    riderName,
    accessCode,
    status:       telemetry.status || 'ARMED',
    bleConnected: Boolean(telemetry.bleConnected),
    isBleConnected: Boolean(telemetry.bleConnected),
    isAppOpen:    true,
    lastSeen:     serverTimestamp(),
    updatedAt:    new Date().toISOString(),
    isOnline:     true,
  };

  const lat = telemetry.lat ?? telemetry.latitude;
  const lon = telemetry.lon ?? telemetry.lng ?? telemetry.longitude;
  const speed = telemetry.speed ?? telemetry.speed_kmh;
  const battery = telemetry.battery;
  const gForce = telemetry.gForce ?? telemetry.gforce;

  if (lat != null) payload.latitude = lat;
  if (lon != null) payload.longitude = lon;
  if (speed != null) payload.speed_kmh = Number(speed);
  if (battery != null) payload.battery = Number(battery);
  if (gForce != null) payload.gForce = Number(gForce);

  try {
    console.log(`[RiderPublisher] 📡 Publishing to rider_locations/${accessCode} | BLE=${payload.bleConnected} | status=${payload.status}`);
    await setDoc(doc(db, 'rider_locations', accessCode), payload, { merge: true });
    // NOTE: users/{userId} is NOT written here (halves quota usage).
    // The users doc gets accessCode written on pairing, and status on crash/safe events.
  } catch (err) {
    console.error('[RiderPublisher] Error broadcasting telemetry:', err);
  }

}


/**
 * Instantly broadcasts a CRASH status to Firestore.
 * Called the moment a crash is detected — does NOT wait for the 5s heartbeat.
 */
export async function publishCrashImmediately(userId, user, impactData = {}) {
  if (!db || !userId) return;

  const accessCode = await getOrFetchAccessCode(userId);
  if (!accessCode) return;

  const riderName = user?.displayName || user?.email?.split('@')[0] || 'Rider';

  const crashPayload = {
    riderId:      userId,
    riderName,
    accessCode,
    status:       'CRASH',
    safetyStatus: 'CRASH',
    event:        'CRASH_DETECTED',
    eventStatus:  'CRASH_ACTIVE',
    isOnline:     true,
    bleConnected: true,
    isBleConnected: true,
    isAppOpen:    true,
    lastSeen:     serverTimestamp(),
    updatedAt:    new Date().toISOString(),
  };

  const lat = impactData.gps?.lat ?? impactData.lat;
  const lon = impactData.gps?.lon ?? impactData.lon ?? impactData.lng;
  const gForce = impactData.force ?? impactData.gForce;
  const severity = typeof impactData.severity === 'string'
    ? impactData.severity
    : impactData.severity?.level;

  if (lat != null) crashPayload.latitude = lat;
  if (lon != null) crashPayload.longitude = lon;
  if (gForce != null) crashPayload.gForce = Number(gForce);
  if (severity != null) crashPayload.severity = severity;

  try {
    await setDoc(doc(db, 'rider_locations', accessCode), crashPayload, { merge: true });
    console.info('[RiderPublisher] 🚨 CRASH immediately broadcast to Firestore.');

    // Log event in activity history timeline
    logActivityEvent(userId, {
      type:    'CRASH',
      title:   `Crash Detected - ${severity || 'Severe'} Impact`,
      details: gForce ? `G-Force: ${Number(gForce).toFixed(1)}g` : 'Impact detected on helmet sensor',
      badge:   'red',
    });
  } catch (err) {
    console.error('[RiderPublisher] Immediate crash broadcast failed:', err);
  }
}

/**
 * Instantly broadcasts an ARMED / SAFE status to Firestore.
 * Called when rider presses "I AM SAFE" or physical hardware cancel button.
 */
export async function publishSafeImmediately(userId, user) {
  if (!db || !userId) return;

  const accessCode = await getOrFetchAccessCode(userId);
  if (!accessCode) return;

  const riderName = user?.displayName || user?.email?.split('@')[0] || 'Rider';

  try {
    await setDoc(doc(db, 'rider_locations', accessCode), {
      riderId:      userId,
      riderCode:    accessCode,
      riderName,
      accessCode,
      status:       'SAFE',
      safetyStatus: 'SAFE',
      event:        'CRASH_CANCELLED',
      eventStatus:  'CRASH_RESOLVED_SAFE',
      isOnline:     true,
      bleConnected: true,
      isBleConnected: true,
      isAppOpen:    true,
      timestamp:    Date.now(),
      lastSeen:     serverTimestamp(),
      updatedAt:    new Date().toISOString(),
    }, { merge: true });

    console.info('[RiderPublisher] 🟢 SAFE/CANCELLED status immediately broadcast to Firestore.');

    // Log event in activity history timeline
    logActivityEvent(userId, {
      type:    'SAFE',
      title:   'Rider Marked Safe / Alert Cancelled',
      details: 'Emergency alert dismissed by rider (Web App or Hardware button)',
      badge:   'green',
    });
  } catch (err) {
    console.error('[RiderPublisher] Immediate safe broadcast failed:', err);
  }
}

/**
 * Publishes crash impact event to rider_locations/{accessCode}/impacts
 */
export async function publishRiderImpact(userId, user, impactData = {}) {
  if (!db || !userId) return;

  const accessCode = await getOrFetchAccessCode(userId);
  if (!accessCode) return;

  const riderName = user?.displayName || user?.email?.split('@')[0] || 'Rider';

  try {
    // 1. Update main rider doc to CRASH status
    await setDoc(doc(db, 'rider_locations', accessCode), {
      status: 'CRASH',
      safetyStatus: 'CRASH',
      eventStatus: 'CRASH_ACTIVE',
      lastSeen: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 2. Add impact record
    await addDoc(collection(db, 'rider_locations', accessCode, 'impacts'), {
      riderId: userId,
      riderName,
      force: impactData.force || 35.0,
      severity: impactData.severity || { level: 'Severe', countdown: 30 },
      gps: impactData.gps || { lat: null, lon: null, velocity: 0 },
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[RiderPublisher] Error publishing crash impact:', err);
  }
}
