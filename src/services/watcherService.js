/**
 * @file watcherService.js
 * @description Real-Time Watcher/Relative Rider-Code Pairing & Telemetry Streamer.
 *
 * Quota-optimised architecture:
 * - riderId is cached in localStorage after first pairing (zero Firestore reads on re-load)
 * - Watcher side is READ-ONLY — no writes during live telemetry stream
 * - Only ONE onSnapshot listener (primary rider_locations/{code})
 * - Full users collection scan removed (was reading every user document!)
 */
import {
  doc, onSnapshot, getDoc, setDoc, collection,
  query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getDeterministicAccessCode } from '../utils/accessCode';

const LS_RIDER_ID   = 'pairedRiderId';
const LS_RIDER_NAME = 'pairedRiderName';
const LS_SESSION_ID = 'pairedRiderSessionId';

/**
 * Finds a rider by access code.
 * 
 * Priority (minimal Firestore reads):
 *  0) localStorage cache — zero reads if already paired
 *  1) rider_locations/{cleanCode} — 1 read
 *  2) users query where accessCode == cleanCode — indexed query, 1 read
 *
 * NOTE: The full users collection scan was REMOVED — it read every user
 * document on every Watcher page load, consuming thousands of reads per day.
 */
async function resolveRiderByCode(cleanCode) {
  // 0. Check localStorage cache first — avoids ALL Firestore reads on re-load
  const cachedRiderId   = localStorage.getItem(LS_RIDER_ID);
  const cachedRiderName = localStorage.getItem(LS_RIDER_NAME);
  const cachedCode      = localStorage.getItem(LS_SESSION_ID);

  if (cachedRiderId && cachedCode === cleanCode) {
    console.log(`[Watcher] Using cached pairing: ${cachedRiderId} for code ${cleanCode}`);
    const locRef = doc(db, 'rider_locations', cleanCode);
    return { riderId: cachedRiderId, riderName: cachedRiderName || 'Rider', riderLocationExists: true, locRef };
  }

  let riderId = null;
  let riderName = 'Paired Rider';
  let riderLocationExists = false;
  const locRef = doc(db, 'rider_locations', cleanCode);

  // 1. Check rider_locations/{cleanCode} — single document read
  try {
    const locSnap = await getDoc(locRef);
    if (locSnap.exists()) {
      const d = locSnap.data();
      riderLocationExists = true;
      riderId = d.riderId || null;
      riderName = d.riderName || riderName;
    }
  } catch (e) {
    console.warn('[Watcher] rider_locations read failed:', e);
  }

  // 2. Query users by accessCode field — indexed, only returns matching docs
  if (!riderId) {
    try {
      const q = query(collection(db, 'users'), where('accessCode', '==', cleanCode));
      const userSnap = await getDocs(q);
      if (!userSnap.empty) {
        const uDoc = userSnap.docs[0];
        const u = uDoc.data();
        riderId = uDoc.id;
        riderName = u.fullName || u.displayName || u.email || riderName;
      }
    } catch (e) {
      console.warn('[Watcher] Query by accessCode field failed:', e);
    }
  }

  // NOTE: Full users collection scan REMOVED — it consumed hundreds of reads per call.
  // If the user can't be found via the two methods above, ask them to re-enter the code.

  return { riderId, riderName, riderLocationExists, locRef };
}

/**
 * Binds Watcher client to active Rider code and initializes real-time stream.
 * Quota-optimised: caches riderId in localStorage, no Watcher-side writes during stream.
 *
 * @param {string} enteredRiderCode - 6-character rider access code
 * @param {function} [onUpdate] - Optional callback for React state
 * @returns {Promise<{ sessionId: string, riderName: string, unsubscribe: function }>}
 */
export async function bindWatcherToRider(enteredRiderCode, onUpdate) {
  if (!enteredRiderCode) {
    throw new Error('No Rider Code provided.');
  }
  const cleanCode = enteredRiderCode.trim().toUpperCase();
  console.log(`[Watcher] Attempting to link Watcher to Rider Code: ${cleanCode}`);

  if (!db) {
    throw new Error('Database service unavailable.');
  }

  try {
    const { riderId, riderName, locRef } = await resolveRiderByCode(cleanCode);

    if (!riderId) {
      throw new Error('Invalid Rider Code or Rider is currently offline.');
    }

    // Cache pairing in localStorage — prevents re-reading Firestore on every page load
    localStorage.setItem(LS_SESSION_ID, cleanCode);
    localStorage.setItem(LS_RIDER_NAME, riderName);
    localStorage.setItem(LS_RIDER_ID, riderId);

    // Only write to Firestore if this is a NEW pairing (not cached)
    const cachedCode = localStorage.getItem(LS_SESSION_ID);
    if (cachedCode !== cleanCode) {
      // Bootstrap rider_locations/{cleanCode} — only seed missing fields, NEVER overwrite rider data
      const existingLocSnap = await getDoc(locRef).catch(() => null);
      const existingData = existingLocSnap?.data() || {};
      const bootstrapPayload = { riderId, riderName, accessCode: cleanCode };
      if (!existingData.lastSeen)       bootstrapPayload.lastSeen = serverTimestamp();
      if (!existingData.updatedAt)      bootstrapPayload.updatedAt = new Date().toISOString();
      if (existingData.battery == null) bootstrapPayload.battery = 100;
      await setDoc(locRef, bootstrapPayload, { merge: true }).catch(console.warn);

      // Write accessCode to users/{riderId} so the Rider app picks it up
      await setDoc(doc(db, 'users', riderId), {
        accessCode: cleanCode,
        lastSeen: serverTimestamp(),
      }, { merge: true }).catch(console.warn);
    }

    // Register watcher device once (idempotent)
    let watcherDeviceId = localStorage.getItem('cg_watcher_device_id');
    if (!watcherDeviceId) {
      watcherDeviceId = `watcher_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('cg_watcher_device_id', watcherDeviceId);
    }

    try {
      await setDoc(doc(db, 'users', riderId, 'paired_relatives', watcherDeviceId), {
        name: 'Watcher Web Portal Device',
        accessCode: cleanCode,
        pairedAt: new Date().toISOString(),
        status: 'ACTIVE',
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log(`[Watcher] Registered in Rider (${riderId}) paired_relatives.`);
    } catch (relErr) {
      console.warn('[Watcher] paired_relatives registration notice:', relErr);
    }

    console.log(`[Watcher] Paired with Rider: ${riderName}. Starting live telemetry...`);

    // Initialize Live Data Stream — READ ONLY, no writes
    const unsubscribe = initializeWatcherLiveStream(cleanCode, (telemetry) => {
      if (onUpdate) onUpdate(telemetry);
    });

    return { sessionId: cleanCode, riderName, unsubscribe };
  } catch (error) {
    console.error('[Watcher] Failed to bind watcher to rider:', error);
    throw error;
  }
}

/**
 * REAL-TIME TELEMETRY STREAM LISTENER
 * Quota-optimised: single onSnapshot listener on rider_locations/{sessionId} only.
 * No secondary listeners. No writes. Pure read.
 */
export function initializeWatcherLiveStream(sessionId, onDataCallback) {
  if (!db || !sessionId) return () => {};

  console.log(`[Watcher] Listening for telemetry on session: ${sessionId}`);

  // Single listener: rider_locations/{sessionId} — the Rider app writes everything here
  const unsubPrimary = onSnapshot(
    doc(db, 'rider_locations', sessionId),
    (snap) => {
      if (snap.exists()) {
        const payload = snap.data();

        // Resolve timestamp for online check
        const lastSeenMs = payload.lastSeen?.toMillis?.()
          ?? (payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now());
        const ageMs  = Date.now() - lastSeenMs;
        const isOnline = ageMs < 5 * 60 * 1000; // online if updated within 5 min

        const isBle = Boolean(payload.bleConnected ?? payload.isBleConnected);

        const telemetryData = {
          ...payload, // Pass ALL fields from Firestore (lastSeen, updatedAt, safetyStatus, etc.)
          isOnline:      isOnline || payload.isOnline || false,
          status:        payload.status || 'ARMED',
          safetyStatus:  payload.safetyStatus || payload.status || 'SAFE',
          battery:       payload.battery != null ? Number(payload.battery) : null,
          bleConnected:  isBle,
          isBleConnected: isBle,
          isAppOpen:     payload.isAppOpen !== undefined ? payload.isAppOpen : true,
          lastSeen:      payload.lastSeen || null,
          updatedAt:     payload.updatedAt || new Date().toISOString(),
          gForce:        Number(payload.gForce ?? 0),
          riderName:     payload.riderName || localStorage.getItem(LS_RIDER_NAME) || 'Rider',
          raw:           payload,
        };

        const lat   = payload.latitude ?? payload.lat;
        const lng   = payload.longitude ?? payload.lng ?? payload.lon;
        const speed = payload.speed_kmh ?? payload.speed;

        if (lat   != null) telemetryData.lat   = lat;
        if (lng   != null) telemetryData.lng   = lng;
        if (speed != null) telemetryData.speed = Number(speed);

        if (onDataCallback) onDataCallback(telemetryData);
      } else {
        // Document doesn't exist yet — show offline
        if (onDataCallback) onDataCallback({
          isOnline: false,
          riderName: localStorage.getItem(LS_RIDER_NAME) || 'Rider',
        });
      }
    },
    (err) => {
      console.error('[Watcher] Primary telemetry stream error:', err);
      if (onDataCallback) onDataCallback({ isOnline: false });
    }
  );

  return unsubPrimary;
}
