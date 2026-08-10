/**
 * @file CinematicSplash.jsx
 * @description Master 10-Second Splash Screen with Slot-Machine ("Poker Reel") Quote Animation.
 *
 * 10-Second Timeline:
 *   [0s – 1.5s]   (0ms – 1500ms)  : Solid white overlay splits horizontally (translateX -100% / 100%).
 *   [1.5s – 3.0s] (1500ms – 3000ms): RedHack logo glows into place + title "Crash Guard BY REDHACK".
 *   [3.0s – 6.0s] (3000ms – 6000ms): Slot-machine ("Poker Reel") vertical spin quote reveal ("YOUR SILENT GUARDIAN ON EVERY JOURNEY.").
 *   [6.0s – 9.0s] (6000ms – 9000ms): Clean hold on completed centered logo, title, & quote.
 *   [9.0s – 10.0s](9000ms – 10000ms): Smooth 1s fade-out exit transition into main dashboard.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { HelmetLogo } from './HelmetLogo';

const TARGET_QUOTE = "YOUR SILENT GUARDIAN ON EVERY JOURNEY.";
const RANDOM_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

export default function CinematicSplash({ onComplete }) {
  const [splitStarted, setSplitStarted] = useState(false);
  const [logoVisible, setLogoVisible]   = useState(false);
  const [reelStarted, setReelStarted]   = useState(false);
  const [displayChars, setDisplayChars] = useState(() => Array(TARGET_QUOTE.length).fill(''));
  const [isFadingOut, setIsFadingOut]   = useState(false);

  const done = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete?.();
    }, 1000); // 1.0s fade-out transition duration
  }, [onComplete]);

  useEffect(() => {
    // 1. [0s – 1.5s] Trigger horizontal white split at 100ms
    const t1 = setTimeout(() => setSplitStarted(true), 100);

    // 2. [1.5s – 3.0s] Reveal Logo & Title at 1500ms
    const t2 = setTimeout(() => setLogoVisible(true), 1500);

    // 3. [3.0s – 6.0s] Start Slot-Machine Poker Reel Spinning Quote at 3000ms
    const t3 = setTimeout(() => setReelStarted(true), 3000);

    // 5. [9.0s – 10.0s] Initiate Smooth Fade Out at 9000ms (9.0s)
    const t4 = setTimeout(() => done(), 9000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [done]);

  // Slot-Machine / Poker Reel vertical spin animation (3.0s – 6.0s = 3.0s duration)
  useEffect(() => {
    if (!reelStarted) return;

    const startTime = Date.now();
    const totalSpinTime = 2800; // 2.8s active reel spin

    const spinInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(1, elapsed / totalSpinTime);

      const nextChars = TARGET_QUOTE.split('').map((targetChar, idx) => {
        if (targetChar === ' ') return '\u00A0';

        // Calculate lock time threshold for character `idx` (left-to-right sequential lock)
        const charLockThreshold = (idx / TARGET_QUOTE.length) * 0.88;

        if (progressRatio >= charLockThreshold) {
          return targetChar;
        } else {
          // Rapidly cycle random symbol for unlocked character
          return RANDOM_SYMBOLS[Math.floor(Math.random() * RANDOM_SYMBOLS.length)];
        }
      });

      setDisplayChars(nextChars);

      if (progressRatio >= 1) {
        clearInterval(spinInterval);
        setDisplayChars(TARGET_QUOTE.split('').map(c => c === ' ' ? '\u00A0' : c));
      }
    }, 40); // 40ms reel tick

    return () => clearInterval(spinInterval);
  }, [reelStarted]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99999] overflow-hidden select-none bg-[#0B132B] text-white flex items-center justify-center"
      style={{
        transition: 'opacity 1.0s ease-out, transform 1.0s ease-out',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: isFadingOut ? 'none' : 'all',
      }}
    >
      {/* ── STAGE 1: Solid White Overlay with Horizontal Split (translateX) ── */}
      {/* Left White Curtain (slides left) */}
      <div
        className="fixed top-0 left-0 w-1/2 h-full bg-white z-50 pointer-events-none"
        style={{
          transform: splitStarted ? 'translateX(-100%)' : 'translateX(0%)',
          transition: 'transform 1.35s cubic-bezier(0.77, 0, 0.175, 1)',
        }}
      />
      {/* Right White Curtain (slides right) */}
      <div
        className="fixed top-0 right-0 w-1/2 h-full bg-white z-50 pointer-events-none"
        style={{
          transform: splitStarted ? 'translateX(100%)' : 'translateX(0%)',
          transition: 'transform 1.35s cubic-bezier(0.77, 0, 0.175, 1)',
        }}
      />

      {/* ── Ambient Red Glow Backdrop ── */}
      <div
        className="absolute w-[440px] h-[440px] rounded-full pointer-events-none -z-0"
        style={{
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.28) 0%, transparent 70%)',
          opacity: logoVisible ? 1 : 0,
          transition: 'opacity 1.0s ease-in',
        }}
      />

      {/* ── STAGE 2, 3 & 4: Centered Stage (Full Width Unclipped Max-W-2XL Container) ── */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center max-w-2xl mx-auto w-full">
        {/* Logo Reveal */}
        <div
          className="relative mb-6"
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'scale(1)' : 'scale(0.68)',
            transition: 'opacity 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-900/90 border-2 border-red-500/60 flex items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.5)] relative">
            <HelmetLogo className="w-14 h-14 sm:w-16 sm:h-16" />
            <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping pointer-events-none" />
          </div>
        </div>

        {/* Title & Quote */}
        <div
          className="space-y-4 w-full"
          style={{
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.9s ease-out 0.2s, transform 0.9s ease-out 0.2s',
          }}
        >
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white font-sans">
            Crash Guard <span className="text-red-500 font-extrabold tracking-wider uppercase">BY REDHACK</span>
          </h1>

          {/* Slot-Machine / Poker Reel Spinning Quote Container (Unclipped max-w-2xl) */}
          <div className="min-h-[56px] flex items-center justify-center pt-2 w-full max-w-2xl mx-auto px-2 overflow-hidden">
            {reelStarted && (
              <div className="flex flex-wrap items-center justify-center text-sm sm:text-base md:text-lg font-bold text-slate-100 font-mono tracking-wider italic leading-relaxed">
                <span className="text-red-500 mr-1 font-sans">"</span>
                {displayChars.map((char, i) => {
                  const isLocked = char === TARGET_QUOTE[i] || TARGET_QUOTE[i] === ' ';
                  return (
                    <span
                      key={i}
                      className={`inline-block transition-transform duration-100 ${
                        isLocked ? 'text-slate-100 font-bold' : 'text-red-400 font-black animate-pulse'
                      }`}
                      style={{
                        minWidth: char === '\u00A0' ? '0.35em' : '0.55em',
                        transform: isLocked ? 'translateY(0)' : 'translateY(-1px) scale(1.04)',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
                <span className="text-red-500 ml-1 font-sans">"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
