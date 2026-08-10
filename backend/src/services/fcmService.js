'use strict';

/**
 * @file fcmService.js
 * @description Handles Firebase Cloud Messaging (FCM) notifications.
 */

const { adminMessaging } = require('../config/firebase');

/**
 * Sends a high-priority FCM notification to all paired relative devices.
 * 
 * @param {Array<string>} tokens - Array of FCM device tokens.
 * @param {string} riderName - Name of the rider involved in the crash.
 * @param {Object} location - Location object containing latitude and longitude.
 * @returns {Promise<Object>} FCM send response summary.
 */
async function sendCrashAlert(tokens, riderName, location) {
  if (!tokens || tokens.length === 0) {
    console.log('[FCM] No tokens provided for crash alert.');
    return { successCount: 0, failureCount: 0 };
  }

  const payload = {
    tokens,
    notification: {
      title: '🚨 CRASH DETECTED - CRASH GUARD ALERT',
      body: `High impact detected for ${riderName || 'Rider'}! Tap immediately to view location and call emergency services.`,
    },
    data: {
      type: 'CRASH_ALERT',
      latitude: String(location?.latitude || ''),
      longitude: String(location?.longitude || ''),
      riderName: riderName || '',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'emergency_alarm',
        channelId: 'crash_alerts',
        priority: 'max',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true,
        },
      },
    },
  };

  try {
    if (!adminMessaging) {
      console.warn('[FCM] Firebase Admin Messaging not initialized. Skipping push dispatch.');
      return { successCount: 0, failureCount: 0, mock: true };
    }
    const response = await adminMessaging.sendEachForMulticast(payload);
    console.log(`[FCM] Sent crash alert push to ${response.successCount} devices.`);
    return response;
  } catch (error) {
    console.error('[FCM] Error sending crash alert FCM:', error);
    throw error;
  }
}

/**
 * Sends a silent data payload to clear the emergency overlay on relative devices.
 * 
 * @param {Array<string>} tokens - Array of FCM tokens.
 * @param {string} incidentId - Incident ID cancelled.
 */
async function sendCancelSignal(tokens, incidentId) {
  if (!tokens || tokens.length === 0) return;

  const payload = {
    tokens,
    data: {
      type: 'CANCEL_ALERT',
      incidentId: String(incidentId),
    },
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
        },
      },
    },
  };

  try {
    if (!adminMessaging) {
      console.warn('[FCM] Firebase Admin Messaging not initialized. Skipping cancel dispatch.');
      return;
    }
    await adminMessaging.sendEachForMulticast(payload);
    console.log(`[FCM] Sent cancellation push signal for incident ${incidentId}.`);
  } catch (error) {
    console.error('[FCM] Error sending cancellation FCM:', error);
  }
}

module.exports = {
  sendCrashAlert,
  sendCancelSignal,
};
