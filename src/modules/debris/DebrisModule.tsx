import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { ShieldAlert, ShieldCheck, Flame, Compass, Crosshair, AlertTriangle, Radio } from 'lucide-react';

export const DebrisModule: React.FC = () => {
  const conjunctions = useSimulatorStore((s) => s.conjunctions);
  const debrisList = useSimulatorStore((s) => s.debrisList);
  const triggerCAM = useSimulatorStore((s) => s.triggerCollisionAvoidanceManeuver);

  const criticalOrWarning = conjunctions.filter(
    (c) => c.severity === 'CRITICAL' || c.severity === 'WARNING' || c.severity === 'MONITOR'
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Orbital Debris Conjunction Assessment & Collision Avoidance (CAM)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Foster-Chan 2D B-plane encounter integration, Mahalanobis covariance ellipsoids, and autonomous impulsive delta-V evasion burns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Tracked Catalog Objects:</span>
          <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
            {debrisList.length} In Proximity
          </span>
        </div>
      </div>

      {/* Main Grid: Active Conjunction Data Messages (CDMs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Conjunctions List & Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Conjunction Data Messages (CDM Log)
              </span>
              <span className="text-[11px] font-mono text-slate-400">NORAD 18 SPCS PROTOCOL</span>
            </div>

            <div className="space-y-3">
              {conjunctions.map((c) => {
                const isCritical = c.severity === 'CRITICAL';
                const isWarning = c.severity === 'WARNING';
                const isMonitor = c.severity === 'MONITOR';

                return (
                  <div
                    key={c.debrisId}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-rose-950/30 border-rose-500/60 shadow-lg shadow-rose-950/30'
                        : isWarning
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : isMonitor
                        ? 'bg-cyan-950/20 border-cyan-500/30'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{c.debrisName}</span>
                          <span className="text-[10px] font-mono text-slate-400">NORAD #{c.catalogNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.recommendedAction}</div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : isMonitor
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {c.severity}
                        </span>

                        {(isCritical || isWarning) && !c.maneuverExecuted && (
                          <button
                            onClick={() => triggerCAM(c.debrisId)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                          >
                            <Flame className="w-3.5 h-3.5" />
                            <span>Execute CAM Burn (Δv {c.recommendedDeltaVMs} m/s)</span>
                          </button>
                        )}

                        {c.maneuverExecuted && (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium font-mono">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Maneuver Completed</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scientific metrics bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">MISS DISTANCE</div>
                        <div className={`font-bold ${isCritical ? 'text-rose-400' : 'text-slate-200'}`}>
                          {c.missDistanceKm.toFixed(3)} km
                        </div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">COLLISION PROB (Pc)</div>
                        <div className={`font-bold ${isCritical ? 'text-rose-400' : 'text-slate-200'}`}>
                          {c.collisionProbability.toExponential(2)}
                        </div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">REL VELOCITY</div>
                        <div className="text-slate-200 font-bold">{c.relativeVelocityKmS.toFixed(2)} km/s</div>
                      </div>
                      <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">TIME TO TCA</div>
                        <div className="text-cyan-400 font-bold">
                          {c.timeToTcaSeconds > 0 ? `${c.timeToTcaSeconds.toFixed(1)}s` : 'PASSED'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: B-Plane Encounter Geometry Visualizer */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  B-Plane Covariance Projection
                </span>
                <Crosshair className="w-4 h-4 text-cyan-400" />
              </div>

              {/* B-plane schematic SVG */}
              <div className="relative w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden p-2">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Grid crosshairs */}
                  <line x1="0" y1="100" x2="200" y2="100" stroke="#1e293b" strokeWidth="1" />
                  <line x1="100" y1="0" x2="100" y2="200" stroke="#1e293b" strokeWidth="1" />

                  {/* 3-Sigma Covariance Ellipse */}
                  <ellipse
                    cx="100"
                    cy="100"
                    rx="65"
                    ry="28"
                    transform="rotate(-25 100 100)"
                    fill="none"
                    stroke="rgba(244, 63, 94, 0.25)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* 2-Sigma Covariance Ellipse */}
                  <ellipse
                    cx="100"
                    cy="100"
                    rx="45"
                    ry="18"
                    transform="rotate(-25 100 100)"
                    fill="none"
                    stroke="rgba(244, 63, 94, 0.45)"
                    strokeWidth="1.2"
                  />

                  {/* 1-Sigma Covariance Ellipse */}
                  <ellipse
                    cx="100"
                    cy="100"
                    rx="25"
                    ry="10"
                    transform="rotate(-25 100 100)"
                    fill="rgba(244, 63, 94, 0.1)"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                  />

                  {/* Hard Body Radius (HBR) of Primary Satellite at center */}
                  <circle cx="100" cy="100" r="4" fill="#38bdf8" />
                  <circle cx="100" cy="100" r="12" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />

                  {/* Miss Distance Vector & Debris point */}
                  <line x1="100" y1="100" x2="128" y2="78" stroke="#f59e0b" strokeWidth="1.5" />
                  <circle cx="128" cy="78" r="3.5" fill="#f59e0b" />
                </svg>

                <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-400">
                  +ξ (Cross-Track)
                </div>
                <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-400">
                  +ζ (Radial)
                </div>
                <div className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-400">
                  Primary Sat (HBR: 0.6m)
                </div>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-amber-400">
                  Debris Miss Vector
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Covariance Ellipse 1-σ:</span>
                <span className="font-mono text-slate-200">80m × 250m</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Threshold Criteria:</span>
                <span className="font-mono text-rose-400">Pc &gt; 1.0e-4</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Evasion Thruster:</span>
                <span className="font-mono text-emerald-400">Cold-Gas Micro-Thruster</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
