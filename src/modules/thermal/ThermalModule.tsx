import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { CubeSatThermalCutaway } from '../../components/thermal/CubeSatThermalCutaway';
import { SolarNightCycleVisualizer } from '../../components/thermal/SolarNightCycleVisualizer';
import { HeatBalanceSankey } from '../../components/thermal/HeatBalanceSankey';
import { DissipationControlsPanel } from '../../components/thermal/DissipationControlsPanel';
import { ThermalHistoryChart } from '../../components/thermal/ThermalHistoryChart';
import { ThermalNodeMatrix } from '../../components/thermal/ThermalNodeMatrix';
import {
  Thermometer,
  Sun,
  Moon,
  Sliders,
  Scale,
  Activity,
  Layers,
  Zap,
  Cpu,
  Flame,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export type ThermalSubView = 'OVERVIEW' | 'CONTROLS' | 'ANALYSIS';

export const ThermalModule: React.FC = () => {
  const [activeSubView, setActiveSubView] = useState<ThermalSubView>('OVERVIEW');
  const thermal = useSimulatorStore((s) => s.thermal);
  const orbit = useSimulatorStore((s) => s.orbit);

  const isUmbra = orbit.eclipseState === 'UMBRA';
  const isPenumbra = orbit.eclipseState === 'PENUMBRA';
  const isSunlight = orbit.eclipseState === 'SUNLIGHT';

  const controls = thermal.controls;
  const env = thermal.environment;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner with Quick Subsystem State & Mode Indicator */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Thermal Control System (TCS) & Component Heat Dissipation
            </h2>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] font-mono text-cyan-400">Multi-Node Lumped Capacitance</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Real-time orbital thermodynamic modeling with solar flux absorption, Earth albedo, planetary infrared, and Stefan-Boltzmann radiative rejection. Features variable radiator louvers, survival patch heaters, pyrolytic heat pipe straps, and active component thermal derating.
          </p>
        </div>

        {/* Illumination & Thermostat Mode Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-mono">Solar Lighting Regime:</div>
            <div className="text-xs font-semibold font-mono">
              {isUmbra && <span className="text-indigo-400 flex items-center gap-1 justify-end"><Moon className="w-3.5 h-3.5" /> UMBRA (Night)</span>}
              {isPenumbra && <span className="text-amber-400 flex items-center gap-1 justify-end"><Sun className="w-3.5 h-3.5" /> PENUMBRA</span>}
              {isSunlight && <span className="text-yellow-400 flex items-center gap-1 justify-end"><Sun className="w-3.5 h-3.5" /> DIRECT SUNLIGHT</span>}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-mono">Louver Shutter:</div>
            <div className="text-xs font-mono font-bold text-cyan-400">
              {controls.louverAperturePercent.toFixed(0)}% Open
            </div>
          </div>
        </div>
      </div>

      {/* Critical Thermal Alert Banner if warning detected */}
      {thermal.hasThermalWarning && (
        <div className="bg-rose-950/40 border border-rose-500/60 rounded-xl p-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                <span>Spacecraft Thermal Boundary Warning</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] border border-rose-500/40">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                One or more internal components have exceeded nominal operating boundaries. Adjust radiator louvers or verify survival patch heater settings.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubView('CONTROLS')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs font-mono text-rose-300 hover:bg-rose-500/30 transition-all shrink-0"
          >
            Open Controls
          </button>
        </div>
      )}

      {/* Top Telemetry KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Internal Mean Temperature */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Mean Core Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {thermal.internalMeanTempC.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Target Setpoint: {controls.louverTargetTempC.toFixed(1)}°C
          </div>
        </div>

        {/* KPI 2: Battery Pack Temperature */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Battery Pack</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {thermal.batteryTempC.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Safe: 0°C to 45°C {thermal.nodes['BATTERY'].heaterActive ? '(Heater On)' : ''}
          </div>
        </div>

        {/* KPI 3: OBC Core & Edge AI */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>OBC Core</span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-1">
            {thermal.obcTempC.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            {thermal.thermalDeratingActive ? 'Throttled (-45%)' : 'Nominal Clock'}
          </div>
        </div>

        {/* KPI 4: Direct Solar Flux */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Solar Flux</span>
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-yellow-400 mt-1">
            {env.solarIrradianceWPerM2.toFixed(0)} <span className="text-xs font-normal text-slate-400">W/m²</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Absorbed: {env.solarFluxDirectW.toFixed(1)} W
          </div>
        </div>

        {/* KPI 5: Radiator Louver Rejection */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Radiator Louver</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
            {controls.louverAperturePercent.toFixed(0)}% <span className="text-xs font-normal text-slate-400">open</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            Temp: {thermal.radiatorTempC.toFixed(1)}°C
          </div>
        </div>

        {/* KPI 6: Global Net Energy Imbalance */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Net Balance ΔQ</span>
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-2xl font-mono font-bold mt-1 ${env.netThermalImbalanceW >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
            {env.netThermalImbalanceW >= 0 ? '+' : ''}{env.netThermalImbalanceW.toFixed(1)} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">
            dT/dt: {env.rateOfSpacecraftTempChangeCPerMin >= 0 ? '+' : ''}{env.rateOfSpacecraftTempChangeCPerMin.toFixed(2)} °C/m
          </div>
        </div>
      </div>

      {/* Sub-View Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/70 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveSubView('OVERVIEW')}
          className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubView === 'OVERVIEW'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cross-Section & Solar Cycles</span>
        </button>

        <button
          onClick={() => setActiveSubView('CONTROLS')}
          className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubView === 'CONTROLS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Heat Dissipation Controls</span>
        </button>

        <button
          onClick={() => setActiveSubView('ANALYSIS')}
          className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all flex items-center gap-2 ${
            activeSubView === 'ANALYSIS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Temperature History & Envelopes</span>
        </button>
      </div>

      {/* Tab 1: Overview & Blueprint Cutaway */}
      {activeSubView === 'OVERVIEW' && (
        <div className="flex flex-col gap-5">
          <CubeSatThermalCutaway />
          <SolarNightCycleVisualizer />
          <HeatBalanceSankey />
        </div>
      )}

      {/* Tab 2: Heat Dissipation Controls Suite */}
      {activeSubView === 'CONTROLS' && (
        <div className="flex flex-col gap-5">
          <DissipationControlsPanel />
          <HeatBalanceSankey />
          <CubeSatThermalCutaway />
        </div>
      )}

      {/* Tab 3: Detailed Telemetry Analysis & Component Matrix */}
      {activeSubView === 'ANALYSIS' && (
        <div className="flex flex-col gap-5">
          <ThermalHistoryChart />
          <ThermalNodeMatrix />
        </div>
      )}
    </div>
  );
};
