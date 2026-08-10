/**
 * @file useLocation.js
 * @description Hook for live GPS location tracking & sharing.
 *
 * Keeps UI map updated in real-time with accurate local location,
 * and streams to Firestore only when settings.shareLiveLocation is true.
 */
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Sensible fallback coordinates (San Francisco)
const FALLBACK_COORDS = { lat: 37.7749, lon: -122.4194 };

/**
 * @param {string|null} userId
 * @returns {{
 *   sharingEnabled: boolean,
 *   currentLocation: {lat: number, lon: number, accuracy?: number, speed?: number, heading?: number} | null,
 *   toggleSharing: function,
 *   locationError: Error | null,
 * }}
 */
export function useLocation(userId) {
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // 1. Subscribe to settings in Firestore to sync sharing permission state
  useEffect(() => {
    if (!userId) return;

    const settingsRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const { shareLiveLocation } = snap.data();
        setSharingEnabled(!!shareLiveLocation);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // 2. Always watch user's local GPS location so the map is never blank, and shows correct location
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentLocation(FALLBACK_COORDS);
      return;
    }

    // Grab initial position immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
      },
      (err) => {
        console.warn('[Location] Initial GPS get failed, using fallback:', err);
        // Set fallback so it's not blank
        setCurrentLocation(FALLBACK_COORDS);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Watch position for continuous real-time updates
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const coords = { lat: latitude, lon: longitude, accuracy, speed, heading };
        setCurrentLocation(coords);

        // If sharing is enabled, stream live coords to Firestore
        if (sharingEnabled && userId) {
          try {
            await setDoc(doc(db, 'users', userId, 'live_location', 'current'), {
              lat: latitude,
              lon: longitude,
              accuracy: accuracy ?? 0,
              speed: speed ?? 0,
              heading: heading ?? 0,
              timestamp: serverTimestamp(),
              active: true,
            });
          } catch (writeErr) {
            console.error('[Location] Firestore stream write error:', writeErr);
          }
        }
      },
      (err) => {
        console.error('[Location] watchPosition error:', err);
        setLocationError(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userId, sharingEnabled]);

  // 3. Delete Firestore live location document immediately when sharing is toggled OFF
  useEffect(() => {
    if (!userId || sharingEnabled) return;

    const removeDoc = async () => {
      try {
        await deleteDoc(doc(db, 'users', userId, 'live_location', 'current'));
      } catch (err) {
        console.error('[Location] Failed to delete live location doc:', err);
      }
    };
    removeDoc();
  }, [userId, sharingEnabled]);

  // 4. Toggle live location sharing on/off and persist to user profile document
  const toggleSharing = useCallback(async () => {
    if (!userId) return;
    const newValue = !sharingEnabled;

    try {
      // Use setDoc with merge to ensure it works even if user doc doesn't exist yet
      await setDoc(doc(db, 'users', userId), { shareLiveLocation: newValue }, { merge: true });
      setSharingEnabled(newValue);
    } catch (err) {
      console.error('[useLocation] Toggle sharing error:', err);
      setLocationError(err);
    }
  }, [userId, sharingEnabled]);

  return { sharingEnabled, currentLocation, toggleSharing, locationError };
}
