/**
 * @file ActivityTimeline.jsx
 * @description Real-Time Rider Activity & Connection History Timeline for Watcher / Relative Portal.
 * Displays real-time and historical events (App opened/closed, BLE connect/disconnect, Crashes, Safe signals).
 */
import React, { useState, useEffect } from 'react';
import {
  Activity, ShieldCheck, ShieldAlert, Wifi, WifiOff, Smartphone, Siren, Clock, CheckCircle2
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export function ActivityTimeline({ accessCode }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessCode || !db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'rider_locations', accessCode, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const entries = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() });
      });

      // Save to localStorage as fallback history
      if (entries.length > 0) {
        try {
          localStorage.setItem(`cg_activity_logs_${accessCode}`, JSON.stringify(entries));
        } catch {}
        setLogs(entries);
      } else {
        // Try loading cached history from localStorage
        const cached = localStorage.getItem(`cg_activity_logs_${accessCode}`);
        if (cached) {
          try { setLogs(JSON.parse(cached)); } catch {}
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn('[ActivityTimeline] Firestore listener error, using cache fallback:', err);
      const cached = localStorage.getItem(`cg_activity_logs_${accessCode}`);
      if (cached) {
        try { setLogs(JSON.parse(cached)); } catch {}
      }
      setLoading(false);
    });

    return () => unsub();
  }, [accessCode]);

  const getBadgeStyle = (badge, type) => {
    if (badge === 'green' || type === 'SAFE' || type === 'BLE_CONNECTED') {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: ShieldCheck,
        iconColor: 'text-emerald-600',
      };
    }
    if (badge === 'red' || type === 'CRASH' || type === 'DISPATCH') {
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-600 animate-pulse',
        icon: ShieldAlert,
        iconColor: 'text-red-600',
      };
    }
    if (badge === 'amber' || type === 'BLE_DISCONNECTED') {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        icon: WifiOff,
        iconColor: 'text-amber-600',
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: Smartphone,
      iconColor: 'text-slate-500',
    };
  };

  const formatTimestamp = (item) => {
    let dateObj = null;
    if (item.timestamp?.toMillis) {
      dateObj = new Date(item.timestamp.toMillis());
    } else if (item.createdAt) {
      dateObj = new Date(item.createdAt);
    }
    if (!dateObj || isNaN(dateObj.getTime())) return 'Just now';

    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (isToday) {
      return `${timeStr} · Today`;
    }
    return `${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-red-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Rider Activity & Connection History</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Live Audit Feed
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Clock className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-xs font-semibold">Loading rider timeline...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
          <Activity className="w-8 h-8 opacity-30" />
          <p className="text-sm font-bold text-slate-600">No activity recorded yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Connection changes, helmet status, and crash events will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
          {logs.map((item, idx) => {
            const style = getBadgeStyle(item.badge, item.type);
            const IconComp = style.icon;
            const timeStr = formatTimestamp(item);

            return (
              <div key={item.id || idx} className="relative pl-6 pb-2 border-l-2 border-slate-100 last:border-l-0">
                {/* Timeline Dot */}
                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white ${style.dot} shadow-xs`} />

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${style.bg}`}>
                      <IconComp size={15} className={style.iconColor} />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        {item.title}
                      </h4>
                      {item.details && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActivityTimeline;
