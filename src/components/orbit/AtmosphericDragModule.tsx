import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { HarrisPriesterPhysics } from '../../core/math/harrisPriester';
import { OrbitalDecayChart } from './OrbitalDecayChart';
import { DiurnalBulgeDiagram } from './DiurnalBulgeDiagram';
import {
  Wind,
  Sun,
  Flame,
  Gauge,
  Sliders,
  RotateCcw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  ArrowDownRight,
  TrendingDown,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { DragAttitudePreset } from '../../types/telemetry';

type ActiveViewTab = 'DECAY_PROJECTION' | 'DIURNAL_RADAR' | 'TELEMETRY_LOG';

export const AtmosphericDragModule: React.FC = () => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const dragTelemetry = useSimulatorStore((s) => s.dragTelemetry);
  const dragParams = useSimulatorStore((s) => s.dragParameters);
  const enableDrag = useSimulatorStore((s) => s.enableAtmosphericDrag);
  const setEnableDrag = useSimulatorStore((s) => s.setEnableAtmosphericDrag);
  const setDragParams = useSimulatorStore((s) => s.setDragParameters);
  const setDragAttitude = useSimulatorStore((s) => s.setDragAttitudePreset);
  const resetAccumulator = useSimulatorStore((s) => s.resetDragAccumulator);
  const executeReboost = useSimulatorStore((s) => s.executeDragReboostManeuver);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const history = useSimulatorStore((s) => s.history);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);

  const [activeTab, setActiveTab] = useState<ActiveViewTab>('DECAY_PROJECTION');

  const currentAltKm = orbit.geodetic.altitude;

  // Re-boost Delta-V requirement to counteract atmospheric drag
  const reboostReq = HarrisPriesterPhysics.calculateReboostRequirement(
    dragTelemetry.semiMajorAxisDecayMetersDay,
    currentAltKm,
    propulsion.config.thrustMilliNewtons,
    propulsion.config.specificImpulseSec
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Master Atmospheric Drag Control Panel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Harris-Priester Atmospheric Drag & Orbital Decay Module
            </h2>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] font-mono text-cyan-400">Thermosphere / Exosphere</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Real-time thermospheric density modeling with diurnal atmospheric bulge (+30° East solar lag), Earth co-rotation kinematics, and secular semi-major axis orbital decay coupling.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${enableDrag ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              Drag Coupling: {enableDrag ? 'Active Secular Decay' : 'Decay Suspended'}
            </span>
            <span>·</span>
            <span>Ballistic Coeff: {dragTelemetry.ballisticCoefficientKgM2.toFixed(1)} kg/m²</span>
            <span>·</span>
            <span>Solar Flux: {dragParams.f107SolarFlux} sfu</span>
            <span>·</span>
            <span>
              Cumulative Lost: {dragTelemetry.cumulativeAltitudeLossMeters > 1000
                ? `${(dragTelemetry.cumulativeAltitudeLossMeters / 1000).toFixed(3)} km`
                : `${dragTelemetry.cumulativeAltitudeLossMeters.toFixed(1)} m`}
            </span>
          </div>
        </div>

        {/* Tactile Mode Quick Toggles & Reset */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 shadow-inner">
          <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setEnableDrag(true)}
              className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                enableDrag
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enableDrag ? 'bg-cyan-400' : 'bg-slate-600'}`} />
              <span>Drag On</span>
            </button>
            <button
              type="button"
              onClick={() => setEnableDrag(false)}
              className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                !enableDrag
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!enableDrag ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span>Decay Off</span>
            </button>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-800" />

          {/* Reset Accumulator */}
          <button
            type="button"
            onClick={resetAccumulator}
            title="Reset accumulated altitude loss"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Δh</span>
          </button>
        </div>
      </div>

      {/* 2. Key Harris-Priester Telemetry Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {/* Card 1: Local Harris-Priester Density */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
              <span>Harris-Priester Density (ρ)</span>
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-cyan-300 mt-1">
              {dragTelemetry.densityKgM3.toExponential(3)} kg/m³
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 border-t border-slate-900 pt-1.5">
            <div className="flex justify-between">
              <span>Diurnal Ratio:</span>
              <span className="text-slate-300">{dragTelemetry.diurnalRatio.toFixed(2)}× over night</span>
            </div>
            <div className="flex justify-between">
              <span>Scale Height (H):</span>
              <span className="text-slate-400">{dragTelemetry.scaleHeightKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Card 2: Aerodynamic Drag Acceleration & Force */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
              <span>Drag Acceleration (a_drag)</span>
              <Wind className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-amber-300 mt-1">
              {dragTelemetry.dragDecelMicroG < 0.01
                ? `${(dragTelemetry.dragDecelMagnitudeMs2 * 1e6).toFixed(3)} μm/s²`
                : `${dragTelemetry.dragDecelMicroG.toFixed(3)} μg`}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 border-t border-slate-900 pt-1.5">
            <div className="flex justify-between">
              <span>Aerodynamic Force:</span>
              <span className="text-slate-300">{dragTelemetry.dragForceMicroN.toFixed(2)} μN</span>
            </div>
            <div className="flex justify-between">
              <span>Dynamic Pressure (q):</span>
              <span className="text-slate-400">{(dragTelemetry.dynamicPressurePa * 1e6).toFixed(2)} μPa</span>
            </div>
          </div>
        </div>

        {/* Card 3: Instantaneous Secular Decay Rate */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
              <span>Secular Decay Rate (da/dt)</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-300 mt-1">
              {Math.abs(dragTelemetry.semiMajorAxisDecayMetersDay).toFixed(3)} m / day
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 border-t border-slate-900 pt-1.5">
            <div className="flex justify-between">
              <span>Annual Decay Rate:</span>
              <span className="text-slate-300">
                {Math.abs(dragTelemetry.semiMajorAxisDecayKmYear).toFixed(3)} km / yr
              </span>
            </div>
            <div className="flex justify-between">
              <span>Orbital Period Loss:</span>
              <span className="text-slate-400">{dragTelemetry.periodDecayMsPerDay.toFixed(2)} ms / day</span>
            </div>
          </div>
        </div>

        {/* Card 4: Estimated Remaining Lifetime */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase flex items-center justify-between">
              <span>Orbital Lifetime to Re-Entry</span>
              {dragTelemetry.reentryStatus === 'STABLE' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-300 mt-1">
              {dragTelemetry.reentryLifetimeDays > 365
                ? `~${(dragTelemetry.reentryLifetimeDays / 365.25).toFixed(1)} Years`
                : `~${Math.round(dragTelemetry.reentryLifetimeDays)} Days`}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 space-y-0.5 border-t border-slate-900 pt-1.5">
            <div className="flex justify-between">
              <span>Re-Entry Threshold:</span>
              <span className="text-slate-300">180.0 km altitude</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span
                className={
                  dragTelemetry.reentryStatus === 'STABLE'
                    ? 'text-emerald-400'
                    : dragTelemetry.reentryStatus === 'MODERATE_DECAY'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }
              >
                {dragTelemetry.reentryStatus.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visualization Mode Switcher & Chart Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('DECAY_PROJECTION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'DECAY_PROJECTION'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Orbital Decay Projections</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DIURNAL_RADAR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'DIURNAL_RADAR'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Diurnal Bulge Radar (+30° Lag)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Current Perigee: {orbit.elements.perigeeAltitude.toFixed(1)} km</span>
            <span>·</span>
            <span>Apogee: {orbit.elements.apogeeAltitude.toFixed(1)} km</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'DECAY_PROJECTION' && <OrbitalDecayChart />}
        {activeTab === 'DIURNAL_RADAR' && <DiurnalBulgeDiagram />}
      </div>

      {/* 4. Interactive Space Weather, Solar Flux & Satellite Aerodynamic Tuner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Space Weather, Solar Flux & Aerodynamic Cross-Section Tuner
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Real-Time Perturbation Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Parameter 1: Solar 10.7cm Radio Flux (F10.7) */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Solar 10.7cm Flux (F10.7):</span>
                <span className="text-amber-400 font-bold">{dragParams.f107SolarFlux} sfu</span>
              </div>
              <input
                type="range"
                min="65"
                max="350"
                step="5"
                value={dragParams.f107SolarFlux}
                onChange={(e) => setDragParams({ f107SolarFlux: Number(e.target.value) })}
                className="w-full mt-2 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Quick Solar Flux Presets */}
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setDragParams({ f107SolarFlux: 70 })}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.f107SolarFlux === 70
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Min (70 sfu)
              </button>
              <button
                type="button"
                onClick={() => setDragParams({ f107SolarFlux: 145 })}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.f107SolarFlux === 145
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Mean (145 sfu)
              </button>
              <button
                type="button"
                onClick={() => setDragParams({ f107SolarFlux: 220 })}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.f107SolarFlux === 220
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Max (220 sfu)
              </button>
              <button
                type="button"
                onClick={() => setDragParams({ f107SolarFlux: 320 })}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.f107SolarFlux === 320
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Storm (320 sfu)
              </button>
            </div>
          </div>

          {/* Parameter 2: Cross-Section Area & Flight Attitude */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Frontal Area (A):</span>
                <span className="text-cyan-400 font-bold">{dragParams.crossSectionAreaM2.toFixed(3)} m²</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.15"
                step="0.005"
                value={dragParams.crossSectionAreaM2}
                onChange={(e) =>
                  setDragParams({ crossSectionAreaM2: Number(e.target.value), attitudeMode: 'CUSTOM' })
                }
                className="w-full mt-2 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Attitude Presets */}
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setDragAttitude('FEATHERED')}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.attitudeMode === 'FEATHERED'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Feathered ({(selectedSatellite.geometry.nominalDragAreaM2 * 0.55).toFixed(3)})
              </button>
              <button
                type="button"
                onClick={() => setDragAttitude('NOMINAL')}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.attitudeMode === 'NOMINAL'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Nominal {selectedSatellite.formFactor} ({selectedSatellite.geometry.nominalDragAreaM2.toFixed(3)})
              </button>
              <button
                type="button"
                onClick={() => setDragAttitude('BROADSIDE')}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.attitudeMode === 'BROADSIDE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Broadside ({selectedSatellite.geometry.broadsideDragAreaM2.toFixed(3)})
              </button>
              <button
                type="button"
                onClick={() => setDragAttitude('DEORBIT_SAIL')}
                className={`px-1.5 py-1 rounded border text-center transition-colors ${
                  dragParams.attitudeMode === 'DEORBIT_SAIL'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Drag Sail ({Math.max(selectedSatellite.geometry.broadsideDragAreaM2 * 2.5, 0.05).toFixed(3)})
              </button>
            </div>
          </div>

          {/* Parameter 3: Drag Coefficient (Cd) */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Drag Coefficient (C_d):</span>
                <span className="text-slate-200 font-bold">{dragParams.cd.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1.8"
                max="2.8"
                step="0.05"
                value={dragParams.cd}
                onChange={(e) => setDragParams({ cd: Number(e.target.value) })}
                className="w-full mt-2 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
            <div className="text-[10px] text-slate-400 leading-normal">
              CubeSat standard free molecular flow drag coefficient typically ranges between 2.0 (spherical/streamlined) and 2.5 (blunt flat plates).
            </div>
          </div>

          {/* Parameter 4: Bulge Power Exponent (n) & East Lag */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Bulge Exponent (n):</span>
                <span className="text-cyan-400 font-bold">n = {dragParams.hpExponentN}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 font-mono text-xs">
                {[2, 4, 6].map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setDragParams({ hpExponentN: exp })}
                    className={`flex-1 py-1 rounded text-center border transition-colors ${
                      dragParams.hpExponentN === exp
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    n = {exp}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 leading-normal">
              n=2 for low inclination/equatorial orbits; n=6 for high inclination/polar orbits; n=4 is standard nominal LEO.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Coupled ADCS Thruster Re-Boost Station */}
      <div className="bg-slate-900/70 border border-cyan-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Coupled ADCS Thruster Orbital Altitude Re-Boost Station
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Counteract Harris-Priester atmospheric decay by triggering a prograde Δv maneuver from the onboard propulsion system.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 font-mono text-xs">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Monthly Δv Req</span>
              <span className="text-cyan-300 font-bold">{reboostReq.deltaVMsPerMonth.toFixed(3)} m/s</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Monthly Fuel Req</span>
              <span className="text-slate-200 font-bold">{reboostReq.propellantGramsPerMonth.toFixed(2)} g</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Yearly Δv Req</span>
              <span className="text-amber-300 font-bold">{reboostReq.deltaVMsPerYear.toFixed(2)} m/s</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Tank Propellant</span>
              <span className="text-emerald-300 font-bold">{propulsion.propellantMassGrams.toFixed(1)} g remaining</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={executeReboost}
            disabled={propulsion.status === 'FIRING' || propulsion.propellantMassGrams <= 0}
            className={`w-full md:w-auto px-4 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
              propulsion.status === 'FIRING'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 animate-pulse'
                : propulsion.propellantMassGrams <= 0
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/50 hover:shadow-cyan-900/80 cursor-pointer'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>
              {propulsion.status === 'FIRING'
                ? 'BURNING RE-BOOST...'
                : `COMMAND RE-BOOST (+${Math.max(0.1, Number(reboostReq.deltaVMsPerMonth.toFixed(2)))} m/s)`}
            </span>
          </button>
          <span className="text-[10px] font-mono text-slate-400">
            Automatically arms ADCS thruster & executes prograde burn
          </span>
        </div>
      </div>
    </div>
  );
};
