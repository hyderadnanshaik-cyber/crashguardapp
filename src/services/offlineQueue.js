/**
 * @file offlineQueue.js
 * @description IndexedDB-backed offline incident queue.
 *
 * When the device has no internet connectivity:
 * 1. Crash incidents are saved locally via IndexedDB.
 * 2. On connectivity restore (online event), the queue is flushed to Firestore.
 *
 * Uses the `idb` library for a Promise-based IndexedDB API.
 */
import { openDB } from 'idb';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const DB_NAME    = 'crashguard-offline';
const DB_VERSION = 1;
const STORE_NAME = 'incident_queue';

/** Open (or create) the IndexedDB database. */
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath:       'localId',
          autoIncrement: true,
        });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });
}

/**
 * Enqueue a crash incident locally when offline.
 *
 * @param {string} userId
 * @param {object} incidentData - Same shape as Firestore crash_logs document.
 * @returns {Promise<number>} Local IndexedDB key.
 */
export async function enqueueIncident(userId, incidentData) {
  const idb = await getDB();
  const key = await idb.add(STORE_NAME, {
    userId,
    ...incidentData,
    timestamp:  new Date().toISOString(),
    alertStatus: 'QUEUED_OFFLINE',
    syncedAt:    null,
  });
  console.info(`[OfflineQueue] Incident queued locally. Key: ${key}`);
  return key;
}

/**
 * Return all pending (not yet synced) incidents for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getPendingIncidents(userId) {
  const idb = await getDB();
  const all = await idb.getAllFromIndex(STORE_NAME, 'userId', userId);
  return all.filter((item) => item.syncedAt === null);
}

/**
 * Flush all queued incidents to Firestore.
 * Called when the browser regains internet connectivity.
 *
 * @param {string} userId
 * @returns {Promise<number>} Number of incidents synced.
 */
export async function flushQueue(userId) {
  const pending = await getPendingIncidents(userId);
  if (pending.length === 0) {
    console.info('[OfflineQueue] No pending incidents to sync.');
    return 0;
  }

  const idb     = await getDB();
  let   synced  = 0;

  for (const incident of pending) {
    try {
      // Write to Firestore
      await addDoc(collection(db, 'users', userId, 'crash_logs'), {
        peakForce:   incident.peakForce,
        severity:    incident.severity,
        gps:         incident.gps ?? null,
        gyro:        incident.gyro ?? null,
        velocity:    incident.velocity ?? null,
        alertStatus: incident.alertStatus === 'QUEUED_OFFLINE' ? 'ALERT_DISPATCHED_OFFLINE' : incident.alertStatus,
        rawPacket:   incident.rawPacket ?? null,
        timestamp:   serverTimestamp(),
        offlineQueuedAt: incident.timestamp,
      });

      // Mark as synced in IndexedDB
      const tx    = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = await store.get(incident.localId);
      record.syncedAt = new Date().toISOString();
      await store.put(record);
      await tx.done;

      synced++;
      console.info(`[OfflineQueue] Incident ${incident.localId} synced to Firestore.`);
    } catch (err) {
      console.error(`[OfflineQueue] Failed to sync incident ${incident.localId}:`, err);
    }
  }

  console.info(`[OfflineQueue] Flushed ${synced} / ${pending.length} incidents.`);
  return synced;
}

/**
 * Register a global online event listener to auto-flush when connectivity restores.
 * Call this once at app startup (in main.jsx).
 *
 * @param {string} userId
 */
export function registerOnlineSyncListener(userId) {
  window.addEventListener('online', async () => {
    console.info('[OfflineQueue] Connectivity restored. Flushing offline queue...');
    const count = await flushQueue(userId);
    if (count > 0) {
      window.dispatchEvent(
        new CustomEvent('crashguard:offline-synced', { detail: { count } })
      );
    }
  });
}
