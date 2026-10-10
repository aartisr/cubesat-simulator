import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import {
  Sun,
  Moon,
  Clock,
  Compass,
  Zap,
  Globe,
  Waves,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const SolarNightCycleVisualizer: React.FC = () => {
  const thermal = useSimulatorStore((s) => s.thermal);
  const orbit = useSimulatorStore((s) => s.orbit);

  const env = thermal.environment;
  const isUmbra = env.eclipseState === 'UMBRA';
  const isPenumbra = env.eclipseState === 'PENUMBRA';
  const isSunlight = env.eclipseState === 'SUNLIGHT';

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const periodMinutes = orbit.elements?.periodMinutes || 94.5;
  const sunPct = (env.predictedTimeInSunlightSec / (periodMinutes * 60)) * 100;
  const eclipsePct = 100 - sunPct;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Solar Flux & Orbital Day / Night Thermal Cycle
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic solar irradiance, Earth albedo, planetary infrared (OLR), and orbital eclipse thermal shock tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isUmbra && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5 shadow-sm">
              <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              ORBITAL NIGHT (UMBRA)
            </span>
          )}
          {isPenumbra && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              PENUMBRA (TERMINATOR)
            </span>
          )}
          {isSunlight && (
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1.5 shadow-sm">
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
              DIRECT SUNLIGHT
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Solar Gauge + Environmental Heat Fluxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Solar Irradiance Real-Time Flux */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase">
              <span>Direct Solar Irradiance</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>

            <div className="text-center py-4 bg-slate-900/60 rounded-lg border border-slate-800/80 my-3">
              <div className="text-3xl font-mono font-bold text-amber-400">
                {env.solarIrradianceWPerM2.toFixed(1)} <span className="text-xs font-normal text-slate-400">W/m²</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Absorbed Body Flux: <span className="text-white font-bold">{env.solarFluxDirectW.toFixed(2)} W</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-xs font-mono">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Illumination Factor:</span>
              <span className="text-white font-semibold">{(env.eclipseFraction * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${env.eclipseFraction * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0 W/m² (Night)</span>
              <span>1361 W/m² (LEO Peak)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Secondary Environmental Radiation (Albedo & Earth IR) */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase">
              <span>Secondary Planetary Flux</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-3 my-3">
              {/* Earth Albedo */}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-mono">Earth Reflected Albedo:</div>
                  <div className="text-base font-mono font-bold text-cyan-300">
                    +{env.earthAlbedoFluxW.toFixed(2)} <span className="text-xs font-normal text-slate-400">W</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  Albedo: 30%<br />View Factor: 0.38
                </div>
              </div>

              {/* Earth Outgoing Longwave IR */}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-mono">Earth Planetary IR (OLR):</div>
                  <div className="text-base font-mono font-bold text-emerald-300">
                    +{env.earthIRFluxW.toFixed(2)} <span className="text-xs font-normal text-slate-400">W</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-right">
                  237 W/m²<br />Constant IR
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>Total Environmental Heat:</span>
            <span className="text-white font-bold">
              {(env.solarFluxDirectW + env.earthAlbedoFluxW + env.earthIRFluxW).toFixed(2)} W
            </span>
          </div>
        </div>

        {/* Card 3: Orbital Night Timeline & Prediction */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase">
              <span>Day / Night Revolution Split</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>

            <div className="my-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Time in Current Regime:</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  {formatTime(env.timeInCurrentRegimeSec)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Full Orbital Period:</span>
                <span className="text-cyan-400 font-semibold">{periodMinutes.toFixed(1)} min</span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Est. Night Duration:</span>
                <span className="text-indigo-300 font-semibold">{formatTime(env.predictedTimeInEclipseSec)}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Est. Sunlight Duration:</span>
                <span className="text-yellow-300 font-semibold">{formatTime(env.predictedTimeInSunlightSec)}</span>
              </div>
            </div>
          </div>

          {/* Visual Orbit Split Bar */}
          <div className="space-y-1">
            <div className="w-full h-3 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-yellow-500/80 h-full flex items-center justify-center text-[9px] font-mono font-bold text-slate-950"
                style={{ width: `${sunPct}%` }}
              >
                SUN {sunPct.toFixed(0)}%
              </div>
              <div
                className="bg-indigo-900/90 h-full flex items-center justify-center text-[9px] font-mono font-bold text-indigo-200"
                style={{ width: `${eclipsePct}%` }}
              >
                NIGHT {eclipsePct.toFixed(0)}%
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 text-center">
              LEO 500 km Beta Angle: {orbit.betaAngle.toFixed(1)}°
            </div>
          </div>
        </div>
      </div>

      {/* Terminator Crossing Alert Banner if Penumbra */}
      {isPenumbra && (
        <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between text-xs font-mono shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-amber-200 font-semibold">
              TERMINATOR SHOCK DETECTED: Rapid thermal gradient transition (dT/dt transient active).
            </span>
          </div>
          <span className="text-slate-300">
            Penumbra Fraction: {(env.eclipseFraction * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};
