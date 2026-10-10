import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { ThermalNodeId, ThermalNode } from '../../types/telemetry';
import {
  Table,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Cpu,
  Layers,
  Thermometer,
  ShieldCheck,
} from 'lucide-react';

export const ThermalNodeMatrix: React.FC = () => {
  const thermal = useSimulatorStore((s) => s.thermal);
  const nodes = thermal.nodes;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOMINAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Nominal
          </span>
        );
      case 'HOT_WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Hot Warning
          </span>
        );
      case 'COLD_WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-cyan-400" /> Cold Warning
          </span>
        );
      case 'CRITICAL_HOT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Critical Hot
          </span>
        );
      case 'CRITICAL_COLD':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/50 animate-pulse flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3 text-indigo-400" /> Critical Cold
          </span>
        );
      default:
        return null;
    }
  };

  const getMargin = (node: ThermalNode) => {
    const marginToMin = node.temperatureC - node.minOperatingTempC;
    const marginToMax = node.maxOperatingTempC - node.temperatureC;
    const minMargin = Math.min(marginToMin, marginToMax);
    const isColdLimiting = marginToMin < marginToMax;

    return {
      margin: minMargin,
      text: `${minMargin.toFixed(1)}°C (${isColdLimiting ? 'to Low' : 'to High'})`,
      isWarning: minMargin < 5.0,
      isCritical: minMargin < 0.0,
    };
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Spacecraft Component Thermal Envelope & Safety Margins
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational boundary margins, heat capacities, and electrical waste dissipation for all CubeSat nodes.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Total Internal Dissipation: <span className="text-amber-400 font-bold">
            {Object.values(nodes).reduce((acc, n) => acc + n.internalHeatDissipationW, 0).toFixed(2)} W
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400">
              <th className="py-3 px-4">Thermal Node</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Current Temp</th>
              <th className="py-3 px-3">Operational Limits</th>
              <th className="py-3 px-3">Survival Limits</th>
              <th className="py-3 px-3">Safety Margin</th>
              <th className="py-3 px-3">Heat Dissipation</th>
              <th className="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {(Object.keys(nodes) as ThermalNodeId[]).map((id) => {
              const node = nodes[id];
              const margin = getMargin(node);

              return (
                <tr key={id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                      <span>{node.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-400">
                    {node.category.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-white text-sm">
                      {node.temperatureC.toFixed(1)}°C
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {node.rateOfTempChangeCPerMin >= 0 ? '+' : ''}{node.rateOfTempChangeCPerMin.toFixed(2)}°C/m
                    </span>
                  </td>
                  <td className="py-3 px-3 text-cyan-300 font-medium">
                    {node.minOperatingTempC}°C to {node.maxOperatingTempC}°C
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {node.minSurvivalTempC}°C to {node.maxSurvivalTempC}°C
                  </td>
                  <td className="py-3 px-3">
                    <span className={margin.isCritical ? 'text-rose-400 font-bold' : margin.isWarning ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                      {margin.text}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-amber-400 font-semibold">
                      +{node.internalHeatDissipationW.toFixed(2)} W
                    </span>
                    {node.heaterActive && (
                      <span className="block text-[9px] text-amber-300 font-bold">
                        🔥 HEATER ON
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(node.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
