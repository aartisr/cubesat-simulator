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
import { HarrisPriesterPhysics, ScenarioDecayCurve } from '../../core/math/harrisPriester';
import { TrendingDown, Calendar, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

type HorizonDays = 180 | 365 | 1095 | 1825; // 6mo, 1yr, 3yr, 5yr

export const OrbitalDecayChart: React.FC = () => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const dragTelemetry = useSimulatorStore((s) => s.dragTelemetry);
  const dragParams = useSimulatorStore((s) => s.dragParameters);
  const enableDrag = useSimulatorStore((s) => s.enableAtmosphericDrag);

  const [horizon, setHorizon] = useState<HorizonDays>(1825);
  const [selectedScenarios, setSelectedScenarios] = useState<Record<string, boolean>>({
    current: true,
    solar_min: true,
    solar_max: true,
    solar_storm: false,
    drag_sail: false,
  });

  const currentAltKm = orbit.geodetic.altitude;
  const currentEccentricity = orbit.elements.eccentricity;

  // Generate decay comparison scenarios
  const scenarios: ScenarioDecayCurve[] = useMemo(() => {
    return HarrisPriesterPhysics.generateDecayComparisonScenarios(
      currentAltKm,
      currentEccentricity,
      dragParams.f107SolarFlux,
      dragParams.crossSectionAreaM2,
      dragParams.cd,
      dragParams.satelliteMassKg
    );
  }, [
    currentAltKm,
    currentEccentricity,
    dragParams.f107SolarFlux,
    dragParams.crossSectionAreaM2,
    dragParams.cd,
    dragParams.satelliteMassKg,
  ]);

  // Combine scenarios into unified data series for Recharts
  const chartData = useMemo(() => {
    // Generate days matching horizon
    const maxDay = horizon;
    const step = horizon <= 365 ? 15 : horizon <= 1095 ? 30 : 45;
    const rows: Record<string, any>[] = [];

    // Find all scenario point lookup maps
    const lookups: Record<string, Map<number, number>> = {};
    scenarios.forEach((sc) => {
      const map = new Map<number, number>();
      sc.points.forEach((p) => map.set(p.day, p.altitudeKm));
      lookups[sc.id] = map;
    });

    for (let day = 0; day <= maxDay; day += step) {
      const yearFraction = (day / 365.25).toFixed(2);
      const row: Record<string, any> = {
        day,
        label: day === 0 ? 'Day 0 (Now)' : day < 365 ? `T+${day}d` : `T+${yearFraction}y`,
      };

      scenarios.forEach((sc) => {
        // Interpolate or find closest
        let val = lookups[sc.id]?.get(day);
        if (val === undefined) {
          // Find closest point
          const match = sc.points.find((p) => Math.abs(p.day - day) <= step / 2);
          val = match ? match.altitudeKm : 120;
        }
        row[sc.id] = val;
      });

      rows.push(row);
    }

    return rows;
  }, [scenarios, horizon]);

  const toggleScenario = (id: string) => {
    setSelectedScenarios((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Harris-Priester Orbital Altitude Decay Projection
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-step thermospheric drag decay simulation projecting orbital lifetime against solar cycle variations
          </p>
        </div>

        {/* Projection Horizon Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono self-start sm:self-auto">
          <span className="text-slate-400 text-[10px] uppercase px-1.5">Horizon:</span>
          <button
            type="button"
            onClick={() => setHorizon(180)}
            className={`px-2.5 py-1 rounded transition-colors ${
              horizon === 180 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            6 Mo
          </button>
          <button
            type="button"
            onClick={() => setHorizon(365)}
            className={`px-2.5 py-1 rounded transition-colors ${
              horizon === 365 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1 Yr
          </button>
          <button
            type="button"
            onClick={() => setHorizon(1095)}
            className={`px-2.5 py-1 rounded transition-colors ${
              horizon === 1095 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3 Yr
          </button>
          <button
            type="button"
            onClick={() => setHorizon(1825)}
            className={`px-2.5 py-1 rounded transition-colors ${
              horizon === 1825 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            5 Yr
          </button>
        </div>
      </div>

      {/* Scenario Toggles */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-slate-400 text-[11px] font-sans">Active Projections:</span>
        {scenarios.map((sc) => {
          const isActive = selectedScenarios[sc.id];
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => toggleScenario(sc.id)}
              className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? sc.color : '#475569' }}
              />
              <span>{sc.name}</span>
            </button>
          );
        })}
      </div>

      {/* Recharts Multi-Scenario Trajectory Line Chart */}
      <div className="h-72 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={['auto', 'auto']}
              unit=" km"
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '0.75rem',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7)',
              }}
              formatter={(val: any, name: any) => {
                const sc = scenarios.find((s) => s.id === name);
                const title = sc ? sc.name : name;
                return [`${Number(val).toFixed(1)} km`, title];
              }}
              labelFormatter={(lbl) => `Mission Epoch ${lbl}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
              formatter={(val) => {
                const sc = scenarios.find((s) => s.id === val);
                return <span style={{ color: sc?.color }}>{sc?.name ?? val}</span>;
              }}
            />

            {/* Critical Re-entry Horizon Line (180 km) */}
            <ReferenceLine
              y={180}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'CRITICAL RE-ENTRY HORIZON (180 km)',
                fill: '#ef4444',
                fontSize: 10,
                position: 'top',
              }}
            />

            {/* Current Satellite Altitude Reference Line */}
            <ReferenceLine
              y={Number(currentAltKm.toFixed(1))}
              stroke="#38bdf8"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{
                value: `Current Alt: ${currentAltKm.toFixed(1)} km`,
                fill: '#38bdf8',
                fontSize: 10,
                position: 'insideBottomRight',
              }}
            />

            {/* Active Curves */}
            {scenarios.map((sc) => {
              if (!selectedScenarios[sc.id]) return null;
              return (
                <Line
                  key={sc.id}
                  type="monotone"
                  dataKey={sc.id}
                  name={sc.id}
                  stroke={sc.color}
                  strokeWidth={sc.id === 'current' ? 2.5 : 1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scenario Lifetime Comparison Diagnostic Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
        {scenarios.map((sc) => {
          const lifetimeYrs = (sc.lifetimeDays / 365.25).toFixed(1);
          const isDeorbitSoon = sc.lifetimeDays < 365;

          return (
            <div
              key={sc.id}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.color }} />
                  <span className="text-[10px] text-slate-300 font-sans truncate">{sc.name}</span>
                </div>
                <div className="text-sm font-bold mt-1 text-slate-100">
                  {sc.lifetimeDays >= 1825 ? '> 5.0 Years' : `${lifetimeYrs} Yrs (${sc.lifetimeDays}d)`}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                {isDeorbitSoon ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Rapid Decay
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Nominal Stable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
