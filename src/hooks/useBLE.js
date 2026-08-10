/**
 * @file useBLE.js
 * @description React hook for BLE helmet connection.
 *
 * Accepts telemetry from both hardware firmware schema and legacy full-sensor schema.
 * All incoming packets are normalised by bleService.normaliseTelemetry() before
 * reaching this hook.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  connectToHelmet,
  disconnectFromHelmet,
  subscribeToTelemetry,
  isBLESupported,
  isConnected,
  normaliseTelemetry,
} from '../services/bleService';

import { publishSafeImmediately } from '../services/riderPublisherService';

export const BLE_STATUS = {
  UNSUPPORTED:    'UNSUPPORTED',
  DISCONNECTED:   'DISCONNECTED',
  SCANNING:       'SCANNING',
  CONNECTED:      'CONNECTED',
  RECONNECTING:   'RECONNECTING',
  ERROR:          'ERROR',
};

/** Canonical telemetry shape — matches normaliseTelemetry() output */
const DEFAULT_TELEMETRY = {
  // Hardware schema fields
  status:         'ARMED',
  accelZ:         null,
  speed:          null,
  battery:        null,

  // Full sensor schema fields
  ax: null, ay: null, az: null,
  gx: null, gy: null, gz: null,
  speed_kmh:      null,
  satellites:     null,
  latitude:       null,
  longitude:      null,
  battery_pct:    null,

  // Computed
  resultantForce: null,
};

/**
 * @param {function(impactPayload): void} onImpact
 *   Called when a crash severity is detected in the incoming telemetry.
 * @param {function(): void} onHardwareCancel
 *   Called ONLY when the hardware explicitly transitions from CRASH → ARMED
 *   (i.e., the physical cancel button was pressed on the helmet).
 */
export function useBLE(onImpact, onHardwareCancel) {
  const [status,     setStatus]     = useState(
    isBLESupported() ? BLE_STATUS.DISCONNECTED : BLE_STATUS.UNSUPPORTED
  );
  const [deviceName, setDeviceName] = useState(null);
  const [telemetry,  setTelemetry]  = useState(DEFAULT_TELEMETRY);
  const [lastError,  setLastError]  = useState(null);

  const onImpactRef         = useRef(onImpact);
  const onHardwareCancelRef = useRef(onHardwareCancel);
  // Tracks the last hardware-reported status so we can detect true transitions
  const lastHwStatusRef     = useRef('ARMED'); // starts as ARMED (no crash)
  // Prevents firing onImpact on every repeated CRASH packet — only fire once per event
  const crashFiredRef       = useRef(false);

  useEffect(() => { onImpactRef.current = onImpact; }, [onImpact]);
  useEffect(() => { onHardwareCancelRef.current = onHardwareCancel; }, [onHardwareCancel]);

  // ── Listen for unexpected hardware disconnect ──────────────────────────────
  useEffect(() => {
    const onDisconnect = (e) => {
      // Show RECONNECTING state — don't wipe telemetry yet so the UI stays populated
      setStatus(BLE_STATUS.RECONNECTING);
      // The auto-reconnect in bleService will fire ble:reconnected or ble:reconnect_failed
    };

    const onReconnected = () => {
      console.info('[useBLE] Auto-reconnect succeeded, restoring CONNECTED state.');
      setStatus(BLE_STATUS.CONNECTED);
      // Reset crash tracking refs since we have a fresh BLE session
      lastHwStatusRef.current = 'ARMED';
      // Note: crashFiredRef stays true if crash was already active — good!
    };

    const onReconnectFailed = () => {
      console.warn('[useBLE] Auto-reconnect failed. Showing DISCONNECTED.');
      setStatus(BLE_STATUS.DISCONNECTED);
      setDeviceName(null);
      setTelemetry(DEFAULT_TELEMETRY);
      lastHwStatusRef.current = 'ARMED';
      crashFiredRef.current = false;
    };

    // ── Background hardware simulator for dev / QA ─────────────────────────
    const onSimulatedPacket = (event) => {
      const raw = event.detail || {};
      const { canonical, force, severity } = normaliseTelemetry(raw);

      setTelemetry(prev => {
        const next = { ...prev };
        for (const key in canonical) {
          if (canonical[key] !== undefined && canonical[key] !== null) {
            next[key] = canonical[key];
          }
        }
        return next;
      });

      const hwStatus = canonical.status;
      _processHwStatusTransition(hwStatus, canonical, force, severity);
    };

    window.addEventListener('ble:disconnected',     onDisconnect);
    window.addEventListener('ble:reconnected',      onReconnected);
    window.addEventListener('ble:reconnect_failed', onReconnectFailed);
    window.addEventListener('ble:simulated_packet', onSimulatedPacket);
    return () => {
      window.removeEventListener('ble:disconnected',     onDisconnect);
      window.removeEventListener('ble:reconnected',      onReconnected);
      window.removeEventListener('ble:reconnect_failed', onReconnectFailed);
      window.removeEventListener('ble:simulated_packet', onSimulatedPacket);
    };
  }, []);

  // ── Connect & subscribe ───────────────────────────────────────────────────
  const connect = useCallback(async (userName = null) => {
    if (!isBLESupported()) return;
    setStatus(BLE_STATUS.SCANNING);
    setLastError(null);

    try {
      const { deviceName: name } = await connectToHelmet(userName);
      setDeviceName(name);
      setStatus(BLE_STATUS.CONNECTED);

      // Fresh connection — always reset crash state so a previous false-positive
      // can't block the next real crash event.
      crashFiredRef.current = false;
      lastHwStatusRef.current = 'ARMED';

      await subscribeToTelemetry((canonical, force, severity) => {
        // ── Update live telemetry state (merge, never wipe) ──────────
        setTelemetry(prev => {
          const next = { ...prev };
          for (const key in canonical) {
            if (canonical[key] !== undefined && canonical[key] !== null) {
              next[key] = canonical[key];
            }
          }
          return next;
        });

        const hwStatus = canonical.status;
        _processHwStatusTransition(hwStatus, canonical, force, severity);
      });

    } catch (err) {
      console.error('[useBLE] Connection failed:', err);
      const msg = err.message || 'Unknown BLE error';
      setLastError(msg);
      setStatus(isConnected() ? BLE_STATUS.CONNECTED : BLE_STATUS.ERROR);
    }
  }, []);

  // ── Internal: handle hardware status transitions ───────────────────────────
  // This is the ONLY place where crash-start and crash-cancel events are fired.
  // Using a closure-over-refs approach so it is stable and doesn't need to be
  // a dependency of any useEffect.
  function _processHwStatusTransition(hwStatus, canonical, force, severity) {
    const normalised = hwStatus ? String(hwStatus).toUpperCase() : '';
    const isCrash = normalised.includes('CRASH') || normalised.includes('IMPACT') || normalised.includes('ALERT') || !!severity;
    
    // Explicit cancellation: ONLY when hardware physically transmits an explicit button cancel event
    const isExplicitButtonCancel = Boolean(canonical?.isExplicitButtonCancel) || normalised.includes('CANCEL_ALERT') || normalised.includes('SAFE_BUTTON');

    // ── CRASH start: fire once when a crash is detected ────────────────────────
    if (isCrash && !crashFiredRef.current) {
      crashFiredRef.current = true;
      lastHwStatusRef.current = 'CRASH';
      const activeSeverity = severity || { level: 'SEVERE', countdown: 30, color: '#EE0000' };
      console.info('[useBLE] 🚨 CRASH event detected! Firing onImpact trigger.');
      if (onImpactRef.current) {
        onImpactRef.current({
          force: force || canonical.accelZ || 9.8,
          severity: activeSeverity,
          gps: {
            lat:        canonical.latitude,
            lon:        canonical.longitude,
            velocity:   canonical.speed_kmh || canonical.speed,
            satellites: canonical.satellites,
          },
          gyro:      { x: canonical.gx, y: canonical.gy, z: canonical.gz },
          rawPacket: canonical,
        });
      }
      return;
    }

    // ── Physical button cancel: ONLY fire when rider explicitly presses hardware button ─
    if (isExplicitButtonCancel && crashFiredRef.current) {
      crashFiredRef.current = false;
      lastHwStatusRef.current = 'ARMED';
      console.info('[useBLE] 🟢 Physical hardware button pressed. Dismissing crash alert.');
      if (onHardwareCancelRef.current) {
        onHardwareCancelRef.current();
      }
    }
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    disconnectFromHelmet();
    setStatus(BLE_STATUS.DISCONNECTED);
    setDeviceName(null);
    setTelemetry(DEFAULT_TELEMETRY);
    lastHwStatusRef.current = 'ARMED';
    crashFiredRef.current = false;
    setLastError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (isConnected()) disconnectFromHelmet(); };
  }, []);

  const resetCrashState = useCallback(() => {
    crashFiredRef.current = false;
    lastHwStatusRef.current = 'ARMED';
  }, []);

  return {
    status,
    deviceName,
    telemetry,
    lastError,
    connect,
    disconnect,
    resetCrashState,
    isSupported: isBLESupported(),
  };
}
