/**
 * @file locationService.js
 * @description GPS geolocation service with Firestore real-time publishing.
 *
 * - Watches device GPS position at high accuracy.
 * - Publishes live coords to Firestore: users/{userId}/live_location
 * - Instant revocation: stop + delete on toggle OFF.
 */
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

let _watchId = null; // Geolocation watchPosition ID

/**
 * Start watching GPS position and streaming to Firestore.
 *
 * @param {string} userId - Authenticated user's UID.
 * @param {function({lat, lon, accuracy, speed, heading}): void} onPosition - Called on each GPS update.
 * @param {function(GeolocationPositionError): void} onError - Called on GPS error.
 * @returns {void}
 */
export function startLocationStream(userId, onPosition, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation API not supported by this device.'));
    return;
  }

  if (_watchId !== null) {
    // Already watching — clear before restarting
    stopLocationStream(userId);
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout:            10000, // 10s
    maximumAge:         0,     // Always fresh
  };

  _watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;

      const locationData = {
        lat:       latitude,
        lon:       longitude,
        accuracy:  accuracy ?? 0,
        speed:     speed ?? 0,      // m/s
        heading:   heading ?? 0,    // degrees from north
        timestamp: serverTimestamp(),
        active:    true,
      };

      // Publish to Firestore (overwrites on each update)
      try {
        await setDoc(
          doc(db, 'users', userId, 'live_location', 'current'),
          locationData,
          { merge: false }
        );
      } catch (err) {
        console.error('[Location] Firestore write error:', err);
      }

      // Notify local UI
      onPosition?.({ lat: latitude, lon: longitude, accuracy, speed, heading });
    },
    (err) => {
      console.error('[Location] GPS error:', err);
      onError?.(err);
    },
    geoOptions
  );

  console.info(`[Location] Stream started for user: ${userId}`);
}

/**
 * Stop GPS watch and remove live location from Firestore.
 * This instantly revokes family member map visibility.
 *
 * @param {string} userId - User's UID.
 * @returns {Promise<void>}
 */
export async function stopLocationStream(userId) {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
    console.info('[Location] GPS watch cleared.');
  }

  // Remove Firestore document so relatives see "disabled"
  try {
    await deleteDoc(doc(db, 'users', userId, 'live_location', 'current'));
    console.info('[Location] Live location document removed from Firestore.');
  } catch (err) {
    console.error('[Location] Failed to remove Firestore location doc:', err);
  }
}

/**
 * @returns {boolean} Whether the GPS stream is currently active.
 */
export function isStreamActive() {
  return _watchId !== null;
}
