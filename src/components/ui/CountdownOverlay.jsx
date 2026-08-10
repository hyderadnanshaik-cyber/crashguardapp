/**
 * @file CountdownOverlay.jsx
 * @description Full-screen flashing emergency countdown overlay with Web Audio alarm & dark red hazard animation.
 */
import React, { useEffect } from 'react';
import { AlertOctagon, CheckCircle, MapPin, Phone } from 'lucide-react';
import { GlowButton } from './GlowButton';
import { EMERGENCY_STATE } from '../../hooks/useEmergency';

// ── Web Audio Alarm Synthesizer ───────────────────────────────────────────
let audioCtx = null;

function playWarningBeep() {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
    osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.15); // Sweep to 1400Hz

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (err) {
    console.warn('[Audio] Warning beep error:', err);
  }
}

/** SVG ring countdown timer */
function CountdownRing({ current, total, color }) {
  const radius        = 54;
  const circumference = 2 * Math.PI * radius;
  const progress      = Math.max(0, current / total);
  const dashOffset    = circumference * (1 - progress);

  const strokeColor = {
    amber:   '#F59E0B',
    orange:  '#F97316',
    crimson: '#EE0000',
  }[color] ?? '#EE0000';

  return (
    <svg width="150" height="150" viewBox="0 0 120 120" className="-rotate-90">
      {/* Background ring */}
      <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      {/* Progress ring */}
      <circle
        cx="60" cy="60" r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: `drop-shadow(0 0 8px ${strokeColor})` }}
      />
    </svg>
  );
}

/**
 * @param {{
 *   emergencyState: string,
 *   severity: object | null,
 *   countdown: number,
 *   hospitals: Array,
 *   onMarkSafe: function,
 *   emergencyContacts: Array,
 * }} props
 */
export function CountdownOverlay({ emergencyState, severity, countdown, hospitals, onMarkSafe, emergencyContacts = [] }) {
  if (emergencyState === EMERGENCY_STATE.IDLE) return null;

  const isSafe       = emergencyState === EMERGENCY_STATE.SAFE;
  const isDispatched = emergencyState === EMERGENCY_STATE.DISPATCHED;
  const isAlert      = emergencyState === EMERGENCY_STATE.ALERT;

  // Synthesize alarm sound on every countdown tick when in ALERT mode
  useEffect(() => {
    if (isAlert && countdown > 0) {
      playWarningBeep();
    }
  }, [isAlert, countdown]);

  const bgColor = {
    amber:   'from-amber-950/98',
    orange:  'from-orange-950/98',
    crimson: 'from-red-950/98',
  }[severity?.color] ?? 'from-red-950/98';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b ${bgColor} to-slate-950/98 backdrop-blur-md transition-all duration-300`}
      style={{
        boxShadow: isAlert ? 'inset 0 0 120px rgba(220, 38, 38, 0.85), 0 0 150px rgba(185, 28, 28, 0.9)' : 'none',
      }}
    >
      {/* Intense Dark Red Hazard Pulsing Border */}
      {isAlert && (
        <div
          className="absolute inset-0 pointer-events-none border-8 border-red-600/80 animate-pulse"
          style={{
            boxShadow: 'inset 0 0 80px rgba(239, 68, 68, 0.9), 0 0 100px rgba(220, 38, 38, 1)',
          }}
        />
      )}

      <div className="bg-slate-900/95 border border-red-500/50 shadow-[0_0_50px_rgba(220,38,38,0.4)] p-8 md:p-10 rounded-3xl flex flex-col items-center gap-6 text-center max-w-lg w-full z-10 backdrop-blur-xl">
        {/* Icon */}
        <div className="relative">
          <AlertOctagon
            size={68}
            className={`${ isSafe ? 'text-green-400' : isDispatched ? 'text-blue-400' : 'text-red-500 animate-pulse' }`}
            style={{ filter: 'drop-shadow(0 0 25px currentColor)' }}
          />
        </div>

        {/* State heading */}
        {isAlert && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-mono tracking-[0.3em] text-red-400 font-bold uppercase">CRASH DETECTED — EMERGENCY</p>
              <h1 className="text-3xl md:text-4xl font-black font-display text-white tracking-tight leading-tight">
                {severity?.label || 'SEVERE'} IMPACT
              </h1>
              <p className="text-slate-300 text-sm font-medium pt-1">
                Peak G-force threshold reached. Dispatching emergency SOS in...
              </p>
            </div>

            {/* Countdown ring */}
            <div className="relative flex items-center justify-center my-3">
              <CountdownRing current={countdown} total={severity?.countdown ?? 45} color={severity?.color} />
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-black font-mono text-white leading-none">{countdown}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">seconds</span>
              </div>
            </div>

            {/* I AM SAFE button */}
            <GlowButton
              id="im-safe-btn"
              variant="secondary"
              size="lg"
              onClick={onMarkSafe}
              icon={<CheckCircle size={20} />}
              className="w-full max-w-sm border-2 border-green-500 text-green-300 bg-green-950/80 hover:bg-green-900 shadow-lg shadow-green-950/60 font-bold py-3.5"
            >
              I AM SAFE — Cancel Alert
            </GlowButton>
          </>
        )}

        {isSafe && (
          <div className="space-y-3">
            <CheckCircle size={56} className="text-green-400 mx-auto" style={{ filter: 'drop-shadow(0 0 25px #4ade80)' }} />
            <h2 className="text-3xl font-extrabold text-white">Alert Cancelled</h2>
            <p className="text-slate-300 text-sm">Logged as false alarm. Stay safe out there!</p>
          </div>
        )}

        {isDispatched && (
          <div className="space-y-4 w-full max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/50 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider">
              <AlertOctagon size={14} className="animate-pulse" />
              <span>SOS Dispatch Triggered</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white">SOS Dispatched</h2>
            <p className="text-slate-300 text-sm">Emergency contacts and nearby medical facilities have been notified with your live coordinates.</p>

            {/* Emergency contacts notified */}
            {emergencyContacts.length > 0 && (
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2 text-left shadow-lg">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Emergency Contacts Notified</p>
                {emergencyContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
                    <Phone size={14} className="text-red-400 shrink-0" />
                    <span className="text-white font-bold">{c.name}</span>
                    <span className="text-slate-400 ml-auto font-mono">{c.phone}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nearby hospitals */}
            {hospitals.length > 0 && (
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-2 text-left shadow-lg">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Nearest Hospitals Contacted</p>
                {hospitals.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
                    <MapPin size={14} className="text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white font-bold">{h.name}</p>
                      <p className="text-slate-400 text-[11px]">{h.vicinity} {h.distance ? `· ${h.distance} km` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              id="dismiss-confirm-btn"
              onClick={onMarkSafe}
              className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider border border-slate-700 transition-colors"
            >
              Dismiss Confirmation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CountdownOverlay;
