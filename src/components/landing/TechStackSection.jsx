/**
 * @file TechStackSection.jsx
 * @description Light theme technology stack showcase.
 */
import React from 'react';

export default function TechStackSection() {
  const tech = [
    { name: 'Web Bluetooth API', category: 'Hardware Bridge', desc: 'Direct browser GATT client' },
    { name: 'ESP32 Microcontroller', category: 'Hardware Core', desc: 'Dual-core MCU with BLE stack' },
    { name: 'Firebase Firestore & Auth', category: 'Cloud Database', desc: 'Real-time telemetry & Security Rules' },
    { name: 'Node.js & Express', category: 'Backend Service', desc: 'Production-ready dispatch REST API' },
    { name: 'Google Places API', category: 'Hospital Routing', desc: 'Nearby Search trauma hospital discovery' },
    { name: 'Firebase Cloud Messaging', category: 'Push Notifications', desc: 'High-priority relative alert multicast' },
  ];

  return (
    <section id="tech" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2">
            Production Stack
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built on Industry-Standard Hardware & Cloud APIs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tech.map((t, idx) => (
            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:bg-white hover:shadow-md transition-all">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block mb-1">
                {t.category}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.name}</h3>
              <p className="text-sm text-slate-600">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
