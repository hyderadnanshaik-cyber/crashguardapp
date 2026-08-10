/**
 * @file LiveTelemetryPanel.jsx
 * @description Live BLE Telemetry panel — supports both hardware firmware schema
 * and legacy full-sensor schema. All fields resolved from the canonical
 * telemetry object produced by normaliseTelemetry().
 */
import React from 'react';
import { Activity, Bluetooth, Zap, Compass, Navigation, Battery, Cpu, AlertTriangle, CheckCircle2, Wifi } from 'lucide-react';
import GForceChart from '../charts/GForceChart';
import { BLE_STATUS } from '../../hooks/useBLE';

export default function LiveTelemetryPanel({
  status,
  deviceName,
  telemetry,
  onConnect,
  onDisconnect,
  isSupported,
  lastError,
}) {
  const isConnected = status === BLE_STATUS.CONNECTED;
  const isScanning  = status === BLE_STATUS.SCANNING;

  const {
    // Hardware schema
    status:      helmetStatus = 'ARMED',
    battery      = null,

    // Both schemas — normaliser maps everything to these
    ax = 0, ay = 0, az = 0,
    accelZ       = 0,
    gx = 0, gy = 0, gz = 0,
    speed_kmh    = 0,
    satellites   = null,
    latitude     = null,
    longitude    = null,
    battery_pct  = null,
    resultantForce = 0,
  } = telemetry || {};

  // Resolved battery — prefer hardware field, fallback to legacy
  const batteryLevel = battery ?? battery_pct ?? null;
  // Resolved speed — prefer mapped field
  const speed        = speed_kmh ?? 0;
  // Crash state from hardware status field
  const isCrash      = helmetStatus === 'CRASH';

  return (
    <div className="space-y-6">

      {/* ── Top Banner ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-red-600" size={22} />
            Live BLE Sensor Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {deviceName
              ? `Connected: ${deviceName}`
              : 'Service: 4fafc201 · Char: beb5483e'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Helmet Status Badge */}
          {isConnected && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isCrash
                ? 'bg-red-100 text-red-700 animate-pulse'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isCrash
                ? <><AlertTriangle size={12} /> CRASH DETECTED</>
                : <><CheckCircle2 size={12} /> ARMED</>}
            </span>
          )}

          <button
            id="ble-connect-btn"
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={!isSupported || isScanning}
            className={`px-5 py-2.5 rounded-md font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isConnected
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                : isScanning
                ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-wait'
                : 'bg-black hover:bg-slate-800 text-white shadow-sm'
            }`}
          >
            {isScanning
              ? '🔍 Scanning…'
              : isConnected
              ? 'Disconnect Helmet'
              : '⚡ Connect Helmet (BLE)'}
          </button>
        </div>
      </div>

      {/* ── BLE Error Banner ────────────────────────────────────────────── */}
      {lastError && !isConnected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-semibold text-red-700">BLE Connection Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{lastError}</p>
            <p className="text-xs text-slate-500 mt-1">
              Make sure your helmet is powered on and your browser is Chrome or Edge on desktop.
            </p>
          </div>
        </div>
      )}

      {/* ── Unsupported Browser Banner ──────────────────────────────────── */}
      {status === BLE_STATUS.UNSUPPORTED && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <p className="text-sm text-amber-700">
            Web Bluetooth is not supported in this browser. Please use{' '}
            <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on desktop.
          </p>
        </div>
      )}

      {/* ── Primary Metrics Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Resultant Acceleration */}
        <div id="accel-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resultant Acceleration</span>
            <Zap className="w-5 h-5 text-red-600" />
          </div>
          <div className="my-4">
            <span id="accel-val" className="text-4xl font-extrabold text-slate-900 font-mono">
              {(resultantForce || accelZ || 0).toFixed(2)}
            </span>
            <span className="text-slate-500 font-semibold ml-2 text-sm">m/s²</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100">
            {(ax || ay) ? `X:${ax.toFixed(1)} Y:${ay.toFixed(1)} Z:${az.toFixed(1)}` : 'accelZ from hardware'}
          </div>
        </div>

        {/* Speed & GPS */}
        <div id="speed-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Speed & GPS Fix</span>
            <Navigation className={`w-5 h-5 ${latitude ? 'text-blue-600' : 'text-slate-300'}`} />
          </div>
          <div className="my-4">
            <span id="speed-val" className="text-4xl font-extrabold text-slate-900 font-mono">
              {Number(speed).toFixed(1)}
            </span>
            <span className="text-slate-500 font-semibold ml-2 text-sm">km/h</span>
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between bg-slate-50 p-2 rounded border border-slate-100 font-mono">
            <span>Sats: {satellites != null ? satellites : '—'}</span>
            <span className={latitude ? 'text-emerald-600 font-bold' : 'text-amber-500'}>
              {latitude
                ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                : satellites > 0
                ? `Acquiring… (${satellites} sats)`
                : 'Go outdoors for GPS'}
            </span>
          </div>
        </div>

        {/* Battery */}
        <div id="battery-card" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Helmet Battery</span>
            <Battery className={`w-5 h-5 ${batteryLevel != null ? 'text-emerald-600' : 'text-slate-300'}`} />
          </div>
          <div className="my-4">
            {batteryLevel != null ? (
              <>
                <span className="text-4xl font-extrabold text-slate-900 font-mono">{batteryLevel}</span>
                <span className="text-slate-500 font-semibold ml-1 text-sm">%</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-400">Not Connected</span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                batteryLevel == null
                  ? 'bg-slate-200'
                  : batteryLevel > 50
                  ? 'bg-emerald-500'
                  : batteryLevel > 20
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`}
              style={{ width: batteryLevel != null ? `${batteryLevel}%` : '0%' }}
            />
          </div>
          {batteryLevel == null && (
            <p className="text-[10px] text-slate-400 mt-2 font-mono">Battery sensor not present in hardware</p>
          )}
        </div>

      </div>

      {/* ── Helmet Status Detail ─────────────────────────────────────────── */}
      {isConnected && (
        <div className={`rounded-xl border px-5 py-4 flex items-center gap-3 ${
          isCrash
            ? 'bg-red-50 border-red-300'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <span id="status-badge" className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
            isCrash ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {helmetStatus}
          </span>
          <div>
            <p id="severity-val" className={`text-sm font-semibold ${isCrash ? 'text-red-700' : 'text-emerald-700'}`}>
              {isCrash ? '🚨 Crash Detected — Emergency Protocol Active' : '✅ Helmet monitoring active'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{deviceName}</p>
          </div>
        </div>
      )}

      {/* ── Hardware Crash Alert Banner ──────────────────────────────────── */}
      <div
        id="crash-alert-banner"
        style={{ display: isCrash ? 'flex' : 'none' }}
        className="bg-red-600 text-white rounded-xl p-5 shadow-lg items-center justify-between animate-pulse"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} />
          <div>
            <p className="font-extrabold text-lg uppercase tracking-wide">CRASH DETECTED ON HARDWARE</p>
            <p className="text-xs text-red-100 font-mono">
              Severity: <span id="crash-severity-text">{telemetry?.severity || 'SEVERE'}</span> | AccelZ: {Number(az || accelZ || 0).toFixed(2)} G | Speed: {Number(speed).toFixed(1)} km/h
            </p>
          </div>
        </div>
      </div>

      {/* ── Axis Breakdowns ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Cpu size={16} className="text-slate-500" />
            3-Axis Accelerometer (m/s²)
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">X-Axis</span>
              <span id="accel-x" className="text-lg font-bold text-slate-900">{Number(ax || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">Y-Axis</span>
              <span id="accel-y" className="text-lg font-bold text-slate-900">{Number(ay || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">Z-Axis</span>
              <span id="accel-z" className="text-lg font-bold text-slate-900">{Number(az || accelZ || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Compass size={16} className="text-slate-500" />
            3-Axis Gyroscope (°/s)
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">GX</span>
              <span id="gyro-x" className="text-lg font-bold text-slate-900">{Number(gx || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">GY</span>
              <span id="gyro-y" className="text-lg font-bold text-slate-900">{Number(gy || 0).toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <span className="text-xs text-slate-400 block">GZ</span>
              <span id="gyro-z" className="text-lg font-bold text-slate-900">{Number(gz || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-time Waveform Chart ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Wifi size={16} className="text-slate-500" />
          Real-time G-Force Waveform
        </h3>
        <div className="h-64 w-full">
          <GForceChart force={resultantForce || accelZ} />
        </div>
      </div>

    </div>
  );
}
