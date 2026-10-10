import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { TrendingUp, Clock, Compass, Layers, Sparkles } from 'lucide-react';

type PlotMode = 'DRIFT' | 'ABSOLUTE';

interface ProjectionDataPoint {
  hour: number;
  label: string;
  timeStr: string;
  unperturbedRaan: number;
  perturbedRaan: number;
  deltaRaanDeg: number;
  deltaRaanArcmin: number;
  ssoReferenceRaan: number;
  ssoDeltaDeg: number;
}

export const RaanProjectionChart: React.FC = () => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const enableJ2Perturbation = useSimulatorStore((s) => s.enableJ2Perturbation);
  const setEnableJ2Perturbation = useSimulatorStore((s) => s.setEnableJ2Perturbation);

  const [plotMode, setPlotMode] = useState<PlotMode>('DRIFT');
  const [showSsoRef, setShowSsoRef] = useState<boolean>(true);

  const elem = orbit.elements;
  const initialRaan = elem.raan;
  const driftRateDegDay = orbit.nodalRegressionRateDegDay; // e.g. -0.9856 or similar
  const ssoRateDegDay = 360 / 365.2422; // ~0.9856 deg/day

  // Generate 24-hour simulation projection data (hourly points)
  const projectionData: ProjectionDataPoint[] = useMemo(() => {
    const points: ProjectionDataPoint[] = [];
    const baseTime = orbit.simulatedTime;

    for (let h = 0; h <= 24; h++) {
      const fracDay = h / 24;
      const targetTime = new Date(baseTime + h * 3600 * 1000);
      const timeStr = targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Unperturbed: strictly constant in inertial space
      const unperturbedRaan = initialRaan;

      // J2 Perturbed RAAN
      // If J2 is currently enabled, it precesses at driftRateDegDay; if disabled, rate is 0
      const activeRate = enableJ2Perturbation ? driftRateDegDay : 0;
      const deltaRaanDeg = activeRate * fracDay;
      const perturbedRaan = (initialRaan + deltaRaanDeg + 360) % 360;

      // Theoretical SSO reference
      const ssoDeltaDeg = ssoRateDegDay * fracDay;
      const ssoReferenceRaan = (initialRaan + ssoDeltaDeg + 360) % 360;

      points.push({
        hour: h,
        label: `T+${h}h`,
        timeStr,
        unperturbedRaan: Number(unperturbedRaan.toFixed(4)),
        perturbedRaan: Number(perturbedRaan.toFixed(4)),
        deltaRaanDeg: Number(deltaRaanDeg.toFixed(4)),
        deltaRaanArcmin: Number((deltaRaanDeg * 60).toFixed(2)),
        ssoReferenceRaan: Number(ssoReferenceRaan.toFixed(4)),
        ssoDeltaDeg: Number(ssoDeltaDeg.toFixed(4)),
      });
    }

    return points;
  }, [initialRaan, driftRateDegDay, enableJ2Perturbation, orbit.simulatedTime]);

  // Derived 24h & Long-Term Precession Metrics
  const total24hShiftDeg = enableJ2Perturbation ? driftRateDegDay : 0;
  const daysForFullPrecession = Math.abs(driftRateDegDay) > 1e-4
    ? Math.round(360 / Math.abs(driftRateDegDay))
    : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              24-Hour Projected RAAN (Line of Nodes) Precession
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Secular nodal drift resulting from Earth oblateness gravitational torque on orbital momentum vector.
          </p>
        </div>

        {/* View Toggle Tabs & SSO Overlay */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct J2 Toggle Button on Chart */}
          <button
            type="button"
            onClick={() => setEnableJ2Perturbation(!enableJ2Perturbation)}
            className={`px-2.5 py-1 text-[11px] font-medium font-mono rounded-lg border transition-all flex items-center gap-1.5 ${
              enableJ2Perturbation
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/30'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${enableJ2Perturbation ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{enableJ2Perturbation ? 'J2: Active' : 'J2: Disabled'}</span>
          </button>

          {/* SSO Reference Toggle */}
          <button
            onClick={() => setShowSsoRef((v) => !v)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
              showSsoRef
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>SSO Ref (+0.9856°/d)</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPlotMode('DRIFT')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                plotMode === 'DRIFT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cumulative Drift ΔΩ
            </button>
            <button
              onClick={() => setPlotMode('ABSOLUTE')}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                plotMode === 'ABSOLUTE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Absolute RAAN Ω(t)
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Above Chart */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase">24h Net RAAN Shift</div>
          <div className={`text-sm font-bold mt-0.5 ${enableJ2Perturbation ? 'text-cyan-300' : 'text-slate-400'}`}>
            {total24hShiftDeg > 0 ? `+${total24hShiftDeg.toFixed(4)}` : total24hShiftDeg.toFixed(4)}°
          </div>
          <div className="text-[10px] text-slate-400">
            {enableJ2Perturbation ? `${(total24hShiftDeg * 60).toFixed(1)} arcminutes` : '0 arcmin'}
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase">1-Year Nodal Drift</div>
          <div className={`text-sm font-bold mt-0.5 ${enableJ2Perturbation ? 'text-cyan-300' : 'text-slate-400'}`}>
            {enableJ2Perturbation ? `${(driftRateDegDay * 365.25).toFixed(2)}°` : '0.00°'}
          </div>
          <div className="text-[10px] text-slate-400">Annual celestial precession</div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase">360° Node Revolution Period</div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">
            {daysForFullPrecession ? `${daysForFullPrecession} Days` : 'Infinite (Kepler)'}
          </div>
          <div className="text-[10px] text-slate-400">
            {daysForFullPrecession ? `${(daysForFullPrecession / 365.25).toFixed(2)} Earth years` : 'Zero precession'}
          </div>
        </div>

        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase">J2 Physics Invariant</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {enableJ2Perturbation ? 'dΩ/dt Secular Applied' : 'Pure Two-Body Flat'}
          </div>
          <div className="text-[10px] text-slate-400">
            Model: {enableJ2Perturbation ? 'Oblate Geoid' : 'Spherical Point Mass'}
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionData} margin={{ top: 10, right: 25, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              unit="°"
              domain={plotMode === 'DRIFT' ? ['auto', 'auto'] : [0, 360]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as ProjectionDataPoint;

                return (
                  <div className="bg-slate-950/95 border border-slate-800 backdrop-blur-md p-3 rounded-lg shadow-xl font-mono text-xs text-slate-200">
                    <div className="font-bold text-white border-b border-slate-800 pb-1.5 mb-1.5 flex justify-between gap-4">
                      <span>Timeline: {data.label}</span>
                      <span className="text-slate-400 font-normal">{data.timeStr}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4 text-cyan-400">
                        <span>J2 Perturbed RAAN:</span>
                        <span className="font-bold">
                          {plotMode === 'DRIFT'
                            ? `${data.deltaRaanDeg > 0 ? `+${data.deltaRaanDeg}` : data.deltaRaanDeg}° (${data.deltaRaanArcmin}′)`
                            : `${data.perturbedRaan}°`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-slate-400">
                        <span>Unperturbed Keplerian:</span>
                        <span>
                          {plotMode === 'DRIFT' ? '0.0000° (baseline)' : `${data.unperturbedRaan}°`}
                        </span>
                      </div>

                      {showSsoRef && (
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span>Theoretical SSO Drift:</span>
                          <span>
                            {plotMode === 'DRIFT'
                              ? `+${data.ssoDeltaDeg}°`
                              : `${data.ssoReferenceRaan}°`}
                          </span>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                        <span>Secular Rate:</span>
                        <span>{enableJ2Perturbation ? `${driftRateDegDay.toFixed(4)}°/day` : '0.0000°/day'}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}
            />

            {plotMode === 'DRIFT' && (
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
            )}

            {/* Unperturbed Baseline Line */}
            <Line
              type="monotone"
              dataKey={plotMode === 'DRIFT' ? () => 0 : 'unperturbedRaan'}
              name="Unperturbed 2-Body (No J2)"
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />

            {/* J2 Perturbed Trajectory Line */}
            <Line
              type="monotone"
              dataKey={plotMode === 'DRIFT' ? 'deltaRaanDeg' : 'perturbedRaan'}
              name="J2 Perturbed RAAN"
              stroke="#06b6d4"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#06b6d4' }}
              activeDot={{ r: 5, fill: '#22d3ee', stroke: '#ffffff', strokeWidth: 1.5 }}
            />

            {/* Optional Sun-Synchronous Reference Line */}
            {showSsoRef && (
              <Line
                type="monotone"
                dataKey={plotMode === 'DRIFT' ? 'ssoDeltaDeg' : 'ssoReferenceRaan'}
                name="SSO Target Heliocentric Lock"
                stroke="#10b981"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Physics Footer Callout */}
      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-slate-300 font-semibold">Analytical Derivative:</span>{' '}
          dΩ/dt = -(3/2) · J₂ · (R_E / p)² · n₀ · cos(i)
        </div>
        <div className="text-slate-400">
          Semi-latus rectum p = a · (1 - e²) ≈ {(elem.semiMajorAxis * (1 - elem.eccentricity ** 2)).toFixed(1)} km
        </div>
      </div>
    </div>
  );
};
