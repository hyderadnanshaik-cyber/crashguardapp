'use strict';

/**
 * @file relativeController.js
 * @description Controller handling relative pairing & live tracking APIs.
 */

const { adminDb, admin } = require('../config/firebase');

/**
 * POST /api/relatives/pair
 * Pair relative using 6-digit rider access code.
 */
async function pairRelative(req, res, next) {
  try {
    const { riderAccessCode, relativeFcmToken, relativeDeviceName } = req.body;

    if (!adminDb) {
      return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Firestore database not available' });
    }

    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('accessCode', '==', riderAccessCode).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: 'INVALID_ACCESS_CODE',
        message: 'No rider found matching the provided 6-digit access code.',
      });
    }

    const riderDoc = snapshot.docs[0];
    const riderId = riderDoc.id;
    const riderData = riderDoc.data();

    // Append FCM token
    await usersRef.doc(riderId).update({
      relativeFcmTokens: admin.firestore.FieldValue.arrayUnion(relativeFcmToken),
    });

    console.log(`[Relative Controller] Paired relative device (${relativeDeviceName || 'Unknown'}) to rider ${riderId}`);

    return res.status(200).json({
      success: true,
      riderId,
      riderName: riderData.fullName || riderData.displayName || 'Rider',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  pairRelative,
};
