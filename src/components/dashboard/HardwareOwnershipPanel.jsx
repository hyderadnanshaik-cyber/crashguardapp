/**
 * @file HardwareOwnershipPanel.jsx
 * @description Hardware Registration & Ownership panel for the Rider portal.
 *
 * LOCKED STATE  — Shows a premium registration card with code entry.
 *                 All other portal tabs remain blocked until claim succeeds.
 * CLAIMED STATE — Shows verified hardware details, license info, and release option.
 */
import React, { useState } from 'react';
import {
  Shield, Lock, Cpu, CheckCircle2, AlertTriangle,
  Loader2, Key, ArrowRightLeft, Unlink, RefreshCw,
  Zap, HardDrive, Calendar, Copy, ChevronRight
} from 'lucide-react';
import { useHardwareClaim } from '../../hooks/useHardwareClaim';

/* ── Small helpers ──────────────────────────────────────────────────────────── */
function InfoRow({ label, value, mono = false, accent = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

/* ── Locked / Registration State ────────────────────────────────────────────── */
function RegistrationCard({ user, onSuccess }) {
  const { claimHardware } = useHardwareClaim(user?.uid);
  const [code,    setCode]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClaim = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Please enter the complete 6-character Rider Access Code.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await claimHardware(trimmed);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 1800);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-200">
          <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-slate-900 tracking-tight">Hardware Verified!</p>
          <p className="text-sm text-slate-500 mt-1">Unlocking all portal features…</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Lock banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <div className="bg-red-100 border border-red-300 p-2 rounded-lg shrink-0 mt-0.5">
          <Lock size={16} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm font-black text-red-800">Hardware Registration Required</p>
          <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
            All portal features are locked until you register your hardware unit.
            Enter the <strong>6-character Rider Access Code</strong> from your official
            Crash Guard hardware card to unlock full access.
          </p>
        </div>
      </div>

      {/* Code input */}
      <div>
        <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2.5">
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
          onKeyDown={e => e.key === 'Enter' && code.length === 6 && handleClaim()}
          placeholder="e.g. RD82K9"
          className="w-full px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:outline-none text-center text-3xl font-black tracking-[0.5em] text-slate-900 uppercase transition-colors bg-slate-50 placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-base"
        />
        {error && (
          <p className="mt-2.5 text-xs text-red-600 font-semibold flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            {error}
          </p>
        )}
      </div>

      {/* Character dots indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < code.length ? 'bg-red-500 scale-110' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Claim button */}
      <button
        onClick={handleClaim}
        disabled={loading || code.length !== 6}
        className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all duration-200 shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:scale-[1.01] active:scale-[0.99]"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <Shield size={18} />
            Claim Hardware Unit
            <ChevronRight size={18} />
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        Your Rider Access Code is printed on the Crash Guard hardware card included with your device.
      </p>
    </div>
  );
}

/* ── Claimed / Verified State ───────────────────────────────────────────────── */
function ClaimedCard({ hardwareId, riderCode, licenseLabel, claimedAt, onRelease }) {
  const [copied,    setCopied]    = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const maskedCode = riderCode
    ? riderCode.slice(0, 2) + '••••'
    : '••••••';

  const copyCode = () => {
    if (!riderCode) return;
    navigator.clipboard.writeText(riderCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRelease = async () => {
    setReleasing(true);
    await onRelease?.();
    setReleasing(false);
    setShowConfirm(false);
  };

  const formattedDate = claimedAt
    ? new Date(claimedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today';

  return (
    <div className="space-y-5">
      {/* Verified badge banner */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shadow-md">
            <CheckCircle2 size={28} className="text-emerald-600" strokeWidth={2.5} />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        </div>
        <div>
          <p className="font-black text-emerald-800 text-base">Hardware Verified & Active</p>
          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
            All portal features unlocked · Crash detection armed
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
          <Zap size={11} className="fill-white" />
          ACTIVE
        </div>
      </div>

      {/* Hardware details */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg">
            <HardDrive size={16} className="text-slate-700" />
          </div>
          <span className="text-sm font-black text-slate-800 tracking-tight">Hardware Unit Details</span>
        </div>
        <InfoRow label="Hardware ID"    value={hardwareId}   mono />
        <InfoRow label="License"        value={licenseLabel} />
        <InfoRow label="Access Code"    value={maskedCode}   mono />
        <InfoRow label="Claimed On"     value={formattedDate} />
        <InfoRow label="Status"         value="VERIFIED & ACTIVE" accent />
      </div>

      {/* Rider Access Code copy */}
      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-amber-500" />
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Rider Access Code</span>
          <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-wider">Share with Watcher</span>
        </div>
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
          <span className="text-2xl font-black font-mono tracking-[0.4em] text-slate-900">{riderCode}</span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Share this code with family members so they can join as a Watcher.
        </p>
      </div>

      {/* Release / Transfer section */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200"
        >
          <ArrowRightLeft size={14} />
          Transfer / Release Hardware
        </button>
      ) : (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-black text-red-800">Confirm Hardware Release</p>
          <p className="text-xs text-red-600 leading-relaxed">
            Releasing will unlink this hardware unit from your account and re-lock all portal features.
            You will need to enter a valid code again to regain access.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {releasing
                ? <RefreshCw size={14} className="animate-spin" />
                : <><Unlink size={14} /> Release</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────────────── */
export default function HardwareOwnershipPanel({ user, onClaimed }) {
  const {
    isClaimed, isLoading,
    hardwareId, riderCode, licenseLabel, claimedAt,
    releaseClaim,
  } = useHardwareClaim(user?.uid);

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      {/* Panel Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl border-2 ${isClaimed ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
          {isClaimed
            ? <CheckCircle2 size={22} className="text-emerald-600" />
            : <Shield size={22} className="text-red-600" />
          }
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Hardware & Ownership</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isClaimed
              ? 'Your hardware unit is registered and active'
              : 'Register your hardware unit to unlock all features'}
          </p>
        </div>
        {!isLoading && (
          <div className={`ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            isClaimed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-red-50 border-red-300 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isClaimed ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
            {isClaimed ? 'Verified' : 'Unregistered'}
          </div>
        )}
      </div>

      {/* Main content card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-red-200 flex items-center justify-center">
                <Cpu size={24} className="text-red-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-t-2 border-red-500 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Verifying hardware status…</p>
          </div>
        ) : isClaimed ? (
          <ClaimedCard
            hardwareId={hardwareId}
            riderCode={riderCode}
            licenseLabel={licenseLabel}
            claimedAt={claimedAt}
            onRelease={releaseClaim}
          />
        ) : (
          <RegistrationCard user={user} onSuccess={onClaimed} />
        )}
      </div>
    </div>
  );
}
