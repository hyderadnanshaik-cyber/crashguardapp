/**
 * @file AboutSection.jsx
 * @description Modern Light-Theme "About Us" and "Meet Team RedHack" Section for Crash Guard.
 * Includes Institution badge (MJCET), Mission Statement, 9 Key Features Grid,
 * How It Works summary, and 4 Developer Profile Cards with direct LinkedIn links.
 */
import React from 'react';
import {
  ShieldCheck, Activity, MapPin, Radio, Lock, Sun, PhoneCall,
  Building2, FileText, ExternalLink, Award, Users, CheckCircle2, Heart
} from 'lucide-react';

/* ── LinkedIn SVG Icon ───────────────────────────────────────────────────────── */
function LinkedInIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

/* ── 9 Key Features ─────────────────────────────────────────────────────────── */
const KEY_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Automatic Crash Detection',
    desc: 'Advanced motion sensors detect crashes and automatically alert emergency contacts.',
    accent: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    icon: Activity,
    title: 'Intelligent Severity Detection',
    desc: 'Algorithmic multi-threshold system that classifies crash severity (minor, moderate, severe) and dispatches priority-based alerts.',
    accent: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    icon: MapPin,
    title: 'Smart Location Sharing',
    desc: 'GPS-powered location sharing with emergency contacts and emergency services.',
    accent: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    icon: Radio,
    title: 'Bluetooth Helmet Integration',
    desc: 'Seamless Web Bluetooth connection with smart helmets for real-time safety monitoring.',
    accent: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  {
    icon: Lock,
    title: 'Helmet Wear Detection',
    desc: 'Smart ignition lock mechanism detecting whether the helmet is properly worn before riding.',
    accent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    icon: Sun,
    title: 'Weather Monitoring',
    desc: 'Real-time weather updates and daily notifications for safer riding conditions.',
    accent: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    icon: PhoneCall,
    title: 'Emergency Contact Management',
    desc: 'Quick access and direct notification routing to trusted contacts during emergencies.',
    accent: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    icon: Building2,
    title: 'Nearby Hospitals Finder',
    desc: 'Instant location routing to nearby healthcare facilities complete with distance and contact info via Google Places API.',
    accent: 'text-teal-600 bg-teal-50 border-teal-200',
  },
  {
    icon: FileText,
    title: 'Health Insurance Integration',
    desc: 'Secure local storage and quick access to health insurance credentials during critical moments.',
    accent: 'text-violet-600 bg-violet-50 border-violet-200',
  },
];

/* ── Developer Profiles ──────────────────────────────────────────────────────── */
const DEVELOPERS = [
  {
    name: 'Shaik Ayan Hyder',
    role: 'Hardware & Embedded Systems Engineer | 3D Structural Designer',
    highlight: 'Architecting the physical core of Crash Guard—from precision sensor integration on ESP32 microcontrollers to custom 3D-molded helmet enclosures.',
    linkedin: 'https://www.linkedin.com/in/shaik-ayan-hyder-0a7b6a382',
    initials: 'AH',
    color: 'from-red-500 to-rose-600',
  },
  {
    name: 'Shaik Adnan Hyder',
    role: 'Backend Architect & IoT Systems Engineer',
    highlight: 'Powering real-time telemetry processing, low-latency Web Bluetooth communication bridges, and scalable emergency dispatch pipelines.',
    linkedin: 'https://www.linkedin.com/in/shaik-adnan-hyder/',
    initials: 'SH',
    color: 'from-blue-600 to-indigo-600',
  },
  {
    name: 'Amena Kouser',
    role: 'Lead Frontend & UI/UX Engineer',
    highlight: 'Crafting intuitive, highly responsive, and accessible mobile/desktop telemetry dashboards for seamless rider and watcher monitoring.',
    linkedin: 'https://www.linkedin.com/in/amena-kouser-576200385?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
    initials: 'AK',
    color: 'from-purple-600 to-pink-600',
  },
  {
    name: 'Farnaaz Munawar',
    role: 'Research Specialist & Hardware Integration Engineer',
    highlight: 'Driving empirical crash dynamics research, sensor calibration testing, and hardware reliability testing for real-world road conditions.',
    linkedin: 'https://www.linkedin.com/in/farnaaz-munawar-541912385',
    initials: 'FM',
    color: 'from-emerald-600 to-teal-600',
  },
];

export default function AboutSection() {
  return (
    <section id="about-us" className="py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Section Header & Mission ────────────────────────────────────────── */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black uppercase tracking-wider mb-6 shadow-xs">
            <Award size={14} className="text-red-600 shrink-0" />
            <span>CREATED BY TEAM REDHACK • MUFFAKHAM JAH COLLEGE OF ENGINEERING & TECHNOLOGY (MJCET)</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            Your Smart Shield on the Road.
          </h2>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs relative text-left sm:text-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Our Mission</h3>
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
              <strong className="text-slate-900 font-bold">Crash Guard</strong> is designed to be your smart shield on the road. We believe that every motorcyclist deserves to ride with confidence, knowing that help is just a crash detection away. Our advanced system combines cutting-edge technology with intuitive design to provide real-time protection for riders everywhere.
            </p>
          </div>
        </div>

        {/* ── 9 Key Features Grid ─────────────────────────────────────────────── */}
        <div className="mb-24">
          <div className="text-center mb-12">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-1">Comprehensive Protection</h3>
            <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Key Features</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_FEATURES.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 transition-transform group-hover:scale-105 ${feat.accent}`}>
                      <IconComp size={24} />
                    </div>
                    <h5 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                      {feat.title}
                    </h5>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── How It Works Summary Box ────────────────────────────────────────── */}
        <div className="mb-24 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full text-xs font-bold text-red-400 uppercase tracking-widest mb-4">
              <CheckCircle2 size={14} /> Automated Protocol
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
              How Crash Guard Responds When You Need It Most
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              When a crash is detected, Crash Guard immediately analyzes the impact severity and starts an automated countdown timer (<strong className="text-white">45s</strong> for minor, <strong className="text-white">30s</strong> for moderate, <strong className="text-white">15s</strong> for severe crashes). If the rider does not respond within this window, the system automatically broadcasts their precise live location to all emergency contacts with appropriate priority alerts and can alert local emergency services. The system also highlights nearby hospitals to assist first responders—ensuring help arrives as quickly as possible, even if the rider is incapacitated.
            </p>
          </div>
        </div>

        {/* ── Meet Team RedHack (Developers Section) ───────────────────────────── */}
        <div id="team">
          {/* Header & Institution Badge */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-extrabold tracking-wide mb-4 shadow-xs">
              <Users size={14} className="text-red-600" />
              <span>Muffakham Jah College of Engineering & Technology (MJCET)</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Meet Team RedHack
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              The engineers, architects, and researchers behind Crash Guard.
            </p>
          </div>

          {/* 4 Developer Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DEVELOPERS.map((dev, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent Top Border */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${dev.color}`} />

                <div>
                  {/* Avatar Badge */}
                  <div className="flex items-center justify-between mb-4 pt-1">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dev.color} text-white font-black text-lg flex items-center justify-center shadow-md`}>
                      {dev.initials}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Team RedHack
                    </span>
                  </div>

                  {/* Name & Role */}
                  <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1 group-hover:text-red-600 transition-colors">
                    {dev.name}
                  </h4>
                  <p className="text-xs font-bold text-red-600 leading-snug mb-3">
                    {dev.role}
                  </p>

                  {/* Highlight text */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
                    {dev.highlight}
                  </p>
                </div>

                {/* LinkedIn Button */}
                <a
                  href={dev.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors group-hover:shadow-md"
                >
                  <LinkedInIcon className="w-4 h-4 fill-current" />
                  <span>Connect on LinkedIn</span>
                  <ExternalLink size={12} className="opacity-70" />
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
