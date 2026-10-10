import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Sun,
  Zap,
  Globe,
  Radio,
  Cpu,
  Layers,
  Flame,
  ArrowRight,
} from 'lucide-react';

export const HeatBalanceSankey: React.FC = () => {
  const thermal = useSimulatorStore((s) => s.thermal);
  const eps = useSimulatorStore((s) => s.eps);
  const comms = useSimulatorStore((s) => s.comms);
  const propulsion = useSimulatorStore((s) => s.propulsion);

  const env = thermal.environment;
  const nodes = thermal.nodes;

  const totalIn = env.totalHeatInputW;
  const totalOut = env.totalHeatRejectedW;
  const netW = env.netThermalImbalanceW;
  const rateCPerMin = env.rateOfSpacecraftTempChangeCPerMin;

  const isHeating = netW > 0.5;
  const isCooling = netW < -0.5;
  const isEquilibrium = !isHeating && !isCooling;

  // Internal dissipation components
  const internalComponents = [
    { name: 'OBC Core & Edge AI', value: nodes['OBC_CORE'].internalHeatDissipationW, icon: Cpu, color: 'text-amber-400' },
    { name: 'LiFePO4 Battery Pack', value: nodes['BATTERY'].internalHeatDissipationW, icon: Zap, color: 'text-emerald-400' },
    { name: 'Comms RF Power Amp', value: nodes['RF_PA'].internalHeatDissipationW, icon: Radio, color: 'text-rose-400' },
    { name: 'Payload Receiver', value: nodes['PAYLOAD_GNSS'].internalHeatDissipationW, icon: Layers, color: 'text-cyan-400' },
    { name: 'ADCS Wheels', value: nodes['ADCS_WHEELS'].internalHeatDissipationW, icon: Flame, color: 'text-purple-400' },
    { name: 'EPS Bus & Structural', value: nodes['CHASSIS'].internalHeatDissipationW, icon: Scale, color: 'text-slate-400' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Spacecraft Global Energy Balance & Dissipation Flow
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Stefan-Boltzmann radiative rejection vs environmental solar and internal avionics dissipation.
          </p>
        </div>

        {/* Equilibrium Status Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {isHeating && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              NET HEATING (+{netW.toFixed(2)} W)
            </span>
          )}
          {isCooling && (
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 font-bold">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              NET COOLING ({netW.toFixed(2)} W)
            </span>
          )}
          {isEquilibrium && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 font-bold">
              <Scale className="w-4 h-4 text-emerald-400" />
              STEADY EQUILIBRIUM ({netW.toFixed(2)} W)
            </span>
          )}
        </div>
      </div>

      {/* Primary Sankey Flow Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left Column: Heat Sources (Inputs) */}
        <div className="md:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-semibold text-amber-300 uppercase font-mono">Heat Inputs (Q_in)</span>
            <span className="text-sm font-bold font-mono text-amber-400">+{totalIn.toFixed(2)} W</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Direct Solar Flux:
              </span>
              <span className="font-bold text-amber-400">+{env.solarFluxDirectW.toFixed(2)} W</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" /> Earth Albedo:
              </span>
              <span className="font-bold text-cyan-400">+{env.earthAlbedoFluxW.toFixed(2)} W</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-emerald-400" /> Earth Longwave IR:
              </span>
              <span className="font-bold text-emerald-400">+{env.earthIRFluxW.toFixed(2)} W</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-rose-400" /> Active Electronics Waste:
              </span>
              <span className="font-bold text-rose-400">
                +{(totalIn - env.solarFluxDirectW - env.earthAlbedoFluxW - env.earthIRFluxW).toFixed(2)} W
              </span>
            </div>
          </div>
        </div>

        {/* Center: Spacecraft Net Balance Core */}
        <div className="md:col-span-2 flex flex-col items-center justify-center p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 text-center gap-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Net ΔQ Balance</div>
          <div className={`text-2xl font-mono font-bold ${isHeating ? 'text-amber-400' : isCooling ? 'text-cyan-400' : 'text-emerald-400'}`}>
            {netW >= 0 ? '+' : ''}{netW.toFixed(2)} W
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Bulk dT/dt:
          </div>
          <div className="text-xs font-mono font-semibold text-white">
            {rateCPerMin >= 0 ? '+' : ''}{rateCPerMin.toFixed(3)} °C/min
          </div>
        </div>

        {/* Right Column: Heat Rejection (Outputs) */}
        <div className="md:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-semibold text-cyan-300 uppercase font-mono">Heat Rejections (Q_out)</span>
            <span className="text-sm font-bold font-mono text-cyan-400">-{totalOut.toFixed(2)} W</span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Radiator Louver Rejection:
              </span>
              <span className="font-bold text-cyan-400">
                -{nodes['RADIATOR'].radiativeRejectionW.toFixed(2)} W
              </span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-indigo-400" /> Solar Arrays Space Radiation:
              </span>
              <span className="font-bold text-indigo-400">
                -{nodes['SOLAR_PANELS'].radiativeRejectionW.toFixed(2)} W
              </span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Scale className="w-3.5 h-3.5 text-slate-400" /> Chassis Structural MLI Loss:
              </span>
              <span className="font-bold text-slate-400">
                -{nodes['CHASSIS'].radiativeRejectionW.toFixed(2)} W
              </span>
            </div>

            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 text-[11px]">Deep Space Heat Sink:</span>
              <span className="text-slate-300 text-[11px]">3 Kelvin (-270.15°C)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Component Waste Heat Mini-Cards */}
      <div>
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
          Internal Active Component Thermal Dissipation Breakdown:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {internalComponents.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                  <Icon className={`w-3 h-3 ${item.color}`} />
                  <span className="truncate">{item.name}</span>
                </div>
                <div className={`text-base font-mono font-bold ${item.color}`}>
                  +{item.value.toFixed(2)} W
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
