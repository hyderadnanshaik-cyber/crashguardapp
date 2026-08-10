/**
 * @file WatcherDashboard.jsx
 * @description Streamlined, read-only Watcher Portal.
 * Pulls live rider data from Firestore via 6-digit access code.
 * Features:
 * - Real-time cancellation sync (instant green status when rider marks safe)
 * - Strict Online / Offline status calculation with robust Firestore timestamp fallback
 * - Rider Activity & Connection History Timeline log feed
 */
import React, { useState, useEffect } from 'react';
import {
  MapPin, Wifi, WifiOff, Battery, Shield, ShieldAlert,
  Phone, Siren, RefreshCw, Navigation, Activity, AlertTriangle
} from 'lucide-react';
import WatcherGlassesIcon from '../components/ui/WatcherGlassesIcon';
import { HelmetLogo } from '../components/ui/HelmetLogo';
import Footer from '../components/layout/Footer';
import ActivityTimeline from '../components/watcher/ActivityTimeline';
import {
  collection, doc, onSnapshot, query, orderBy, limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
});

const redMotorcycleIcon = new L.Icon({
  iconUrl:    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

// Component to update map center dynamically
function ChangeMapCenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

import {
  bindWatcherToRider
} from '../services/watcherService';

const LS_ROLE         = 'cg_role';
const LS_WATCHER_CODE = 'cg_watcher_code';

/* ── Status Badge ────────────────────────────────────────────────────────────── */
function SafetyBadge({ status, isOnlineStrict, isAppOpen, bleConnected, secondsSinceLastSeen }) {
  if (status === 'CRASH') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full animate-pulse shadow-lg shadow-red-600/40">
        <ShieldAlert size={18} />
        <span className="font-black text-sm uppercase tracking-widest">CRASH ALERT DETECTED</span>
      </div>
    );
  }

  let connectionBadge = null;
  if (isOnlineStrict) {
    connectionBadge = (
      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full font-bold text-xs shadow-md shadow-emerald-500/30 animate-pulse flex items-center gap-1.5">
        <Wifi size={12} />
        <span>ONLINE (LIVE)</span>
      </span>
    );
  } else if (isAppOpen && !bleConnected) {
    connectionBadge = (
      <span className="px-3 py-1 bg-amber-500 text-white rounded-full font-bold text-xs shadow-md shadow-amber-500/30 flex items-center gap-1.5">
        <Wifi size={12} />
        <span>APP OPEN (NO BLE)</span>
      </span>
    );
  } else {
    const lastSeenText = secondsSinceLastSeen < 60
      ? `Last seen ${secondsSinceLastSeen}s ago`
      : secondsSinceLastSeen < 3600
      ? `Last seen ${Math.floor(secondsSinceLastSeen / 60)}m ago`
      : 'OFFLINE / DISCONNECTED';

    connectionBadge = (
      <span className="px-3 py-1 bg-slate-500 text-white rounded-full font-bold text-xs shadow-md flex items-center gap-1.5">
        <WifiOff size={12} />
        <span>{lastSeenText}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {connectionBadge}
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30">
        <Shield size={18} />
        <span className="font-black text-sm uppercase tracking-widest">NOMINAL / SAFE</span>
      </div>
    </div>
  );
}

/* ── Metric Card ─────────────────────────────────────────────────────────────── */
function MetricCard({ label, value, unit, icon: Icon, color = 'slate', sub, valueId }) {
  const colorMap = {
    slate:  'text-slate-600 bg-slate-50 border-slate-200',
    blue:   'text-blue-600 bg-blue-50 border-blue-200',
    green:  'text-emerald-600 bg-emerald-50 border-emerald-200',
    red:    'text-red-600 bg-red-50 border-red-200',
    amber:  'text-amber-600 bg-amber-50 border-amber-200',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg border ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <span id={valueId} className="text-3xl font-extrabold text-slate-900 font-mono">{value ?? '—'}</span>
        {unit && <span className="text-slate-500 font-semibold ml-1.5 text-sm">{unit}</span>}
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Impact Alert Card ───────────────────────────────────────────────────────── */
function ImpactCard({ impact }) {
  const severityStyles = {
    MINOR:    { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
    MODERATE: { bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
    SEVERE:   { bg: 'bg-red-50 border-red-400',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    pulse: true },
  };

  const sevLevel = (typeof impact?.severity === 'string' ? impact.severity : impact?.severity?.level) || 'MINOR';
  const key = String(sevLevel).toUpperCase();
  const s = severityStyles[key] || severityStyles.MINOR;

  return (
    <div className={`rounded-2xl border-2 p-5 ${s.bg} ${s.pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Siren size={18} className={s.text} />
          <span className={`font-black text-base ${s.text}`}>Impact Detected</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.badge}`}>
          {sevLevel}
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-500">Force</span>
          <span className="font-bold font-mono">{impact?.force?.toFixed(1) ?? '—'} m/s²</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Speed at impact</span>
          <span className="font-bold font-mono">{impact?.gps?.velocity ?? '—'} km/h</span>
        </div>
        {impact?.gps?.lat && (
          <div className="flex justify-between">
            <span className="text-slate-500">Coordinates</span>
            <span className="font-bold font-mono text-xs">{impact.gps.lat.toFixed(4)}, {impact.gps.lon.toFixed(4)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Countdown</span>
          <span className="font-bold text-red-600">{impact?.severity?.countdown ?? 45}s</span>
        </div>
      </div>
    </div>
  );
}

/* ── Live Map using react-leaflet ────────────────────────────────────────────── */
function LiveMapCard({ lat, lon, speed, riderName = 'Rider' }) {
  const hasLocation = lat && lon;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white z-10 shrink-0">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Navigation size={17} className="text-blue-600" />
          Live GPS Tracking
        </h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${hasLocation ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
          {hasLocation ? `${speed ?? 0} km/h` : 'No Signal'}
        </span>
      </div>
      <div className="relative flex-1 bg-slate-100 z-0">
        {hasLocation ? (
          <MapContainer
            center={[lat, lon]}
            zoom={15}
            style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
            className="z-0"
          >
            <ChangeMapCenter center={[lat, lon]} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[lat, lon]} icon={redMotorcycleIcon}>
              <Popup>
                <div className="text-sm font-semibold text-gray-900">{riderName}</div>
                <div className="text-xs text-gray-600">Live Position</div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50 z-10">
            <MapPin size={32} className="opacity-40 animate-pulse" />
            <p className="text-sm font-semibold">Waiting for GPS signal...</p>
            <p className="text-xs">Rider helmet must be connected and outdoors.</p>
          </div>
        )}
      </div>
      {hasLocation && (
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono shrink-0 z-10">
          <span>Lat: {lat.toFixed(5)}</span>
          <span>Lon: {lon.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Watcher Dashboard ──────────────────────────────────────────────────── */
export default function WatcherDashboard({ user, onSignOut }) {
  const accessCode = localStorage.getItem(LS_WATCHER_CODE) || localStorage.getItem('pairedRiderSessionId') || '';

  const [riderData, setRiderData]     = useState(null);
  const [latestImpact, setLatestImpact] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 1. Cancellation Sync logic
  const isExplicitlySafe =
    riderData?.status === 'SAFE' ||
    riderData?.status === 'ARMED' ||
    riderData?.event === 'CRASH_CANCELLED' ||
    riderData?.safetyStatus === 'SAFE' ||
    riderData?.eventStatus === 'CRASH_RESOLVED_SAFE';

  const safetyStatus = isExplicitlySafe
    ? 'SAFE'
    : ((riderData?.status === 'CRASH' || latestImpact) ? 'CRASH' : 'SAFE');

  // 2. Robust Online / Offline Status Calculation
  let lastSeenMs = null;
  if (riderData?.lastSeen?.toMillis) {
    lastSeenMs = riderData.lastSeen.toMillis();
  } else if (riderData?.updatedAt) {
    const parsed = new Date(riderData.updatedAt).getTime();
    if (!isNaN(parsed)) lastSeenMs = parsed;
  }

  // Fallback: If onSnapshot just received a live update from Firestore, rider is actively streaming!
  if (!lastSeenMs && riderData && lastUpdated) {
    lastSeenMs = lastUpdated.getTime();
  }

  const secondsSinceLastSeen = lastSeenMs
    ? Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000))
    : (riderData ? 0 : 9999);

  // Rider app is open if heartbeat was seen in last 45 seconds OR if riderData is actively streaming
  const isAppOpen = secondsSinceLastSeen < 45 || Boolean(riderData?.isOnline);
  const bleConnected = Boolean(riderData?.bleConnected || riderData?.isBleConnected);

  // Strict Active Condition: BOTH App Open AND Hardware BLE Connected
  const isOnlineStrict = isAppOpen && bleConnected;

  const battery   = riderData?.battery ?? null;
  const lat       = riderData?.latitude ?? riderData?.lat ?? null;
  const lon       = riderData?.longitude ?? riderData?.lng ?? riderData?.lon ?? null;
  const speed     = riderData?.speed_kmh ?? riderData?.speed ?? 0;
  const riderName = riderData?.riderName || localStorage.getItem('pairedRiderName') || 'Rider';

  // Bind Watcher to Rider and start live stream
  useEffect(() => {
    if (!accessCode) { setLoading(false); return; }

    let unsubscribeStream = null;

    bindWatcherToRider(accessCode, (telemetry) => {
      setRiderData(prev => ({ ...prev, ...telemetry }));
      setLastUpdated(new Date());
      setLoading(false);
    }).then(res => {
      if (res?.unsubscribe) unsubscribeStream = res.unsubscribe;
    }).catch(err => {
      console.warn("[WatcherDashboard] Pairing check:", err.message);
      setLoading(false);
    });

    return () => {
      if (unsubscribeStream) unsubscribeStream();
    };
  }, [accessCode]);

  // Listen to latest impact event
  useEffect(() => {
    if (!db || !accessCode) return;
    const q = query(
      collection(db, 'rider_locations', accessCode, 'impacts'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const tsMs = data.timestamp?.toMillis?.() || (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
        const age = Date.now() - tsMs;
        setLatestImpact(age < 15 * 60 * 1000 ? data : null);
      } else {
        setLatestImpact(null);
      }
    });
    return () => unsub();
  }, [accessCode]);

  // NOTE: Watcher heartbeat removed — Watcher is READ-ONLY during live session.
  // paired_relatives registration happens once inside bindWatcherToRider.



  const handleSwitchRole = () => {
    localStorage.removeItem(LS_ROLE);
    localStorage.removeItem(LS_WATCHER_CODE);
    localStorage.removeItem('pairedRiderSessionId');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <HelmetLogo className="w-7 h-7" />
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">CRASH GUARD</span>
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-full border border-sky-200 uppercase tracking-wider">
                <WatcherGlassesIcon size={11} strokeWidth={2.5} />
                Watcher Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <span className="hidden sm:block text-xs text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Code: <strong className="text-slate-800">{accessCode}</strong>
            </span>
            <button
              onClick={handleSwitchRole}
              className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Switch Role
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Rider Disconnected / App Closed Warning Banner */}
        {!isAppOpen && (
          <div className="bg-slate-700 text-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <WifiOff size={20} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">Rider Disconnected / App Closed</p>
              <p className="text-xs text-slate-300">The rider has closed the app or lost network connection.</p>
            </div>
          </div>
        )}

        {/* Helmet BLE Hardware Disconnected Warning Banner */}
        {isAppOpen && !bleConnected && (
          <div className="bg-amber-500 text-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0" />
            <div>
              <p className="font-bold text-sm">Helmet BLE Hardware Disconnected</p>
              <p className="text-xs text-amber-100">Rider app is open, but helmet BLE Bluetooth is not connected yet.</p>
            </div>
          </div>
        )}

        {/* Safety Status Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 id="paired-rider-title" className="text-lg font-bold text-slate-900 mb-1">
                {isOnlineStrict ? `Live Monitoring: ${riderName}` : `Rider Telemetry (${riderName})`}
              </h2>
              <p className="text-sm text-slate-500">
                Linked to code <strong className="text-slate-800 font-mono">{accessCode}</strong>
              </p>
            </div>
            <SafetyBadge
              status={safetyStatus}
              isOnlineStrict={isOnlineStrict}
              isAppOpen={isAppOpen}
              bleConnected={bleConnected}
              secondsSinceLastSeen={secondsSinceLastSeen}
            />
          </div>
        </div>

        {/* Active Emergency Alert Banner — ONLY rendered when safetyStatus === 'CRASH' */}
        {safetyStatus === 'CRASH' && latestImpact && (
          <div className="bg-red-600 text-white rounded-2xl p-5 shadow-xl shadow-red-600/30 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Siren size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">🚨 CRASH DETECTED</h3>
                <p className="text-red-100 text-xs">Emergency protocol activated — contact rider immediately</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="tel:112"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-red-600 font-black rounded-xl text-sm hover:bg-red-50 transition-colors"
              >
                <Phone size={16} /> Call 112
              </a>
              <a
                href={lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white font-bold rounded-xl text-sm hover:bg-white/30 transition-colors border border-white/30"
              >
                <MapPin size={16} /> Open Map
              </a>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="BLE Hardware"
            value={bleConnected ? 'Connected' : 'Disconnected'}
            icon={bleConnected ? Wifi : WifiOff}
            color={bleConnected ? 'green' : 'slate'}
            sub="Crash Guard Helmet"
          />
          <MetricCard
            label="Battery"
            value={battery !== null ? `${battery}%` : '—'}
            icon={Battery}
            color={battery !== null && battery < 20 ? 'red' : 'green'}
            sub="Helmet power"
          />
          <MetricCard
            label="Speed"
            value={speed ?? 0}
            unit="km/h"
            icon={Activity}
            color="blue"
            sub="Real-time"
            valueId="watcher-speed-val"
          />
          <MetricCard
            label="GPS Fix"
            value={lat ? 'Active' : 'None'}
            icon={MapPin}
            color={lat ? 'green' : 'slate'}
            sub={lat ? `${lat.toFixed(2)}, ${lon.toFixed(2)}` : 'No coordinates'}
          />
        </div>

        {/* Map + Activity Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map — takes 2 cols */}
          <div className="lg:col-span-2 min-h-[420px]">
            <LiveMapCard lat={lat} lon={lon} speed={speed} riderName={riderName} />
          </div>

          {/* Activity & Connection History Timeline — takes 1 col */}
          <div className="lg:col-span-1 min-h-[420px]">
            <ActivityTimeline accessCode={accessCode} />
          </div>
        </div>

        {/* Impact Info Details if active */}
        {safetyStatus === 'CRASH' && latestImpact && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500" />
              Impact Event Payload Details
            </h3>
            <ImpactCard impact={latestImpact} />
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
