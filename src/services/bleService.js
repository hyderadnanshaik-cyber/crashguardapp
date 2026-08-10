/**
 * @file bleService.js
 * @description Web Bluetooth GATT client for ESP32 Crash Guard helmet.
 *
 * ── Supported telemetry schemas (auto-detected per packet) ───────────────────
 *
 * Schema A — Hardware firmware (new):
 *   { status, severity, accelZ, speed, battery }
 *   status   : "ARMED" | "CRASH"
 *   severity : "NONE"  | "MINOR" | "MODERATE" | "SEVERE"
 *   accelZ   : float  (G-force on Z axis, m/s²)
 *   speed    : float  (km/h)
 *   battery  : int    (%)
 *
 * Schema B — Full sensor payload (legacy / extended):
 *   { ax, ay, az, gx, gy, gz, speed_kmh, satellites, latitude, longitude, battery_pct }
 *
 * Both schemas are normalised into a single canonical object before delivery to
 * React hooks. The parser prefers hardware-provided severity over computed.
 *
 * ── GATT addresses ──────────────────────────────────────────────────────────
 *   Service     : 4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   Telemetry   : beb5483e-36e1-4688-b7f5-ea07361b26a8   (notify)
 *   Command     : 821586e3-2e4a-46be-a4b5-857502e1c987   (write w/ response)
 */

// ── GATT UUIDs ─────────────────────────────────────────────────────────────
const SERVICE_UUID   = import.meta.env.VITE_BLE_SERVICE_UUID    || '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const TELEMETRY_UUID = import.meta.env.VITE_BLE_CHAR_TELEMETRY  || 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const COMMAND_UUID   = import.meta.env.VITE_BLE_CHAR_COMMAND     || '821586e3-2e4a-46be-a4b5-857502e1c987';
// "I'm Safe" confirmation characteristic (write-only, no-response)
const SAFE_UUID      = import.meta.env.VITE_BLE_CHAR_SAFE        || 'beb5483e-36e1-4688-b7f5-ea07361b26b0';
// Logged-in Username characteristic (write-only)
const USERNAME_CHAR_UUID = import.meta.env.VITE_BLE_CHAR_USERNAME || 'beb5483e-36e1-4688-b7f5-ea07361b26c1';

// ESP32 advertised device name (used as primary filter so the picker finds it)
const DEVICE_NAME    = import.meta.env.VITE_BLE_DEVICE_NAME     || 'Crash Guard ESP32';

// ── Module state ─────────────────────────────────────────────────────────────
let _device       = null;
let _server       = null;
let _service      = null;
let _telChar      = null;  // telemetry notifications
let _cmdChar      = null;  // general command write
let _safeChar     = null;  // "I'm Safe" confirmation write
let _usernameChar = null;  // logged-in username write

// Stored telemetry callback — kept so auto-reconnect can re-subscribe
let _onPacketCb   = null;
// Auto-reconnect flag — set to false when user intentionally disconnects
let _shouldReconnect = false;
let _reconnectTimer  = null;
let _reconnectUser   = null; // username for re-auth write

// ── Text helpers ─────────────────────────────────────────────────────────────
const _decoder = new TextDecoder('utf-8');
const _encoder = new TextEncoder();

/**
 * Safely decode a DataView (or ArrayBuffer) to a UTF-8 string.
 * Handles both full-buffer and sub-buffer DataViews.
 */
function _decodeDataView(dv) {
  if (dv instanceof DataView) {
    return _decoder.decode(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength));
  }
  return _decoder.decode(dv);
}

// ── Packet accumulator (handles split BLE MTU chunks) ───────────────────────
let _partial = '';

/**
 * Feed raw text into the accumulator.
 * Returns a complete JSON string if one is available, otherwise null.
 */
function _accumulate(chunk) {
  _partial += chunk;
  const start = _partial.indexOf('{');
  const end   = _partial.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const complete = _partial.slice(start, end + 1);
    _partial = _partial.slice(end + 1); // keep remainder for next chunk
    return complete;
  }
  return null;
}

// ── Severity map (hardware string → internal object) ─────────────────────────
const SEVERITY_MAP = {
  MINOR:    { level: 'Minor',    countdown: 30, color: '#f59e0b' },
  MODERATE: { level: 'Moderate', countdown: 30, color: '#f97316' },
  SEVERE:   { level: 'Severe',   countdown: 30, color: '#EE0000' },
};

// ── Public helpers ─────────────────────────────────────────────────────────
export function computeResultantForce(ax, ay, az) {
  return Math.sqrt(ax * ax + ay * ay + az * az);
}

export function getSeverity(force) {
  if (force > 50) return SEVERITY_MAP.SEVERE;
  if (force > 35) return SEVERITY_MAP.MODERATE;
  if (force > 15) return SEVERITY_MAP.MINOR;
  return null;
}

export function isBLESupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

// ── DOM State Binder Helpers ──────────────────────────────────────────────────
export function updateFullDashboardUI(data) {
  if (typeof document === 'undefined') return;

  if (document.getElementById('status-badge')) {
    const el = document.getElementById('status-badge');
    el.innerText = data.status || 'ARMED';
    el.className = data.status === 'CRASH' ? 'badge-danger bg-red-600 text-white' : 'badge-success bg-emerald-600 text-white';
  }
  if (document.getElementById('accel-x')) document.getElementById('accel-x').innerText = Number(data.accelX ?? data.ax ?? 0).toFixed(2);
  if (document.getElementById('accel-y')) document.getElementById('accel-y').innerText = Number(data.accelY ?? data.ay ?? 0).toFixed(2);
  if (document.getElementById('accel-z')) document.getElementById('accel-z').innerText = Number(data.accelZ ?? data.az ?? 0).toFixed(2);
  if (document.getElementById('accel-val')) document.getElementById('accel-val').innerText = Number(data.resultantForce ?? data.accelZ ?? 0).toFixed(2);

  if (document.getElementById('gyro-x')) document.getElementById('gyro-x').innerText = Number(data.gyroX ?? data.gx ?? 0).toFixed(2);
  if (document.getElementById('gyro-y')) document.getElementById('gyro-y').innerText = Number(data.gyroY ?? data.gy ?? 0).toFixed(2);
  if (document.getElementById('gyro-z')) document.getElementById('gyro-z').innerText = Number(data.gyroZ ?? data.gz ?? 0).toFixed(2);

  if (document.getElementById('speed-display')) document.getElementById('speed-display').innerText = Number(data.speed ?? data.speed_kmh ?? 0).toFixed(1);
  if (document.getElementById('speed-val')) document.getElementById('speed-val').innerText = Number(data.speed ?? data.speed_kmh ?? 0).toFixed(1);
}

export function triggerWebCrashAlert(severity, accelZ, speed) {
  console.warn(`CRASH DETECTED ON HARDWARE! Severity: ${severity}, AccelZ: ${accelZ}, Speed: ${speed}`);
  if (typeof document === 'undefined') return;

  if (document.getElementById('crash-alert-banner')) {
    document.getElementById('crash-alert-banner').style.display = 'flex';
    if (document.getElementById('crash-severity-text')) {
      document.getElementById('crash-severity-text').innerText = severity || 'SEVERE';
    }
  }
}

export function clearWebCrashAlert() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('crash-alert-banner')) {
    document.getElementById('crash-alert-banner').style.display = 'none';
  }
}

/**
 * Direct Event Listener for characteristicvaluechanged
 */
export function handleNotifications(event) {
  const value = event.target.value; // DataView buffer from ESP32
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(value);

  try {
    const telemetry = JSON.parse(jsonString);
    console.log("Live Telemetry & Crash Data Received:", telemetry);

    const { canonical, force, severity } = normaliseTelemetry(telemetry);

    if (telemetry.status === "CRASH") {
      triggerWebCrashAlert(telemetry.severity, canonical.accelZ, canonical.speed);
    } else {
      clearWebCrashAlert();
    }

    updateFullDashboardUI(canonical);

    return { canonical, force, severity };
  } catch (error) {
    console.error("JSON Parse Error from BLE stream:", jsonString, error);
  }
}

// ── Packet normaliser ────────────────────────────────────────────────────────
/**
 * Accepts Schema A, Schema B, or full hardware packet and returns canonical object.
 *
 * @param   {object} raw  Parsed JSON from ESP32
 * @returns {{ canonical: object, force: number, severity: object|null }}
 */
export function normaliseTelemetry(raw) {
  let isExplicitButtonCancel = false;

  if (typeof raw === 'object' && raw !== null) {
    const rawEvt = String(raw.event || raw.status || '').toUpperCase();
    if (rawEvt.includes('CANCEL_ALERT') || rawEvt.includes('SAFE_BUTTON')) {
      isExplicitButtonCancel = true;
    }
  } else if (typeof raw === 'string') {
    const str = raw.trim().toUpperCase();
    if (str.includes('CANCEL_ALERT') || str.includes('SAFE_BUTTON')) {
      isExplicitButtonCancel = true;
    }
  }

  // If raw is a plain string payload from ESP32 (e.g. "CRASH", "CRASH_DETECTED", "ARMED")
  if (typeof raw === 'string') {
    const str = raw.trim().toUpperCase();
    if (str.includes('CRASH') || str.includes('IMPACT') || str.includes('ALERT')) {
      raw = { status: 'CRASH', severity: 'SEVERE' };
    } else if (str.includes('ARMED') || str.includes('SAFE') || str.includes('CANCEL')) {
      raw = { status: 'ARMED', severity: 'NONE' };
    } else {
      raw = {};
    }
  } else if (raw && typeof raw === 'object') {
    // Standardize object flags: support raw.crash, raw.event, raw.alert, raw.type, raw.status
    const statusStr = String(raw.status || raw.event || raw.alert || raw.type || '').toUpperCase();
    if (raw.crash === true || statusStr.includes('CRASH') || statusStr.includes('IMPACT') || statusStr.includes('ALERT')) {
      raw.status = 'CRASH';
    } else if (statusStr.includes('ARMED') || statusStr.includes('SAFE') || statusStr.includes('CANCEL')) {
      raw.status = 'ARMED';
    }
  }

  // Resolve acceleration values (support ax/ay/az and accelX/accelY/accelZ)
  const ax = raw?.accelX ?? raw?.ax ?? 0;
  const ay = raw?.accelY ?? raw?.ay ?? 0;
  const az = raw?.accelZ ?? raw?.az ?? 0;

  // Resolve gyroscope values (support gx/gy/gz and gyroX/gyroY/gyroZ)
  const gx = raw?.gyroX ?? raw?.gx ?? 0;
  const gy = raw?.gyroY ?? raw?.gy ?? 0;
  const gz = raw?.gyroZ ?? raw?.gz ?? 0;

  const force = computeResultantForce(ax, ay, az);

  // Hardware-reported severity string takes priority
  let severity = null;
  if (raw?.severity && raw.severity !== 'NONE') {
    const key = String(raw.severity).toUpperCase();
    severity = SEVERITY_MAP[key] ?? { level: raw.severity, countdown: 30, color: '#EE0000' };
  } else if (raw?.status === 'CRASH' || raw?.status === 'crash') {
    // Hardware explicitly said CRASH but no severity string — compute from force
    severity = getSeverity(force) ?? { level: 'Severe', countdown: 30, color: '#EE0000' };
  }

  const canonical = {
    status:        raw?.status ?? (severity ? 'CRASH' : undefined),
    severity:      raw?.severity ?? (severity ? severity.level.toUpperCase() : undefined),

    ax, ay, az,
    accelX: ax, accelY: ay, accelZ: az,

    gx, gy, gz,
    gyroX: gx, gyroY: gy, gyroZ: gz,

    speed:         raw?.speed        ?? raw?.speed_kmh ?? 0,
    speed_kmh:     raw?.speed_kmh    ?? raw?.speed     ?? 0,

    battery:       raw?.battery      ?? raw?.battery_pct ?? null,
    battery_pct:   raw?.battery_pct  ?? raw?.battery    ?? null,

    satellites:    raw?.satellites   ?? null,
    latitude:      raw?.latitude     ?? null,
    longitude:     raw?.longitude    ?? null,

    resultantForce: force,
    isExplicitButtonCancel,
  };

  return { canonical, force, severity };
}

// ── Connection ──────────────────────────────────────────────────────────────
/**
 * Request device and connect to GATT server.
 * Discovery strategy:
 *   1. Filter by exact device name ("Crash Guard ESP32") — works when ESP32
 *      advertises by name and the service UUID is NOT in the advert packet.
 *   2. Fallback: filter by service UUID — works when UUID IS advertised.
 *   3. Fallback: accept all devices — lets the user manually pick.
 */
export async function connectToHelmet(userName = null) {
  if (!isBLESupported()) {
    throw new Error('Web Bluetooth is not supported. Please use Google Chrome or Microsoft Edge on desktop.');
  }

  _partial = ''; // reset accumulator

  const requestStrategies = [
    // Strategy 1 — name filter (most reliable for ESP32 + ArduinoBLE)
    {
      filters:          [{ name: DEVICE_NAME }],
      optionalServices: [SERVICE_UUID],
    },
    // Strategy 2 — service UUID in advertisement
    {
      filters:          [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    },
    // Strategy 3 — accept all (user manually picks)
    {
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID],
    },
  ];

  let lastError = null;
  for (const opts of requestStrategies) {
    try {
      _device = await navigator.bluetooth.requestDevice(opts);
      break; // success — stop trying
    } catch (e) {
      if (e.name === 'NotFoundError') throw e;          // user cancelled picker
      if (e.name === 'NotSupportedError') throw e;      // browser blocked
      lastError = e;
      console.warn(`[BLE] Strategy failed (${e.message}), trying next…`);
    }
  }
  if (!_device) throw lastError ?? new Error('[BLE] Could not find device.');

  _device.addEventListener('gattserverdisconnected', _handleDisconnect);

  _server  = await _device.gatt.connect();
  _service = await _server.getPrimaryService(SERVICE_UUID);

  _telChar = await _service.getCharacteristic(TELEMETRY_UUID);

  // Command characteristic — optional
  try {
    _cmdChar = await _service.getCharacteristic(COMMAND_UUID);
  } catch {
    console.warn('[BLE] Command characteristic not found — write commands disabled.');
    _cmdChar = null;
  }

  // "I'm Safe" confirmation characteristic — optional
  try {
    _safeChar = await _service.getCharacteristic(SAFE_UUID);
  } catch {
    console.warn('[BLE] Safe characteristic not found — will fall back to COMMAND char.');
    _safeChar = null;
  }

  // Logged-in Username characteristic — optional
  try {
    _usernameChar = await _service.getCharacteristic(USERNAME_CHAR_UUID);
  } catch {
    console.warn('[BLE] Username characteristic not found on device.');
    _usernameChar = null;
  }

  // Write logged-in username immediately if provided
  if (userName) {
    await sendUsernameToESP32(userName).catch((err) =>
      console.warn('[BLE] Initial username write notice:', err)
    );
  }

  // Enable auto-reconnect now that we have a valid session
  _shouldReconnect = true;
  _reconnectUser   = userName;

  console.info(`[BLE] ✅ Connected to: ${_device.name}`);
  return { deviceName: _device.name ?? DEVICE_NAME };
}

export function disconnectFromHelmet() {
  // Disable auto-reconnect BEFORE disconnecting so the handler doesn't re-trigger
  _shouldReconnect = false;
  clearTimeout(_reconnectTimer);
  if (_device?.gatt?.connected) {
    _device.removeEventListener('gattserverdisconnected', _handleDisconnect);
    _device.gatt.disconnect();
    console.info('[BLE] Disconnected.');
  }
  _device = _server = _service = _telChar = _cmdChar = _safeChar = _usernameChar = null;
  _onPacketCb = null;
  _partial = '';
}

export function isConnected() {
  return !!_device?.gatt?.connected;
}

export function getDeviceName() {
  return _device?.name ?? null;
}

export function getGattServer() {
  return _server;
}

export function getCommandCharacteristic() {
  return _cmdChar || _safeChar;
}

// ── Telemetry subscription ──────────────────────────────────────────────────
/**
 * Subscribe to BLE notifications on the telemetry characteristic.
 *
 * @param {function(canonical: object, force: number, severity: object|null): void} onPacket
 *   canonical = normalised telemetry object (works for both schemas)
 *   force     = resultant acceleration in m/s²
 *   severity  = { level, countdown, color } or null (no crash)
 */
export async function subscribeToTelemetry(onPacket) {
  if (!_telChar) throw new Error('[BLE] Not connected. Call connectToHelmet() first.');

  // Store callback for auto-reconnect re-subscription
  _onPacketCb = onPacket;

  await _telChar.startNotifications();
  console.info('[BLE] 🔔 Subscribed to telemetry notifications.');

  _telChar.addEventListener('characteristicvaluechanged', (event) => {
    try {
      const chunk = _decodeDataView(event.target.value);
      let raw = null;

      // 1. Try multi-chunk JSON accumulator
      const jsonStr = _accumulate(chunk);
      if (jsonStr) {
        try {
          raw = JSON.parse(jsonStr);
        } catch {
          raw = jsonStr;
        }
      } else {
        // 2. Direct check on single chunk (JSON or string command)
        const trimmed = chunk.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            raw = JSON.parse(trimmed);
            _partial = ''; // reset accumulator
          } catch {}
        } else if (
          trimmed.toUpperCase().includes('CRASH') ||
          trimmed.toUpperCase().includes('ARMED') ||
          trimmed.toUpperCase().includes('SAFE') ||
          trimmed.toUpperCase().includes('CANCEL') ||
          trimmed.toUpperCase().includes('ALERT')
        ) {
          raw = trimmed;
          _partial = ''; // reset accumulator
        }
      }

      if (!raw) return;

      console.debug('[BLE] Parsed raw packet:', raw);
      const { canonical, force, severity } = normaliseTelemetry(raw);
      if (_onPacketCb) _onPacketCb(canonical, force, severity);
    } catch (err) {
      console.warn('[BLE] ⚠️ Parse error on telemetry packet:', err.message);
      _partial = '';
    }
  });
}

// ── Command write ─────────────────────────────────────────────────────────────
/**
 * Transmit cancellation payload to ESP32 over BLE.
 * Signals the hardware helmet to stop buzzer/LED alarm sequences.
 */
export async function sendCancelToHardware() {
  if (!_server || !_server.connected || !_service) {
    console.warn('[BLE] Helmet not connected for cancellation.');
    return;
  }

  const payloads = ['SAFE', '0'];

  try {
    const allCharacteristics = await _service.getCharacteristics().catch(() => []);
    const usernameUuidLower = USERNAME_CHAR_UUID.toLowerCase();
    
    // EXCLUDE Username characteristic so cancellation never corrupts the display name!
    const charsToTry = new Set(
      [...allCharacteristics, _safeChar, _cmdChar]
        .filter(Boolean)
        .filter(c => c.uuid.toLowerCase() !== usernameUuidLower)
    );

    for (const char of charsToTry) {
      for (const p of payloads) {
        try {
          const bytes = _encoder.encode(p);
          if (typeof char.writeValue === 'function') {
            await char.writeValue(bytes);
          } else if (char.properties?.writeWithoutResponse && typeof char.writeValueWithoutResponse === 'function') {
            await char.writeValueWithoutResponse(bytes);
          } else if (typeof char.writeValueWithResponse === 'function') {
            await char.writeValueWithResponse(bytes);
          }
        } catch {}
      }
    }
    console.log("Transmitted cancellation payload (SAFE) to ESP32 across command characteristics.");
  } catch (error) {
    console.error("Failed to send cancellation payload over BLE:", error);
  }
}

export const sendCancelToHelmet = sendCancelToHardware;

/**
 * Send "SAFE" to the helmet confirmation characteristic.
 */
export async function sendImSafe() {
  await sendCancelToHardware();

  if (typeof document !== 'undefined') {
    const badge = document.getElementById('status-badge');
    if (badge) {
      badge.innerText = "ARMED (SAFE ACK)";
      badge.className = "badge-success bg-emerald-600 text-white text-xs font-bold uppercase px-2.5 py-1 rounded-full";
    }
  }

  window.dispatchEvent(new CustomEvent('ble:im_safe_sent'));
}

/**
 * Sends a manual crash trigger command back to the connected ESP32 helmet over Web Bluetooth.
 * Targets ONLY command characteristics — NEVER touches username or safe characteristics.
 * @param {string|number} severityInput - Severity level string ('MINOR'|'MODERATE'|'SEVERE') or number (1|2|3)
 */
export async function sendManualCrashToHardware(severityInput = 'SEVERE') {
  if (!_server || !_server.connected || !_service) {
    console.warn("[BLE] Hardware not connected. Proceeding with Web/Watcher alert only.");
    return;
  }

  const severityStr = String(severityInput).toUpperCase();
  const severityNumMap = { MINOR: 1, MODERATE: 2, SEVERE: 3, '1': 1, '2': 2, '3': 3 };
  const sevNum = severityNumMap[severityStr] || 3;

  const payloads = [`CRASH:${sevNum}`, `CRASH:${severityStr}`, 'CRASH'];

  try {
    const allCharacteristics = await _service.getCharacteristics().catch(() => []);
    const safeUuidLower = SAFE_UUID.toLowerCase();
    const usernameUuidLower = USERNAME_CHAR_UUID.toLowerCase();

    // EXCLUDE Safe characteristic (prevents instant cancellation) AND Username characteristic (prevents OLED name corruption)!
    const charsToTry = new Set(
      [...allCharacteristics, _cmdChar]
        .filter(Boolean)
        .filter(c => {
          const u = c.uuid.toLowerCase();
          return u !== safeUuidLower && u !== usernameUuidLower;
        })
    );

    console.log(`[BLE] Broadcasting manual crash (${payloads[0]}) across ${charsToTry.size} command characteristic(s)...`);

    for (const char of charsToTry) {
      for (const payloadStr of payloads) {
        try {
          const bytes = _encoder.encode(payloadStr);
          if (typeof char.writeValue === 'function') {
            await char.writeValue(bytes);
          } else if (char.properties?.writeWithoutResponse && typeof char.writeValueWithoutResponse === 'function') {
            await char.writeValueWithoutResponse(bytes);
          } else if (typeof char.writeValueWithResponse === 'function') {
            await char.writeValueWithResponse(bytes);
          }
          console.log(`[BLE] ✅ Transmitted '${payloadStr}' to characteristic ${char.uuid}`);
        } catch (e) {
          // Ignore write attempt errors on non-writable chars
        }
      }
    }
  } catch (err) {
    console.error("[BLE] Failed to write BLE crash command to helmet:", err);
  }
}

export const sendManualCrashToESP32 = sendManualCrashToHardware;

/**
 * Encode and write the logged-in username string to the ESP32 hardware.
 * Writes EXCLUSIVELY to the dedicated Username Characteristic.
 * @param {string} loggedInUserName
 * @returns {Promise<void>}
 */
export async function sendUsernameToESP32(loggedInUserName) {
  if (!loggedInUserName) return;
  if (!_service && !_usernameChar) {
    console.warn('[BLE] Not connected — cannot write username.');
    return;
  }

  // Try dedicated username char
  let char = _usernameChar;
  if (!char && _service) {
    char = await _service.getCharacteristic(USERNAME_CHAR_UUID).catch(() => null);
    if (char) _usernameChar = char; // cache it
  }
  if (!char) {
    console.warn('[BLE] Dedicated Username characteristic (beb5483e-36e1-4688-b7f5-ea07361b26c1) not found on device.');
    return;
  }

  // Truncate to 64 bytes max (BLE MTU safe)
  const trimmed = String(loggedInUserName).slice(0, 64);
  const bytes = _encoder.encode(trimmed);

  const _tryWrite = async (c) => {
    if (typeof c.writeValueWithoutResponse === 'function' && c.properties?.writeWithoutResponse) {
      await c.writeValueWithoutResponse(bytes);
    } else if (typeof c.writeValueWithResponse === 'function') {
      await c.writeValueWithResponse(bytes);
    } else if (typeof c.writeValue === 'function') {
      await c.writeValue(bytes);
    } else {
      throw new Error('No supported write method on characteristic');
    }
  };

  try {
    await _tryWrite(char);
    console.info(`[BLE] ✅ Username '${trimmed}' sent to ESP32 characteristic ${char.uuid}.`);
  } catch (err) {
    console.warn(`[BLE] First username write attempt failed (${err.message}), retrying in 800ms…`);
    await new Promise(r => setTimeout(r, 800));
    try {
      await _tryWrite(char);
      console.info(`[BLE] ✅ Username '${trimmed}' sent to ESP32 (retry).`);
    } catch (err2) {
      console.error('[BLE] Username write failed after retry:', err2.message);
    }
  }
}

export const sendCancellationSignal = sendCancelToHelmet;

export const BLE_UUIDS = {
  SERVICE:   SERVICE_UUID,
  TELEMETRY: TELEMETRY_UUID,
  COMMAND:   COMMAND_UUID,
  SAFE:      SAFE_UUID,
  USERNAME:  USERNAME_CHAR_UUID,
};

// ── Internal ──────────────────────────────────────────────────────────────────
async function _handleDisconnect() {
  console.warn('[BLE] 📡 Device disconnected unexpectedly.');
  const name = _device?.name;
  _server = _service = _telChar = _cmdChar = _safeChar = null;
  _partial = '';
  window.dispatchEvent(new CustomEvent('ble:disconnected', { detail: { deviceName: name } }));

  // Auto-reconnect: if the user did not intentionally disconnect, try to re-pair
  if (_shouldReconnect && _device && _onPacketCb) {
    console.info('[BLE] 🔄 Auto-reconnect triggered in 2s...');
    clearTimeout(_reconnectTimer);
    _reconnectTimer = setTimeout(async () => {
      try {
        if (!_device?.gatt) return;
        _server  = await _device.gatt.connect();
        _service = await _server.getPrimaryService(SERVICE_UUID);
        _telChar = await _service.getCharacteristic(TELEMETRY_UUID);

        // Re-obtain optional characteristics
        try { _cmdChar      = await _service.getCharacteristic(COMMAND_UUID);   } catch {}
        try { _safeChar     = await _service.getCharacteristic(SAFE_UUID);      } catch {}
        try { _usernameChar = await _service.getCharacteristic(USERNAME_CHAR_UUID); } catch {}

        if (_reconnectUser) {
          await sendUsernameToESP32(_reconnectUser).catch(() => {});
        }

        // Re-subscribe — reuse the stored callback
        await subscribeToTelemetry(_onPacketCb);

        console.info('[BLE] ✅ Auto-reconnected successfully!');
        window.dispatchEvent(new CustomEvent('ble:reconnected', { detail: { deviceName: name } }));
      } catch (err) {
        console.warn('[BLE] Auto-reconnect failed:', err.message);
        // Notify the app that reconnect failed so UI can show a prompt
        window.dispatchEvent(new CustomEvent('ble:reconnect_failed', { detail: { deviceName: name } }));
      }
    }, 2000);
  }
}
