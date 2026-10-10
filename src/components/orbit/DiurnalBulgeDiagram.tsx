import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { Sun, Compass, Orbit, Wind, Info } from 'lucide-react';

export const DiurnalBulgeDiagram: React.FC = () => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const dragTelemetry = useSimulatorStore((s) => s.dragTelemetry);
  const dragParams = useSimulatorStore((s) => s.dragParameters);

  // Geometry calculations for 2D equatorial projection of diurnal bulge
  // Center: (150, 150), Radius: 120
  const cx = 160;
  const cy = 160;
  const earthRadiusPx = 54;
  const orbitRadiusPx = 100;

  // Sun direction in 2D (ECI X-Y projection)
  const sunX = orbit.sunVectorECI.x;
  const sunY = orbit.sunVectorECI.y;
  const sunAngleRad = Math.atan2(sunY, sunX); // Angle from +X
  const sunAngleDeg = (sunAngleRad * 180) / Math.PI;

  // Bulge Apex direction (lags Sun eastward by bulgeLagDeg, counter-clockwise in right ascension)
  const lagRad = (dragParams.bulgeLagDeg * Math.PI) / 180;
  const bulgeAngleRad = sunAngleRad + lagRad;
  const bulgeAngleDeg = (bulgeAngleRad * 180) / Math.PI;

  // Satellite position angle in ECI X-Y
  const satAngleRad = Math.atan2(orbit.positionECI.y, orbit.positionECI.x);
  const satAngleDeg = (satAngleRad * 180) / Math.PI;

  // Coordinates on SVG
  const satX = cx + orbitRadiusPx * Math.cos(satAngleRad);
  const satY = cy - orbitRadiusPx * Math.sin(satAngleRad); // SVG Y is inverted

  const sunArrowLen = 135;
  const sunXPos = cx + sunArrowLen * Math.cos(sunAngleRad);
  const sunYPos = cy - sunArrowLen * Math.sin(sunAngleRad);

  const bulgeArrowLen = 120;
  const bulgeXPos = cx + bulgeArrowLen * Math.cos(bulgeAngleRad);
  const bulgeYPos = cy - bulgeArrowLen * Math.sin(bulgeAngleRad);

  const antiBulgeXPos = cx - (earthRadiusPx + 14) * Math.cos(bulgeAngleRad);
  const antiBulgeYPos = cy + (earthRadiusPx + 14) * Math.sin(bulgeAngleRad);

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Harris-Priester Diurnal Bulge Geometry
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400">
          Lag: +{dragParams.bulgeLagDeg}° E (14:00 LST)
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* SVG Diagram Canvas */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg width="320" height="320" viewBox="0 0 320 320" className="overflow-visible">
            <defs>
              {/* Radial gradient for the diurnal thermosphere bulge */}
              <radialGradient id="bulgeGradient" cx="65%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
              </radialGradient>
              <linearGradient id="earthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Orbit Path Ellipse / Circle */}
            <circle
              cx={cx}
              cy={cy}
              r={orbitRadiusPx}
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Diurnal Upper Atmosphere Bulge Envelope (Exaggerated for visual clarity) */}
            <ellipse
              cx={cx + 12 * Math.cos(bulgeAngleRad)}
              cy={cy - 12 * Math.sin(bulgeAngleRad)}
              rx={earthRadiusPx + 38}
              ry={earthRadiusPx + 24}
              transform={`rotate(${-bulgeAngleDeg}, ${cx}, ${cy})`}
              fill="url(#bulgeGradient)"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeOpacity="0.4"
            />

            {/* Base Earth Sphere */}
            <circle
              cx={cx}
              cy={cy}
              r={earthRadiusPx}
              fill="url(#earthGradient)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />

            {/* Earth Continents / Latitude Lines (Stylized grid) */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={earthRadiusPx * 0.9}
              ry={earthRadiusPx * 0.4}
              fill="none"
              stroke="#93c5fd"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />
            <line
              x1={cx - earthRadiusPx}
              y1={cy}
              x2={cx + earthRadiusPx}
              y2={cy}
              stroke="#93c5fd"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />
            <line
              x1={cx}
              y1={cy - earthRadiusPx}
              x2={cx}
              y2={cy + earthRadiusPx}
              stroke="#93c5fd"
              strokeWidth="0.8"
              strokeOpacity="0.5"
            />

            {/* Sun Vector Arrow & Label */}
            <line
              x1={cx}
              y1={cy}
              x2={sunXPos}
              y2={sunYPos}
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle cx={sunXPos} cy={sunYPos} r="5" fill="#f59e0b" className="animate-pulse" />
            <text
              x={sunXPos + 10 * Math.cos(sunAngleRad)}
              y={sunYPos - 10 * Math.sin(sunAngleRad) + 4}
              fill="#fbbf24"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SUN (0°)
            </text>

            {/* Diurnal Bulge Apex Arrow (+30° East) */}
            <line
              x1={cx}
              y1={cy}
              x2={bulgeXPos}
              y2={bulgeYPos}
              stroke="#f97316"
              strokeWidth="2"
            />
            <circle cx={bulgeXPos} cy={bulgeYPos} r="4" fill="#ea580c" />
            <text
              x={bulgeXPos + 8 * Math.cos(bulgeAngleRad)}
              y={bulgeYPos - 8 * Math.sin(bulgeAngleRad) + 4}
              fill="#f97316"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              BULGE APEX (ρ_max)
            </text>

            {/* Night Antidiurnal Minimum Point */}
            <circle cx={antiBulgeXPos} cy={antiBulgeYPos} r="3" fill="#38bdf8" />
            <text
              x={antiBulgeXPos - 50}
              y={antiBulgeYPos + 14}
              fill="#38bdf8"
              fontSize="9"
              fontFamily="monospace"
            >
              NIGHT (ρ_min)
            </text>

            {/* Satellite Position Vector from Earth Center */}
            <line
              x1={cx}
              y1={cy}
              x2={satX}
              y2={satY}
              stroke="#22d3ee"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />

            {/* Satellite Body Marker */}
            <g transform={`translate(${satX}, ${satY})`}>
              <circle r="7" fill="#06b6d4" className="animate-ping opacity-60" />
              <rect x="-4" y="-4" width="8" height="8" fill="#e0f2fe" rx="1.5" stroke="#0891b2" strokeWidth="1" />
              {/* Solar panels */}
              <rect x="-9" y="-2" width="4" height="4" fill="#38bdf8" rx="0.5" />
              <rect x="5" y="-2" width="4" height="4" fill="#38bdf8" rx="0.5" />
            </g>
            <text
              x={satX + 10}
              y={satY - 8}
              fill="#22d3ee"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              CUBESAT
            </text>

            {/* Angular Arc for Bulge Separation Angle psi */}
            <path
              d={`M ${cx + 35 * Math.cos(bulgeAngleRad)} ${cy - 35 * Math.sin(bulgeAngleRad)} A 35 35 0 0 ${satAngleRad > bulgeAngleRad ? 0 : 1} ${cx + 35 * Math.cos(satAngleRad)} ${cy - 35 * Math.sin(satAngleRad)}`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          </svg>
        </div>

        {/* Real-Time Geometry Diagnostic Details */}
        <div className="flex-1 w-full space-y-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Bulge Separation Angle (ψ):</span>
              <span className="text-cyan-300 font-bold">{dragTelemetry?.bulgeAngleDeg.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Diurnal Factor cos⁴(ψ/2):</span>
              <span className="text-amber-300 font-bold">{dragTelemetry?.diurnalBulgeFraction.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Day/Night Density Ratio:</span>
              <span className="text-emerald-400 font-bold">
                {dragTelemetry?.diurnalRatio.toFixed(2)}× over ρ_min
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Night Minimum (ρ_min):</span>
              <span className="text-slate-300">{dragTelemetry?.rhoMinKgM3.toExponential(3)} kg/m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bulge Peak (ρ_max):</span>
              <span className="text-amber-300">{dragTelemetry?.rhoMaxKgM3.toExponential(3)} kg/m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Local Instantaneous (ρ):</span>
              <span className="text-cyan-400 font-bold">{dragTelemetry?.densityKgM3.toExponential(3)} kg/m³</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 leading-normal flex items-start gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Solar extreme ultraviolet (EUV) absorption creates a diurnal expansion bulge that peaks ~30° eastward of the subsolar point due to thermospheric thermal inertia.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
