/**
 * @file useEmergency.js
 * @description Emergency SOS countdown + dispatch hook.
 *
 * Lifecycle:
 * 1. IDLE: No impact detected.
 * 2. ALERT: Impact received from BLE. Countdown starts.
 * 3. SAFE: Rider pressed "I AM SAFE". Sends BLE cancel, logs FALSE_ALARM.
 * 4. DISPATCHED: Timer expired. Logs ALERT_DISPATCHED, triggers SMS.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeSeverity,
  logIncidentToFirestore,
  updateIncidentStatus,
  buildSMSBody,
  dispatchSMSAlert,
  fetchNearbyHospitals,
  SEVERITY,
} from '../services/emergencyService';
import { sendCancellationSignal, sendImSafe, sendManualCrashToESP32 } from '../services/bleService';
import { enqueueIncident } from '../services/offlineQueue';
import { publishRiderImpact, publishCrashImmediately, publishSafeImmediately } from '../services/riderPublisherService';
import { dispatchEmergencyEmails } from '../services/emailDispatchService';

/** Emergency state machine values */
export const EMERGENCY_STATE = {
  IDLE:       'IDLE',
  ALERT:      'ALERT',
  SAFE:       'SAFE',
  DISPATCHED: 'DISPATCHED',
};

/**
 * @param {string|null} userId
 * @param {object|null} user - Firebase user object (for name)
 * @param {Array} emergencyContacts - [{name, phone}]
 * @returns {{ emergencyState, severity, countdown, hospitals, triggerImpact, triggerManualCrash, markSafe }}
 */
export function useEmergency(userId, user, emergencyContacts = []) {
  const [emergencyState, setEmergencyState] = useState(EMERGENCY_STATE.IDLE);
  const [severity,       setSeverity]       = useState(null);
  const [countdown,      setCountdown]      = useState(0);
  const [hospitals,      setHospitals]      = useState([]);
  const [incidentId,     setIncidentId]     = useState(null);
  const [impactData,     setImpactData]     = useState(null);

  const countdownRef       = useRef(null); // setInterval ID
  const incidentRef        = useRef(null); // Firestore incident doc ID
  const emergencyStateRef  = useRef(EMERGENCY_STATE.IDLE);
  const cooldownUntilRef   = useRef(0);    // Cooldown timestamp after marking safe

  const userIdRef            = useRef(userId);
  const userRef              = useRef(user);
  const emergencyContactsRef = useRef(emergencyContacts);

  // Synchronously sync refs
  useEffect(() => { emergencyStateRef.current = emergencyState; }, [emergencyState]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { emergencyContactsRef.current = emergencyContacts; }, [emergencyContacts]);

  // Clear countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  /**
   * Handle automatic SOS dispatch when countdown reaches zero.
   * Standard async function definition — completely immune to hoisting TDZ issues.
   */
  async function handleDispatch(sev, impact) {
    emergencyStateRef.current = EMERGENCY_STATE.DISPATCHED;
    setEmergencyState(EMERGENCY_STATE.DISPATCHED);

    const uid      = userIdRef.current;
    const u        = userRef.current;
    const contacts = emergencyContactsRef.current;

    if (incidentRef.current && uid) {
      await updateIncidentStatus(uid, incidentRef.current, 'ALERT_DISPATCHED');
    }

    // Build SMS body once (shared for all contacts)
    const body = buildSMSBody({
      name:       u?.displayName ?? 'Rider',
      severity:   sev?.level || 'SEVERE',
      gps:        impact?.gps ?? null,
      bloodGroup: u?.bloodGroup ?? null,
    });

    // 1. Send SMS to ALL emergency contacts sequentially with 1s gap
    if (contacts.length > 0) {
      contacts.forEach((contact, idx) => {
        setTimeout(() => {
          if (contact.phone) {
            dispatchSMSAlert(contact.phone, body);
            console.info(`[Emergency] SMS dispatched to contact ${idx + 1}: ${contact.name}`);
          }
        }, idx * 1200); // 1.2s gap between each SMS to avoid OS throttle
      });
    } else {
      console.warn('[Emergency] No emergency contacts configured — SMS not sent.');
    }

    // 2. Send emergency EMAIL to all contacts that have an email address
    dispatchEmergencyEmails(
      contacts,
      u,
      { severity: sev?.level || 'SEVERE', gps: impact?.gps ?? null }
    ).catch(err => console.warn('[Emergency] Email dispatch error:', err));
  }

  /**
   * Trigger impact flow. Called by useBLE when impact event is received.
   */
  const triggerImpact = useCallback(async (impact) => {
    if (emergencyStateRef.current !== EMERGENCY_STATE.IDLE) return;
    if (Date.now() < cooldownUntilRef.current) return;

    const sev = impact.severity || computeSeverity(impact.force, impact.rawPacket?.severity || impact.rawPacket?.status);
    if (!sev) return;

    emergencyStateRef.current = EMERGENCY_STATE.ALERT;
    setEmergencyState(EMERGENCY_STATE.ALERT);
    setSeverity(sev);
    setCountdown(sev.countdown);
    setImpactData(impact);

    const uid = userIdRef.current;
    const u   = userRef.current;

    publishCrashImmediately(uid, u, impact).catch(console.warn);
    publishRiderImpact(uid, u, impact).catch(console.warn);

    logIncidentToFirestore(uid, {
      force:     impact.force,
      severity:  sev.level,
      gps:       impact.gps,
      gyro:      impact.gyro,
      velocity:  impact.gps?.velocity ?? null,
      rawPacket: impact.rawPacket ?? null,
    }).then(id => {
      incidentRef.current = id;
      setIncidentId(id);
    }).catch(async (err) => {
      console.error('[Emergency] Firestore write failed, queuing offline:', err);
      await enqueueIncident(uid, {
        peakForce: impact.force,
        severity:  sev.level,
        gps:       impact.gps,
        gyro:      impact.gyro,
        velocity:  impact.gps?.velocity ?? null,
        rawPacket: impact.rawPacket ?? null,
      });
    });

    if (impact.gps) {
      fetchNearbyHospitals({ lat: impact.gps.lat, lon: impact.gps.lon })
        .then(setHospitals)
        .catch(console.error);
    }

    if (countdownRef.current) clearInterval(countdownRef.current);
    let remaining = sev.countdown;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        handleDispatch(sev, impact);
      }
    }, 1000);
  }, []);

  /**
   * Manually trigger a crash alert from the web portal.
   */
  const triggerManualCrash = useCallback(async (config = {}) => {
    const sev = {
      level: config.level || 'Severe Impact',
      countdown: config.countdown || 15,
      color: '#EE0000',
    };

    const impact = {
      force: 45.0,
      severity: sev,
      triggerMethod: 'MANUAL_APP_TRIGGER',
      gps: { lat: null, lon: null, velocity: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      rawPacket: { status: 'CRASH', severity: config.id || 'SEVERE', triggerMethod: 'MANUAL_APP_TRIGGER' },
    };

    emergencyStateRef.current = EMERGENCY_STATE.ALERT;
    setEmergencyState(EMERGENCY_STATE.ALERT);
    setSeverity(sev);
    setCountdown(sev.countdown);
    setImpactData(impact);

    const uid = userIdRef.current;
    const u   = userRef.current;

    sendManualCrashToESP32(config.id || 'SEVERE').catch(console.warn);
    publishCrashImmediately(uid, u, impact).catch(console.warn);
    publishRiderImpact(uid, u, impact).catch(console.warn);

    logIncidentToFirestore(uid, {
      force: 45.0,
      severity: sev.level,
      triggerMethod: 'MANUAL_APP_TRIGGER',
    }).then(id => {
      incidentRef.current = id;
      setIncidentId(id);
    }).catch(console.warn);

    if (countdownRef.current) clearInterval(countdownRef.current);
    let remaining = sev.countdown;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        handleDispatch(sev, impact);
      }
    }, 1000);
  }, []);

  /**
   * Mark the rider as safe. Single click cancels countdown, silences buzzer, logs FALSE_ALARM.
   */
  const markSafe = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;

    cooldownUntilRef.current = Date.now() + 10000;

    emergencyStateRef.current = EMERGENCY_STATE.SAFE;
    setEmergencyState(EMERGENCY_STATE.SAFE);

    const uid = userIdRef.current;
    const u   = userRef.current;

    publishSafeImmediately(uid, u).catch(console.warn);

    try {
      await sendImSafe();
    } catch (err) {
      console.warn('[Emergency] sendImSafe failed, trying CANCEL_ALARM fallback:', err);
      try {
        await sendCancellationSignal();
      } catch (e) {
        console.warn('[Emergency] BLE cancel failed:', e);
      }
    }

    if (incidentRef.current && uid) {
      updateIncidentStatus(uid, incidentRef.current, 'FALSE_ALARM').catch(console.warn);
    }

    setTimeout(() => {
      emergencyStateRef.current = EMERGENCY_STATE.IDLE;
      setEmergencyState(EMERGENCY_STATE.IDLE);
      setSeverity(null);
      setCountdown(0);
      setHospitals([]);
      setIncidentId(null);
      setImpactData(null);
      incidentRef.current = null;
    }, 1200);
  }, []);

  return {
    emergencyState,
    severity,
    countdown,
    hospitals,
    incidentId,
    impactData,
    triggerImpact,
    triggerManualCrash,
    markSafe,
  };
}
