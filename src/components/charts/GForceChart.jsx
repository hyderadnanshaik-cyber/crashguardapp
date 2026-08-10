/**
 * @file GForceChart.jsx
 * @description GoDaddy-style light theme G-Force chart with DYNAMIC COLOR SHIFTING.
 * Green (normal) → Amber (minor) → Orange (moderate) → Glowing Crimson Red (severe)
 */
import React, { useState, useEffect, useId } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Activity } from 'lucide-react';

/** Determine zone from force value */
function getZone(val) {
  if (val >= 50) return { label: 'SEVERE',   color: '#dc2626', fill: '#dc2626', textClass: 'text-red-600',    bgClass: 'bg-red-50 border-red-200' };
  if (val >= 35) return { label: 'MODERATE', color: '#ea580c', fill: '#ea580c', textClass: 'text-orange-600', bgClass: 'bg-orange-50 border-orange-200' };
  if (val >= 15) return { label: 'MINOR',    color: '#d97706', fill: '#d97706', textClass: 'text-amber-600',  bgClass: 'bg-amber-50 border-amber-200' };
  return          { label: 'NORMAL',  color: '#16a34a', fill: '#16a34a', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50 border-emerald-200' };
}

export function GForceChart({ gforce = null, isDemo = false }) {
  const gradId = useId().replace(/:/g, '');
  const [data, setData] = useState(
    Array.from({ length: 40 }, (_, i) => ({ t: i, v: 0 }))
  );

  useEffect(() => {
    let id; let counter = 0;
    const push = (v) =>
      setData(prev => [...prev.slice(1), { t: prev[prev.length - 1].t + 1, v }]);

    if (isDemo) {
      id = setInterval(() => {
        counter += 0.18;
        const base  = Math.sin(counter) * 14 + 12;
        const noise = (Math.random() - 0.5) * 4;
        const spike = Math.random() > 0.96 ? Math.random() * 55 : 0;
        push(+Math.min(80, Math.max(0, base + noise + spike)).toFixed(2));
      }, 180);
    } else if (gforce !== null) {
      push(gforce);
    }
    return () => clearInterval(id);
  }, [gforce, isDemo]);

  const current = data[data.length - 1].v;
  const zone    = getZone(current);

  return (
    <div className="w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${zone.bgClass}`}>
            <Activity size={18} className={zone.textClass} />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-sm">Live G-Force Waveform</p>
            <p className="text-slate-500 text-[11px] font-mono">R = √(ax² + ay² + az²)</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-3xl font-black font-mono tracking-tight ${zone.textClass}`}>
            {current.toFixed(1)}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full animate-pulse`}
              style={{ backgroundColor: zone.color }} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${zone.textClass}`}>
              {zone.label}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad_${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={zone.fill} stopOpacity={0.35} />
                <stop offset="95%" stopColor={zone.fill} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 80]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={32} />

            <Tooltip
              contentStyle={{ background: '#0f172a', border: `1px solid ${zone.color}`, borderRadius: 8, color: '#fff', fontSize: 12 }}
              itemStyle={{ color: zone.color }}
              labelStyle={{ display: 'none' }}
              formatter={(v) => [`${v} m/s²`, 'G-Force']}
            />

            <ReferenceLine y={15} stroke="#d97706" strokeDasharray="4 4"
              label={{ value: 'Minor',    fill: '#d97706', fontSize: 9, position: 'insideTopLeft' }} />
            <ReferenceLine y={35} stroke="#ea580c" strokeDasharray="4 4"
              label={{ value: 'Moderate', fill: '#ea580c', fontSize: 9, position: 'insideTopLeft' }} />
            <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 4"
              label={{ value: 'Severe',   fill: '#dc2626', fontSize: 9, position: 'insideTopLeft' }} />

            <Area
              type="monotone" dataKey="v"
              stroke={zone.fill} strokeWidth={2.5}
              fill={`url(#grad_${gradId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Zone bar */}
      <div className="mt-3 flex gap-1">
        {['#16a34a','#d97706','#ea580c','#dc2626'].map((c, i) => {
          const thresholds = [0, 15, 35, 50];
          const active = current >= thresholds[i] && (i === 3 || current < thresholds[i + 1]);
          return (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{ background: active ? c : '#e2e8f0' }} />
          );
        })}
      </div>
    </div>
  );
}

export default GForceChart;
