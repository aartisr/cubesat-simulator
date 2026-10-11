import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ChartInteractionHint, ChartNavigator } from '../charts/ChartNavigator';
import { ChartViewport } from '../charts/ChartViewport';
import { Activity, Thermometer, ShieldAlert, Clock } from 'lucide-react';

export const ThermalHistoryChart: React.FC = () => {
  const history = useSimulatorStore((s) => s.history);
  const thermal = useSimulatorStore((s) => s.thermal);

  // Transform telemetry history points into chart points
  const chartData = history.slice(-60).map((pt, idx) => {
    return {
      time: `${Math.round(pt.timeSec)}s`,
      internalTemp: Number((pt.internalTempC ?? 21.5).toFixed(1)),
      batteryTemp: Number((pt.batteryTempC ?? 19.5).toFixed(1)),
      solarPanelTemp: Number((pt.solarPanelTempC ?? 35.0).toFixed(1)),
      radiatorTemp: Number((pt.radiatorTempC ?? 12.0).toFixed(1)),
      solarFlux: Number((pt.solarFluxW_M2 ?? 1361.0).toFixed(0)),
    };
  });

  // If history is still short, provide initial fallback point so chart renders
  const data = chartData.length > 0 ? chartData : [
    {
      time: '0s',
      internalTemp: thermal.internalMeanTempC,
      batteryTemp: thermal.batteryTempC,
      solarPanelTemp: thermal.solarPanelTempC,
      radiatorTemp: thermal.radiatorTempC,
      solarFlux: thermal.environment.solarIrradianceWPerM2,
    },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Multi-Node Temperature History & Orbital Cycle Trends
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time transient thermodynamic curves showing internal core, battery, radiator, and external array response across orbital day/night cycles.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Battery: {thermal.batteryTempC.toFixed(1)}°C
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Core: {thermal.internalMeanTempC.toFixed(1)}°C
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Radiator: {thermal.radiatorTempC.toFixed(1)}°C
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <ChartViewport title="Thermal history" className="h-64 w-full rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 sm:h-72">
        <ChartInteractionHint compact />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              fontFamily="monospace"
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={[-60, 90]}
              tickLine={false}
              fontFamily="monospace"
              tickFormatter={(v) => `${v}°C`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
            />

            {/* Critical Thermal Reference Thresholds */}
            <ReferenceLine y={0} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Battery Freeze (0°C)', fill: '#818cf8', fontSize: 10, position: 'insideBottomLeft' }} />
            <ReferenceLine y={45} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Battery Max (45°C)', fill: '#fbbf24', fontSize: 10, position: 'insideTopLeft' }} />
            <ReferenceLine y={65} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'OBC Limit (65°C)', fill: '#f87171', fontSize: 10, position: 'insideTopLeft' }} />

            {/* Lines */}
            <Line
              type="monotone"
              dataKey="batteryTemp"
              name="Battery Pack"
              stroke="#10b981"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="internalTemp"
              name="Internal Core"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="radiatorTemp"
              name="Radiator Louvers"
              stroke="#06b6d4"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="solarPanelTemp"
              name="External Arrays"
              stroke="#38bdf8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
            />
            <ChartNavigator dataKey="time" />
          </LineChart>
        </ResponsiveContainer>
      </ChartViewport>

      {/* Safety Bounds Guidance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Battery Operating Band:</span>
          <span className="text-emerald-400 font-semibold">0.0°C to 45.0°C</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Avionics Core Limit:</span>
          <span className="text-amber-400 font-semibold">-20.0°C to 65.0°C</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Exterior Skin Swing:</span>
          <span className="text-cyan-400 font-semibold">-65.0°C to 85.0°C</span>
        </div>
      </div>
    </div>
  );
};
