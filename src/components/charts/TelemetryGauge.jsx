import React from 'react';

export function TelemetryGauge({ 
  label,
  title,  // alias for label
  value = 0, 
  unit, 
  min = 0, 
  max = 100, 
  thresholds = [], 
  icon 
}) {
  const displayLabel = title || label || '';

  // Normalize thresholds: accept either array [{value, color}] or convenience object {amber: N, red: N}
  const normalizedThresholds = Array.isArray(thresholds)
    ? thresholds
    : Object.entries(thresholds).map(([colorName, val]) => ({
        value: val,
        color: colorName === 'red' ? '#ef4444'
             : colorName === 'orange' ? '#f97316'
             : colorName === 'amber' ? '#f59e0b'
             : colorName === 'green' ? '#22c55e'
             : '#94a3b8',
      }));

  // Clamp value between min and max
  const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;
  const clampedValue = Math.min(Math.max(safeValue, min), max);
  
  // Calculate percentage (0 to 1)
  const percentage = max !== min ? (clampedValue - min) / (max - min) : 0;
  
  // Arc settings
  const radius = 60;
  const strokeWidth = 12;
  const viewBoxSize = 160;
  const center = viewBoxSize / 2;
  
  // SVG arc calculation (starts at -140 deg, ends at +140 deg)
  const startAngle = -140;
  const endAngle = 140;
  const totalAngle = endAngle - startAngle;
  
  const currentAngle = startAngle + (totalAngle * percentage);
  
  const polarToCartesian = (centerX, centerY, r, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (r * Math.cos(angleInRadians)),
      y: centerY + (r * Math.sin(angleInRadians))
    };
  };
  
  const describeArc = (x, y, r, sAngle, eAngle) => {
    const start = polarToCartesian(x, y, r, eAngle);
    const end = polarToCartesian(x, y, r, sAngle);
    const largeArcFlag = eAngle - sAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };
  
  // Determine color based on thresholds
  let currentColor = '#22c55e'; // Default green
  
  const sortedThresholds = [...normalizedThresholds].sort((a, b) => a.value - b.value);
  for (const threshold of sortedThresholds) {
    if (clampedValue >= threshold.value) {
      currentColor = threshold.color;
    }
  }


  // Create paths
  const backgroundPath = describeArc(center, center, radius, startAngle, endAngle);
  const valuePath = describeArc(center, center, radius, startAngle, currentAngle);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-black/40 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
      <div className="absolute top-4 left-4 text-gray-400">
        {icon}
      </div>
      
      <div className="relative w-full aspect-square max-w-[160px] flex items-center justify-center mt-2">
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-full overflow-visible">
          {/* Background Arc */}
          <path
            d={backgroundPath}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Glow Effect */}
          <path
            d={valuePath}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${currentColor})` }}
          />
          
          {/* Value Arc */}
          <path
            d={valuePath}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out relative z-10"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className="text-3xl font-bold text-white font-display tracking-tight" style={{ color: currentColor, textShadow: `0 0 10px ${currentColor}60` }}>
            {safeValue % 1 !== 0 ? safeValue.toFixed(1) : safeValue}
          </span>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{unit}</span>
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <h4 className="text-sm font-semibold text-gray-300">{displayLabel}</h4>
        <div className="flex justify-between w-full px-6 mt-1 text-[10px] text-gray-500 font-mono">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

export default TelemetryGauge;
