'use strict';

/**
 * @file incidentController.js
 * @description Controller handling incident triggering, emergency dispatch, live tracking, cancellation, and offline sync.
 */

const { adminDb, admin } = require('../config/firebase');
const { sendCrashAlert, sendCancelSignal } = require('../services/fcmService');
const { sendEmergencyEmail } = require('../services/emailService');
const { findNearestHospitals } = require('../services/placesService');

/**
 * POST /api/incidents/trigger
 * Triggers multi-channel emergency dispatch pipeline.
 */
async function triggerEmergency(req, res, next) {
  try {
    const { riderId, incidentId, peakForce, severity, location } = req.body;

    if (!adminDb) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Firestore not initialized' });
    }

    // 1. Fetch Rider Profile
    const userDocRef = adminDb.collection('users').doc(riderId);
    const userDoc = await userDocRef.get();
    const riderData = userDoc.exists ? userDoc.data() : { fullName: 'Rider' };

    // 2. Concurrently execute FCM Push, Email Dispatch, and Google Places Hospital Lookup
    const fcmTokens = riderData.relativeFcmTokens || [];
    const contacts = riderData.emergencyContacts || [];

    const [fcmRes, emailRes, hospitals] = await Promise.allSettled([
      sendCrashAlert(fcmTokens, riderData.fullName || riderData.displayName, location),
      sendEmergencyEmail(contacts, { riderId, ...riderData }, { peakForce, severity, location }),
      findNearestHospitals(location.latitude, location.longitude),
    ]);

    const nearestHospitals = hospitals.status === 'fulfilled' ? hospitals.value : [];

    // 3. Write / Update Incident Document in Firestore
    const incidentDocRef = adminDb.collection('incidents').doc(incidentId);
    const incidentData = {
      incidentId,
      riderId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      peakForce,
      severity,
      location,
      status: 'DISPATCHED',
      nearestHospitals,
      dispatchLog: {
        fcmStatus: fcmRes.status,
        emailStatus: emailRes.status,
      },
    };

    await incidentDocRef.set(incidentData, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'Multi-channel emergency dispatch successfully executed.',
      incidentId,
      status: 'DISPATCHED',
      nearestHospitals,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents/live/:riderId
 * Returns latest incident log and live location for paired relative portal.
 */
async function getLiveData(req, res, next) {
  try {
    const { riderId } = req.params;

    if (!adminDb) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Firestore not initialized' });
    }

    // Fetch user details
    const userDoc = await adminDb.collection('users').doc(riderId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Fetch latest live location
    const locationSnap = await adminDb.collection('users').doc(riderId).collection('live_location').doc('current').get();
    const currentLocation = locationSnap.exists ? locationSnap.data() : null;

    // Fetch latest incident
    const incidentSnap = await adminDb.collection('incidents')
      .where('riderId', '==', riderId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    const latestIncident = !incidentSnap.empty ? incidentSnap.docs[0].data() : null;

    return res.status(200).json({
      riderId,
      riderName: userData?.fullName || userData?.displayName || 'Rider',
      bloodGroup: userData?.bloodGroup || 'N/A',
      emergencyContacts: userData?.emergencyContacts || [],
      currentLocation,
      latestIncident,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/cancel
 * rider cancels the countdown alarm.
 */
async function cancelIncident(req, res, next) {
  try {
    const { riderId, incidentId, reason } = req.body;

    if (!adminDb) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Firestore not initialized' });
    }

    const incidentDocRef = adminDb.collection('incidents').doc(incidentId);
    await incidentDocRef.set({
      status: 'CANCELLED_BY_RIDER',
      cancellationReason: reason || 'Rider marked safe',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Send silent FCM to clear relative overlays
    const userDoc = await adminDb.collection('users').doc(riderId).get();
    if (userDoc.exists && userDoc.data().relativeFcmTokens) {
      await sendCancelSignal(userDoc.data().relativeFcmTokens, incidentId);
    }

    return res.status(200).json({
      success: true,
      message: 'Incident status updated to CANCELLED_BY_RIDER',
      incidentId,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/incidents/sync-queue
 * Ingest offline incidents flushed from Service Worker IndexedDB queue.
 */
async function syncOfflineQueue(req, res, next) {
  try {
    const { riderId, items } = req.body;

    if (!adminDb) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Firestore not initialized' });
    }

    const batch = adminDb.batch();
    const now = Date.now();
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

    let processedCount = 0;

    for (const item of items) {
      const incidentDocRef = adminDb.collection('incidents').doc(item.incidentId);

      const isOlderThan15Min = (now - item.timestamp) > FIFTEEN_MINUTES_MS;

      const incidentData = {
        incidentId: item.incidentId,
        riderId,
        timestamp: admin.firestore.Timestamp.fromMillis(item.timestamp),
        peakForce: item.peakForce,
        severity: item.severity,
        location: item.location,
        status: isOlderThan15Min ? 'QUEUED_OFFLINE_HISTORICAL' : (item.status || 'QUEUED_OFFLINE'),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(incidentDocRef, incidentData, { merge: true });
      processedCount++;
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: `Successfully batch-synced ${processedCount} offline incident items.`,
      processedCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  triggerEmergency,
  getLiveData,
  cancelIncident,
  syncOfflineQueue,
};
