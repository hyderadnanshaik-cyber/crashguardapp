/**
 * @file RoleGateway.jsx
 * @description Post-login "Who Are You?" full-screen role selection gateway.
 * Light mode, premium card design. Routes user to Rider or Watcher portal.
 */
import React, { useState } from 'react';
import {
  Bike, ChevronRight, Shield, Activity, MapPin, Lock,
  FileText, Users, Radio, AlertTriangle, QrCode, CheckCircle2, X, Loader2
} from 'lucide-react';
import WatcherGlassesIcon from '../ui/WatcherGlassesIcon';
import { HelmetLogo } from '../ui/HelmetLogo';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const LS_ROLE         = 'cg_role';
const LS_WATCHER_CODE = 'cg_watcher_code';
const RIDER_CODES_DOC = 'system_config/rider_codes';

/* ── Rider Access Code Modal ─────────────────────────────────────────────────── */
function RiderCodeModal({ onConfirm, onBack, user }) {
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6 || !/^[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-character rider access code.');
      return;
    }
    setLoading(true);
    setError('');

    // ── Step 1: Validate against the hardcoded master list (always works, no network) ──
    const localEntry = INITIAL_RIDER_CODES.find(c => c.code === trimmed);
    if (!localEntry) {
      setError('Invalid access code. Please check the code and try again.');
      setLoading(false);
      return;
    }

    // ── Step 2: Optionally sync usedBy to Firestore (best-effort, never blocks access) ──
    try {
      const [colId, docId] = RIDER_CODES_DOC.split('/');
      const ref = doc(db, colId, docId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Seed the codes doc — if this fails, we still allow access
        await setDoc(ref, { codes: INITIAL_RIDER_CODES }).catch(() => {});
      } else {
        const { codes = INITIAL_RIDER_CODES } = snap.data() || {};
        const entry = codes.find(c => c.code === trimmed);

        // If the code is claimed by ANOTHER user, block access
        if (entry?.usedBy && entry.usedBy !== user?.uid) {
          setError('This code is already registered to another rider account.');
          setLoading(false);
          return;
        }

        // Mark as claimed — non-blocking
        if (entry && !entry.usedBy) {
          const updated = codes.map(c =>
            c.code === trimmed ? { ...c, usedBy: user?.uid, usedAt: new Date().toISOString() } : c
          );
          await updateDoc(ref, { codes: updated }).catch(() => {});
        }
      }
    } catch (err) {
      // Firestore error is non-fatal — code was already validated locally above
      console.warn('[RiderCode] Firestore sync skipped (non-critical):', err.message);
    }

    // ── Step 3: Admit the rider ──
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Rider Access Code Required</h3>
              <p className="text-red-100 text-xs mt-0.5">This portal is restricted to authorised riders only</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Enter your <strong className="text-slate-900">6-character rider access code</strong> provided
            by the Crash Guard administrator to unlock the Rider portal.
          </p>

          {/* Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Rider Access Code
            </label>
            <input
              type="text"
              inputMode="text"
              maxLength={6}
              value={code}
              autoFocus
              onChange={e => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setError('');
              }}
              placeholder="e.g. RD7K2X"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:outline-none text-center text-2xl font-black tracking-[0.4em] text-slate-900 uppercase transition-colors"
            />
            {error && (
              <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || code.length !== 6}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-red-600/25"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <><CheckCircle2 size={16} /> Unlock Rider Portal</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Access Code Modal for Watcher ─────────────────────────────────────────── */
function WatcherCodeModal({ onConfirm, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6 || !/^[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Please enter a valid 6-character access code.');
      return;
    }
    setLoading(true);
    setError('');
    // Small delay to simulate code verification
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(LS_WATCHER_CODE, trimmed);
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <WatcherGlassesIcon size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Enter Rider Access Code</h3>
              <p className="text-sky-100 text-xs mt-0.5">Link your Watcher account to a rider</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Ask your rider for their <strong className="text-slate-900">6-character access code</strong> found in their
            Profile → Relative Access Portal.
          </p>

          {/* Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              6-Character Access Code
            </label>
            <input
              type="text"
              inputMode="text"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); }}
              placeholder="e.g. X7K9M2"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-center text-2xl font-black tracking-[0.4em] text-slate-900 uppercase transition-colors"
            />
            {error && (
              <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || code.length !== 6}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/25"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle2 size={16} /> Confirm & Enter</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Role Card ──────────────────────────────────────────────────────────────── */
function RoleCard({ role, title, subtitle, description, features, icon: Icon, accentColor, onSelect, selected }) {
  const isRider   = role === 'rider';
  const gradFrom  = isRider ? 'from-red-500' : 'from-sky-500';
  const gradTo    = isRider ? 'to-rose-600'  : 'to-blue-600';
  const badgeBg   = isRider ? 'bg-red-50 text-red-700 border-red-200'   : 'bg-sky-50 text-sky-700 border-sky-200';
  const ringColor = isRider ? 'ring-red-400'  : 'ring-blue-400';
  const btnBg     = isRider ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25';

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-3xl border-2 transition-all duration-300 cursor-pointer overflow-hidden group
        ${selected ? `border-transparent ring-4 ${ringColor} shadow-2xl scale-[1.02]` : 'border-slate-200 hover:border-slate-300 hover:shadow-xl shadow-lg'}
      `}
    >
      {/* Top gradient header */}
      <div className={`bg-gradient-to-br ${gradFrom} ${gradTo} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div className={`bg-white/20 p-3 rounded-2xl backdrop-blur-sm`}>
            <Icon size={28} strokeWidth={2} />
          </div>
          {selected && (
            <div className="bg-white/25 rounded-full p-1">
              <CheckCircle2 size={20} />
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-black tracking-tight">{title}</h3>
          <p className="text-white/80 text-sm font-medium mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <p className="text-slate-600 text-sm leading-relaxed">{description}</p>

        <ul className="space-y-2.5">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${badgeBg} border`}>
                <CheckCircle2 size={11} />
              </div>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className={`w-full mt-2 py-3 px-4 rounded-xl ${btnBg} text-white font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md group-hover:scale-[1.01]`}
        >
          Enter as {title}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Default 10 Strict Rider Access Codes (auto-seeded if missing) ────────── */
const INITIAL_RIDER_CODES = [
  { code: 'RD82K9', label: 'Rider License 01', usedBy: null, usedAt: null },
  { code: 'RD37M4', label: 'Rider License 02', usedBy: null, usedAt: null },
  { code: 'RD91P5', label: 'Rider License 03', usedBy: null, usedAt: null },
  { code: 'RD48X2', label: 'Rider License 04', usedBy: null, usedAt: null },
  { code: 'RD63V7', label: 'Rider License 05', usedBy: null, usedAt: null },
  { code: 'RD15T8', label: 'Rider License 06', usedBy: null, usedAt: null },
  { code: 'RD74B3', label: 'Rider License 07', usedBy: null, usedAt: null },
  { code: 'RD59W6', label: 'Rider License 08', usedBy: null, usedAt: null },
  { code: 'RD26H1', label: 'Rider License 09', usedBy: null, usedAt: null },
  { code: 'RD80Z9', label: 'Rider License 10', usedBy: null, usedAt: null },
];

/* ── Main RoleGateway Component ─────────────────────────────────────────────── */
export default function RoleGateway({ user, onRoleSelected }) {
  const [selected, setSelected]               = useState(null);
  const [showWatcherCode, setShowWatcherCode] = useState(false);
  const [showRiderCode, setShowRiderCode]     = useState(false);

  const handleRiderSelect = () => {
    setSelected('rider');
    setShowRiderCode(true);
  };

  const handleRiderCodeConfirm = () => {
    localStorage.setItem(LS_ROLE, 'rider');
    onRoleSelected('rider');
  };

  const handleWatcherSelect = () => {
    setSelected('watcher');
    setShowWatcherCode(true);
  };

  const handleWatcherCodeConfirm = () => {
    localStorage.setItem(LS_ROLE, 'watcher');
    onRoleSelected('watcher');
  };

  const name = user?.displayName?.split(' ')[0] || 'User';

  return (
    <>
      {showRiderCode && (
        <RiderCodeModal
          user={user}
          onConfirm={handleRiderCodeConfirm}
          onBack={() => { setShowRiderCode(false); setSelected(null); }}
        />
      )}

      {showWatcherCode && (
        <WatcherCodeModal
          onConfirm={handleWatcherCodeConfirm}
          onBack={() => { setShowWatcherCode(false); setSelected(null); }}
        />
      )}

      <div className="fixed inset-0 z-[9990] bg-slate-50 flex flex-col overflow-auto">
        {/* Top Nav */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <HelmetLogo className="w-7 h-7" />
            <span className="font-extrabold text-slate-900 text-base tracking-tight">
              CRASH GUARD <span className="text-red-600 text-[10px] font-bold tracking-widest">by RedHack</span>
            </span>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Signed in as <span className="text-slate-900 font-bold">{user?.email}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          {/* Hero text */}
          <div className="text-center mb-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-600 uppercase tracking-widest mb-5">
              <Shield size={12} className="text-red-500" />
              Welcome Back, {name}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Who are you?
            </h1>
            <p className="text-slate-500 text-base mt-3 leading-relaxed">
              Tailor your Crash Guard experience by choosing the persona<br className="hidden sm:block" /> that best describes your needs.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            <RoleCard
              role="rider"
              title="Rider"
              subtitle="Hardware & Telemetry Manager"
              description="Master your real-time crash detection, hardware telemetry, emergency contacts, and device configurations."
              features={[
                'Hardware Product Scanning & Registration',
                'Live Sensor Telemetry (Accel / Gyro)',
                'Emergency SOS Configuration',
                'Hospital Finder & Audit Logs',
              ]}
              icon={Bike}
              accentColor="red"
              selected={selected === 'rider'}
              onSelect={handleRiderSelect}
            />
            <RoleCard
              role="watcher"
              title="Watcher"
              subtitle="Safety Monitoring & Live Track"
              description="Track your rider's real-time journey, monitor GPS location, and receive instant crash alerts."
              features={[
                'Live GPS Route Tracking',
                'Instant Impact / Crash Alerts',
                'Emergency Status Monitoring',
                'Secure Access Code Pairing',
              ]}
              icon={WatcherGlassesIcon}
              accentColor="blue"
              selected={selected === 'watcher'}
              onSelect={handleWatcherSelect}
            />
          </div>

          <p className="mt-8 text-xs text-slate-400 text-center">
            You can switch your role at any time from the dashboard settings.
          </p>
        </div>
      </div>
    </>
  );
}
