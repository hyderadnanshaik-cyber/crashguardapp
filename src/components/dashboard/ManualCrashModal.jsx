/**
 * @file ManualCrashModal.jsx
 * @description Manual Crash Alert trigger & severity selector modal.
 * Allows the rider to manually trigger a crash alert if hardware fails during an impact.
 */
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Siren, ShieldAlert, X, Clock, CheckCircle2 } from 'lucide-react';

const SEVERITY_OPTIONS = [
  {
    id: 'MINOR',
    level: 'Minor Impact',
    countdown: 45,
    description: 'Low-speed drop or tilt. Generates 45-second safety countdown.',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    ring: 'border-amber-500',
    bg: 'bg-amber-50',
  },
  {
    id: 'MODERATE',
    level: 'Moderate Impact',
    countdown: 30,
    description: 'Medium-force impact. Generates 30-second safety countdown.',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    ring: 'border-orange-500',
    bg: 'bg-orange-50',
  },
  {
    id: 'SEVERE',
    level: 'Severe Impact 🚨',
    countdown: 15,
    description: 'High-G crash. Immediate 15-second emergency dispatch timer.',
    badge: 'bg-red-100 text-red-800 border-red-300',
    ring: 'border-red-600',
    bg: 'bg-red-50',
  },
];

export default function ManualCrashModal({ isOpen, onClose, onConfirmTrigger }) {
  const [selected, setSelected] = useState('SEVERE');

  // Lock body scroll & close on Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = SEVERITY_OPTIONS.find(o => o.id === selected) || SEVERITY_OPTIONS[2];

  const handleConfirm = () => {
    onConfirmTrigger({ level: current.level.replace(' 🚨', ''), countdown: current.countdown, id: current.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      {/* Backdrop click closes */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal card — light theme */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-extrabold text-slate-900">Manual Crash Alert Trigger</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900 mb-1">Manual Emergency Fallback</p>
              <p className="text-xs text-red-700 leading-relaxed">
                Use this if your helmet sensor is damaged or unable to transmit BLE data. 
                This will lock the app in Emergency mode, command the hardware buzzer, 
                and instantly alert your relatives.
              </p>
            </div>
          </div>

          {/* Severity Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Select Crash Severity Level
            </label>
            <div className="space-y-2.5">
              {SEVERITY_OPTIONS.map((opt) => {
                const isSelected = selected === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    className={`flex items-start justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? `${opt.ring} ${opt.bg}`
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg mt-0.5 ${isSelected ? 'bg-white/80' : 'bg-slate-100'}`}>
                        <Siren className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-slate-900">{opt.level}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${opt.badge}`}>
                            {opt.countdown}s Timer
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-snug">{opt.description}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0 ml-2 mt-0.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <Clock size={14} className="text-slate-500" />
              <span>Safety Countdown:</span>
            </div>
            <span className="font-mono font-extrabold text-slate-900 text-sm">
              {current.countdown} seconds
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ShieldAlert size={15} />
              <span>Trigger Crash Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
