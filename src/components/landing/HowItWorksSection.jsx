/**
 * @file HowItWorksSection.jsx
 * @description Light theme step-by-step workflow explanation.
 */
import React from 'react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Pair Helmet via Web Bluetooth',
      desc: 'Connect your browser directly to the ESP32 Service UUID (4fafc201-1fb5-459e-8fcc-c5c9c331914b) with 1 click.',
    },
    {
      step: '02',
      title: 'Continuous Multi-Axis Sampling',
      desc: 'Telemetry characteristicStreams JSON packet containing accelerometer, gyroscope, GPS coordinates, and battery level.',
    },
    {
      step: '03',
      title: 'Impact & Resultant Force Compute',
      desc: 'Threshold algorithms detect sudden deceleration. Severity triggers dynamic countdowns (Severe: 15s, Moderate: 30s, Minor: 45s).',
    },
    {
      step: '04',
      title: 'Emergency Cloud Dispatch Pipeline',
      desc: 'If false alarm is not pressed, backend triggers FCM relative notifications, SendGrid emails, and Google Places hospital routes.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2">
            System Architecture
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Crash Guard Protects Every Ride.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
              <span className="text-4xl font-extrabold text-slate-200 font-mono block mb-3">
                {s.step}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
