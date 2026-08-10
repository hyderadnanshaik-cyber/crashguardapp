/**
 * @file HeroSection.jsx
 * @description GoDaddy-style light theme Hero Section for Crash Guard.
 */
import React from 'react';
import { Shield, Activity, PhoneCall, ChevronRight, Zap } from 'lucide-react';
import { HelmetLogo } from '../ui/HelmetLogo';
import GForceChart from '../charts/GForceChart';

export default function HeroSection({ onAuthClick }) {
  return (
    <section className="relative pt-28 pb-20 bg-slate-50 border-b border-slate-200 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-100/50 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Action */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
              <Zap size={14} className="text-red-600 fill-current" />
              <span className="text-xs font-semibold text-slate-800 tracking-wide">
                Web Bluetooth (BLE) Smart Helmet System
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Real-time Crash Detection <br className="hidden sm:inline" />
              <span className="text-red-600">& Emergency Dispatch.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Crash Guard pairs seamlessly with your ESP32-powered helmet via Web Bluetooth. 
              Instant resultant force calculation, dynamic countdowns, automated family notifications, 
              and hospital routing — working offline or online.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onAuthClick}
                className="bg-black hover:bg-slate-800 text-white font-semibold px-6 py-3.5 rounded-md shadow-md transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
              >
                <span>Launch Rider Portal</span>
                <ChevronRight size={18} />
              </button>
              
              <a
                href="#how-it-works"
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold px-6 py-3.5 rounded-md shadow-sm transition-all text-sm"
              >
                Explore Technology
              </a>
            </div>

            {/* Value Highlights */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-red-600" />
                <span className="text-xs font-semibold text-slate-700">0s Latency BLE</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-red-600" />
                <span className="text-xs font-semibold text-slate-700">Multi-Axis Telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall size={18} className="text-red-600" />
                <span className="text-xs font-semibold text-slate-700">Google Places API</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Product Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-5 sm:p-6 relative z-10 overflow-hidden flex flex-col justify-between max-w-full">
              {/* Product Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2.5">
                  <HelmetLogo className="w-9 h-9" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">ESP32 Telemetry Monitor</h3>
                    <p className="text-[11px] text-slate-500 font-mono">UUID: 4fafc201-1fb5-459e-8fcc</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Bridge
                </span>
              </div>

              {/* Sample Telemetry Teleprompter */}
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Resultant Force</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">1.02 G</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">9.81 m/s² (Normal)</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Speed</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">48 km/h</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">GPS Fixed (8 Sats)</span>
                  </div>
                </div>

                {/* Bounded Live Waveform Container */}
                <div className="w-full h-44 sm:h-48 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <GForceChart isDemo={true} />
                </div>
              </div>
            </div>

            {/* Decorative background shadow card */}
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-slate-200/60 rounded-2xl -z-0" />
          </div>

        </div>
      </div>
    </section>
  );
}
