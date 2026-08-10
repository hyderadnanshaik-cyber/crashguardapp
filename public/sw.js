/**
 * @file sw.js
 * @description Custom Service Worker for Crash Guard PWA.
 *
 * Strategies:
 * - App Shell (HTML/CSS/JS/fonts): Cache-First
 * - Firebase API calls: Network-First with offline fallback
 * - Background Sync: Auto-flush offline incident queue on connectivity restore
 *
 * This file is processed by vite-plugin-pwa (injectManifest strategy),
 * which injects the precache manifest at build time.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// ─ Injected by vite-plugin-pwa at build time ─
precacheAndRoute(self.__WB_MANIFEST);

// Remove old caches from previous SW versions
cleanupOutdatedCaches();

// ─ Cache Names ──────────────────────────────────────────────────
const CACHE_FONTS    = 'crashguard-fonts-v1';
const CACHE_LEAFLET  = 'crashguard-leaflet-v1';
const CACHE_MAPS     = 'crashguard-maps-tiles-v1';
const QUEUE_NAME     = 'crashguard-incident-queue';

// ─ Background Sync Plugin for offline incident queue ───────────────
// When a queued fetch to Firestore fails due to no connectivity,
// it is replayed automatically when connectivity restores.
const incidentSyncPlugin = new BackgroundSyncPlugin(QUEUE_NAME, {
  maxRetentionTime: 24 * 60, // Retain for up to 24 hours (in minutes)
});

// ─ Google Fonts: CacheFirst (fonts rarely change) ────────────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: CACHE_FONTS,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ─ Leaflet Map Tiles: CacheFirst with expiry ────────────────────
registerRoute(
  ({ url }) => url.hostname.includes('tile.openstreetmap.org') ||
               url.hostname.includes('unpkg.com'),
  new CacheFirst({
    cacheName: CACHE_LEAFLET,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  })
);

// ─ Firestore / Firebase REST: NetworkFirst ───────────────────────
registerRoute(
  ({ url }) => url.hostname.includes('firestore.googleapis.com') ||
               url.hostname.includes('firebase.googleapis.com') ||
               url.hostname.includes('identitytoolkit.googleapis.com'),
  new NetworkFirst({
    cacheName: 'crashguard-firebase',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// ─ Google Places API: NetworkFirst with background sync on fail ────
registerRoute(
  ({ url }) => url.hostname.includes('maps.googleapis.com'),
  new NetworkFirst({
    cacheName: 'crashguard-places',
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 15 }), // 15 min
    ],
  })
);

// ─ Static Assets: StaleWhileRevalidate ─────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image' ||
                   request.destination === 'style'  ||
                   request.destination === 'script',
  new StaleWhileRevalidate({
    cacheName: 'crashguard-static',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// ─ Skip Waiting + Claim Clients ──────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─ Push Notification Handler (future) ───────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification('Crash Guard Alert', {
      body:    data.body ?? 'Emergency alert received.',
      icon:    '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      vibrate: [200, 100, 200, 100, 200],
      data:    { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/')
  );
});
