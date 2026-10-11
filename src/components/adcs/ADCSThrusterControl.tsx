import React, { useState, useMemo } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import {
  ManeuverDirection,
  ThrusterManeuverConfig,
} from '../../types/telemetry';
import { PropulsionPhysics } from '../../core/math/propulsion';
import {
  Rocket,
  Zap,
  Gauge,
  Flame,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  BatteryCharging,
  BatteryWarning,
  Activity,
  Compass,
  ArrowUpRight,
  RefreshCw,
  Fuel,
  Sliders,
  History,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartInteractionHint, ChartNavigator } from '../charts/ChartNavigator';
import { ChartViewport } from '../charts/ChartViewport';

export const ADCSThrusterControl: React.FC = () => {
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const orbit = useSimulatorStore((s) => s.orbit);
  const eps = useSimulatorStore((s) => s.eps);
  const adcs = useSimulatorStore((s) => s.adcs);
  const history = useSimulatorStore((s) => s.history);
  const isPlaying = useSimulatorStore((s) => s.isPlaying);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);

  const armThruster = useSimulatorStore((s) => s.armThruster);
  const setThrusterConfig = useSimulatorStore((s) => s.setThrusterConfig);
  const startThrusterManeuver = useSimulatorStore((s) => s.startThrusterManeuver);
  const abortThrusterManeuver = useSimulatorStore((s) => s.abortThrusterManeuver);
  const refuelPropellant = useSimulatorStore((s) => s.refuelPropellant);
  const pulseRCS = useSimulatorStore((s) => s.pulseRCS);

  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'POWER_BUDGET' | 'HISTORY'>('CONTROLS');
  const [pulseAxis, setPulseAxis] = useState<'roll' | 'pitch' | 'yaw'>('yaw');

  const config = propulsion.config;
  const status = propulsion.status;
  const isArmed = status !== 'STANDBY';
  const isPreheating = status === 'PREHEATING';
  const isFiring = status === 'FIRING';
  const isCooldown = status === 'COOLDOWN';
  const activeBurn = propulsion.activeBurn;

  // Feasibility and cost calculation for current configuration
  const maneuverCost = useMemo(() => {
    return PropulsionPhysics.estimateManeuverCost(
      config.targetDeltaVMs,
      config.thrustMilliNewtons,
      config.specificImpulseSec,
      propulsion.propellantMassGrams,
      selectedSatellite.massKg,
      config.valveHeatingEnabled
    );
  }, [config, propulsion.propellantMassGrams, selectedSatellite.massKg]);

  // Power breakdown during firing vs standby
  const powerBreakdown = useMemo(() => {
    return PropulsionPhysics.calculateSubsystemPower(
      status,
      config.valveHeatingEnabled,
      config.thrustMilliNewtons
    );
  }, [status, config]);

  // Projected orbital changes after maneuver
  const projectedOrbitDelta = useMemo(() => {
    const aCurrent = orbit.elements.semiMajorAxis;
    const rApogee = orbit.elements.apogeeAltitude;
    const rPerigee = orbit.elements.perigeeAltitude;

    // Approximate Hohmann / tangential impulse impact: delta_a ≈ 2 * a * (delta_v / v)
    const vMag = Math.sqrt(orbit.velocityECI.x ** 2 + orbit.velocityECI.y ** 2 + orbit.velocityECI.z ** 2);
    const dvKmS = config.targetDeltaVMs / 1000;
    const factor = (2 * aCurrent * dvKmS) / (vMag || 7.6);

    switch (config.direction) {
      case 'PROGRADE':
        return {
          deltaA: +Math.abs(factor),
          deltaApogee: +Math.abs(factor * 2),
          deltaPerigee: +0.2,
          deltaInc: 0,
          description: 'Raises orbit apogee and semi-major axis',
        };
      case 'RETROGRADE':
        return {
          deltaA: -Math.abs(factor),
          deltaApogee: -0.2,
          deltaPerigee: -Math.abs(factor * 2),
          deltaInc: 0,
          description: 'Lowers perigee for atmospheric de-orbiting',
        };
      case 'NORMAL':
        return {
          deltaA: 0,
          deltaApogee: 0,
          deltaPerigee: 0,
          deltaInc: +(dvKmS / vMag) * (180 / Math.PI),
          description: 'Increases orbital plane inclination (northward)',
        };
      case 'ANTI_NORMAL':
        return {
          deltaA: 0,
          deltaApogee: 0,
          deltaPerigee: 0,
          deltaInc: -(dvKmS / vMag) * (180 / Math.PI),
          description: 'Decreases orbital plane inclination (southward)',
        };
      case 'RADIAL_OUT':
        return {
          deltaA: 0,
          deltaApogee: +Math.abs(factor * 0.5),
          deltaPerigee: -Math.abs(factor * 0.5),
          deltaInc: 0,
          description: 'Rotates line of apsides outward (eccentricity shift)',
        };
      case 'RADIAL_IN':
        return {
          deltaA: 0,
          deltaApogee: -Math.abs(factor * 0.5),
          deltaPerigee: +Math.abs(factor * 0.5),
          deltaInc: 0,
          description: 'Rotates line of apsides inward (eccentricity shift)',
        };
    }
  }, [config.direction, config.targetDeltaVMs, orbit]);

  // Maneuver direction buttons
  const directions: { id: ManeuverDirection; label: string; tag: string; desc: string }[] = [
    { id: 'PROGRADE', label: '+V Prograde', tag: 'Boost', desc: 'Tangential forward burn' },
    { id: 'RETROGRADE', label: '-V Retrograde', tag: 'De-orbit', desc: 'Braking burn' },
    { id: 'NORMAL', label: '+W Normal', tag: '+Inc', desc: 'Plane change north' },
    { id: 'ANTI_NORMAL', label: '-W Anti-Normal', tag: '-Inc', desc: 'Plane change south' },
    { id: 'RADIAL_OUT', label: '+R Radial Out', tag: 'Apsides', desc: 'Zenith pointing' },
    { id: 'RADIAL_IN', label: '-R Radial In', tag: 'Apsides', desc: 'Nadir pointing' },
  ];

  // Quick preset maneuvers
  const presets = [
    { label: 'Station-Keep', dv: 0.25, dir: 'PROGRADE' as ManeuverDirection },
    { label: 'Orbit Boost', dv: 1.20, dir: 'PROGRADE' as ManeuverDirection },
    { label: 'De-Orbit Trim', dv: 1.50, dir: 'RETROGRADE' as ManeuverDirection },
    { label: 'Inclination Nudge', dv: 0.40, dir: 'NORMAL' as ManeuverDirection },
    { label: 'Collision Evasion', dv: 0.15, dir: 'PROGRADE' as ManeuverDirection },
  ];

  // Chart data: extract the last 40 history points
  const telemetryPoints = useMemo(() => {
    return history.slice(-40).map((pt, idx) => ({
      time: `${pt.timeSec.toFixed(0)}s`,
      soc: pt.batterySoc,
      thrusterPower: pt.thrusterPowerW ?? 0,
      propellant: pt.propellantGrams ?? propulsion.propellantMassGrams,
      batteryCurrent: pt.batteryCurrentA ?? 0,
      solarPower: pt.solarPowerW,
    }));
  }, [history, propulsion.propellantMassGrams]);

  // Propellant percentage
  const propellantPct = (propulsion.propellantMassGrams / propulsion.propellantCapacityGrams) * 100;

  // Real-time battery impact calculation
  const batteryCurrentDrawA = eps.batteryCurrentA;
  const isDischarging = eps.batteryCurrentA < 0;
  const safeBurnMinutesRemaining = useMemo(() => {
    const marginWh = Math.max(0, eps.batteryRemainingWh - (eps.batteryCapacityWh * 0.40));
    const dischargePowerW = Math.max(0.5, eps.totalLoadPowerW - eps.solarArrayPowerW);
    if (dischargePowerW <= 0) return 999;
    return (marginWh / dischargePowerW) * 60;
  }, [eps]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header & Subsystem Status Banner */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all ${
            isFiring
              ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse shadow-lg shadow-amber-500/20'
              : isPreheating
              ? 'bg-orange-500/20 border-orange-500/70 text-orange-400'
              : isArmed
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
              : 'bg-slate-800/60 border-slate-700 text-slate-400'
          }`}>
            <Rocket className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                ADCS Thruster Control & Propulsion Maneuver Unit
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${
                isFiring
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                  : isPreheating
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                  : isArmed
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : isCooldown
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Micro-resistojet / Cold-gas closed-loop Delta-V thrust vectoring, mass depletion & coupled EPS battery budget.
            </p>
          </div>
        </div>

        {/* Top Control Buttons & Safety Interlock Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Selector */}
          <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('CONTROLS')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'CONTROLS'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Maneuvers
            </button>
            <button
              onClick={() => setActiveTab('POWER_BUDGET')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'POWER_BUDGET'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>EPS Budget</span>
              {isFiring && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log ({propulsion.history.length})
            </button>
          </div>

          {/* Safety Arm Toggle */}
          <button
            onClick={() => {
              if (isFiring || isPreheating) {
                abortThrusterManeuver();
              } else {
                armThruster(!isArmed);
              }
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              isFiring || isPreheating
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 hover:bg-rose-500/30 animate-pulse'
                : isArmed
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isFiring || isPreheating ? (
              <>
                <Square className="w-3.5 h-3.5 text-rose-400" />
                <span>Abort Burn</span>
              </>
            ) : isArmed ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>ARMED</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>ARM Thruster</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Subsystem Status Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-slate-950/40 border-b border-slate-800/80 text-xs font-mono">
        {/* Metric 1: Propellant Tank */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-cyan-400" /> Propellant
            </span>
            <span className="text-cyan-400">{propellantPct.toFixed(1)}%</span>
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            {propulsion.propellantMassGrams.toFixed(1)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">/ {propulsion.propellantCapacityGrams}g</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                propellantPct > 40 ? 'bg-cyan-400' : propellantPct > 15 ? 'bg-amber-400' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, propellantPct)}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Thruster Power Draw */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Thruster Power
            </span>
            <span className={propulsion.currentPowerDrawW > 5 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              {propulsion.currentPowerDrawW > 0 ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">
            {propulsion.currentPowerDrawW.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">Watts</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Valves: {powerBreakdown.valvesPowerW.toFixed(1)}W | Htrs: {powerBreakdown.heatersPowerW.toFixed(1)}W
          </div>
        </div>

        {/* Metric 3: Chamber Temp */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-400" /> Chamber Temp
            </span>
            <span className={propulsion.chamberTempC > 100 ? 'text-rose-400' : 'text-slate-400'}>
              {propulsion.chamberTempC > 160 ? 'HOT' : 'NOMINAL'}
            </span>
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            +{propulsion.chamberTempC.toFixed(1)}°C
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Target: {config.valveHeatingEnabled ? '240°C' : '22°C'}
          </div>
        </div>

        {/* Metric 4: Thrust Force */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-400" /> Thrust Output
            </span>
            <span className="text-emerald-400">{config.specificImpulseSec}s Isp</span>
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {propulsion.currentThrustMilliN.toFixed(1)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">mN</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Flow: {(propulsion.currentMassFlowRateGramsPerSec * 1000).toFixed(1)} mg/s
          </div>
        </div>

        {/* Metric 5: Cumulative Delta-V */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-400" /> Mission ΔV
            </span>
            <span className="text-indigo-400">Total</span>
          </div>
          <div className="text-sm font-bold text-white mt-0.5">
            {propulsion.cumulativeDeltaVMs.toFixed(3)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">m/s</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Used: {propulsion.totalPropellantConsumedGrams.toFixed(2)}g prop
          </div>
        </div>

        {/* Metric 6: EPS Net Load & Battery Current */}
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-amber-400" /> EPS Net Balance
            </span>
            <span className={isDischarging ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {isDischarging ? 'DRAINING' : 'CHARGING'}
            </span>
          </div>
          <div className={`text-sm font-bold mt-0.5 ${batteryCurrentDrawA >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {batteryCurrentDrawA >= 0 ? `+${batteryCurrentDrawA.toFixed(2)}` : batteryCurrentDrawA.toFixed(2)}{' '}
            <span className="text-[10px] text-slate-400 font-normal">A ({eps.batterySocPercent.toFixed(1)}%)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Total Load: {eps.totalLoadPowerW.toFixed(1)}W
          </div>
        </div>
      </div>

      {/* Main Content Area based on Active Tab */}
      {activeTab === 'CONTROLS' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Maneuver Configuration & Execution (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Active Burn Banner if in progress */}
            {activeBurn && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/60 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Active Burn In Progress ({activeBurn.direction})
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {activeBurn.achievedDeltaVMs.toFixed(3)} / {activeBurn.targetDeltaVMs.toFixed(3)} m/s
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-200"
                    style={{
                      width: `${Math.min(100, (activeBurn.achievedDeltaVMs / Math.max(0.01, activeBurn.targetDeltaVMs)) * 100)}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2">
                  <span>Burn Elapsed: {activeBurn.durationElapsedSec.toFixed(1)}s / ~{activeBurn.durationPlannedSec.toFixed(1)}s</span>
                  <span>Chamber Temp: +{propulsion.chamberTempC.toFixed(1)}°C</span>
                  <button
                    onClick={abortThrusterManeuver}
                    className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500 text-[10px] font-bold"
                  >
                    EMERGENCY CUTOFF
                  </button>
                </div>
              </div>
            )}

            {/* Maneuver Direction Selector */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Thrust Vector Direction
                </span>
                <span className="text-[11px] font-mono text-cyan-400">{config.direction}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {directions.map((d) => {
                  const isSelected = config.direction === d.id;
                  return (
                    <button
                      key={d.id}
                      disabled={isFiring || isPreheating}
                      onClick={() => setThrusterConfig({ direction: d.id })}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500/70 text-cyan-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      } ${isFiring || isPreheating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{d.label}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono text-slate-300">
                          {d.tag}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{d.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Delta-V and Propulsion Parameters */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Maneuver Delta-V (ΔV) Magnitude
                </span>
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-base font-bold text-amber-400">{config.targetDeltaVMs.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">m/s</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0.05"
                max="5.0"
                step="0.05"
                disabled={isFiring || isPreheating}
                value={config.targetDeltaVMs}
                onChange={(e) => setThrusterConfig({ targetDeltaVMs: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    disabled={isFiring || isPreheating}
                    onClick={() => setThrusterConfig({ targetDeltaVMs: p.dv, direction: p.dir })}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
                  >
                    {p.label} ({p.dv} m/s)
                  </button>
                ))}
              </div>

              {/* Additional Propulsion Hardware Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                {/* Thrust Force Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Thrust Level (mN)</label>
                  <select
                    disabled={isFiring || isPreheating}
                    value={config.thrustMilliNewtons}
                    onChange={(e) => setThrusterConfig({ thrustMilliNewtons: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value={25}>25 mN (Low Impulse)</option>
                    <option value={50}>50 mN (Nominal)</option>
                    <option value={100}>100 mN (Fast Burn)</option>
                  </select>
                </div>

                {/* Specific Impulse Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Specific Impulse (Isp)</label>
                  <select
                    disabled={isFiring || isPreheating}
                    value={config.specificImpulseSec}
                    onChange={(e) => setThrusterConfig({ specificImpulseSec: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value={68}>68 s (Cold Gas N2)</option>
                    <option value={110}>110 s (Resistojet Standard)</option>
                    <option value={200}>200 s (Superheated Core)</option>
                  </select>
                </div>

                {/* Preheating Toggle */}
                <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                  <button
                    disabled={isFiring || isPreheating}
                    onClick={() => setThrusterConfig({ valveHeatingEnabled: !config.valveHeatingEnabled })}
                    className={`px-2 py-1 rounded border text-xs font-mono transition-all flex items-center justify-between ${
                      config.valveHeatingEnabled
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Pre-heat Chamber</span>
                    <span className="text-[10px] font-bold">{config.valveHeatingEnabled ? '+6.5W' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fire Action & Feasibility Gate */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Burn Duration:</span>
                  <span className="font-mono text-white font-semibold">{maneuverCost.burnDurationSec} sec</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">Propellant:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{maneuverCost.propellantRequiredGrams} g</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Est. Energy:</span>
                  <span className="font-mono text-amber-300 font-semibold">{maneuverCost.estimatedEnergyWh} Wh</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">Battery Drain:</span>
                  <span className="font-mono text-rose-300 font-semibold">~{maneuverCost.estimatedBatteryDrainSocPercent}% SoC</span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  disabled={!isArmed || isFiring || isPreheating || propulsion.propellantMassGrams <= 0}
                  onClick={startThrusterManeuver}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                    isFiring
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : isPreheating
                      ? 'bg-orange-500 text-slate-950 animate-pulse'
                      : !isArmed
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : propulsion.propellantMassGrams <= 0
                      ? 'bg-rose-950 text-rose-400 border border-rose-800 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 shadow-cyan-500/20'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  <span>
                    {isFiring
                      ? 'Firing Maneuver...'
                      : isPreheating
                      ? 'Preheating Nozzle...'
                      : !isArmed
                      ? 'Thruster Disarmed'
                      : 'Execute Burn'}
                  </span>
                </button>
              </div>
            </div>

            {/* ADCS RCS Impulse Section for Attitude Desaturation */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  ADCS Micro-RCS Impulse Pulse (Desaturation)
                </span>
                <span className="text-[10px] font-mono text-slate-400">0.04g Prop / Pulse</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                  {(['roll', 'pitch', 'yaw'] as const).map((ax) => (
                    <button
                      key={ax}
                      onClick={() => setPulseAxis(ax)}
                      className={`px-2.5 py-1 rounded uppercase font-mono font-medium text-[11px] ${
                        pulseAxis === ax ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                      }`}
                    >
                      {ax}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={propulsion.propellantMassGrams < 0.05}
                    onClick={() => pulseRCS(pulseAxis, -1)}
                    className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono font-semibold"
                  >
                    Pulse -{pulseAxis.toUpperCase()}
                  </button>
                  <button
                    disabled={propulsion.propellantMassGrams < 0.05}
                    onClick={() => pulseRCS(pulseAxis, 1)}
                    className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono font-semibold"
                  >
                    Pulse +{pulseAxis.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Physical Thruster Diagram & Projected Orbital Impact (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Projected Keplerian Orbit Impact Card */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Projected Orbital Shift
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">ΔV = {config.targetDeltaVMs} m/s</span>
              </div>

              <p className="text-[11px] text-slate-400 mb-3 italic">
                {projectedOrbitDelta.description}
              </p>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Semi-Major Axis (a):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{orbit.elements.semiMajorAxis.toFixed(1)} km</span>
                    <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300 font-bold">
                      {(orbit.elements.semiMajorAxis + projectedOrbitDelta.deltaA).toFixed(1)} km
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      ({projectedOrbitDelta.deltaA >= 0 ? `+${projectedOrbitDelta.deltaA.toFixed(2)}` : projectedOrbitDelta.deltaA.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Apogee Altitude:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{orbit.elements.apogeeAltitude.toFixed(1)} km</span>
                    <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300 font-bold">
                      {(orbit.elements.apogeeAltitude + projectedOrbitDelta.deltaApogee).toFixed(1)} km
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-slate-400">Perigee Altitude:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300">{orbit.elements.perigeeAltitude.toFixed(1)} km</span>
                    <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300 font-bold">
                      {(orbit.elements.perigeeAltitude + projectedOrbitDelta.deltaPerigee).toFixed(1)} km
                    </span>
                  </div>
                </div>

                {Math.abs(projectedOrbitDelta.deltaInc) > 0.001 && (
                  <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                    <span className="text-slate-400">Inclination (i):</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{orbit.elements.inclination.toFixed(2)}°</span>
                      <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300 font-bold">
                        {(orbit.elements.inclination + projectedOrbitDelta.deltaInc).toFixed(2)}°
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thruster Nozzle Visual Schematic */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  CubeSat Micro-Propulsion Chamber
                </span>
                <span className="text-[11px] font-mono text-cyan-400">VACCO 0.5U ARCHITECTURE</span>
              </div>

              {/* Graphic Chamber and Plume */}
              <div className="py-4 relative flex flex-col items-center">
                {/* CubeSat Body Representation */}
                <div className="w-36 h-20 bg-slate-900 border-2 border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-lg relative">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{selectedSatellite.formFactor} CUBESAT BUS</span>
                  <span className="text-[9px] font-mono text-cyan-400">Mass: {(selectedSatellite.massKg + propulsion.propellantMassGrams / 1000).toFixed(2)} kg</span>

                  {/* Reaction Wheels icon */}
                  <div className="absolute top-1 right-2 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <RotateCcw className="w-2.5 h-2.5 text-cyan-500" /> RWA
                  </div>
                </div>

                {/* Nozzle Cone */}
                <div
                  className={`w-12 h-8 border-l-2 border-r-2 border-b-2 rounded-b-xl transition-all duration-300 relative flex items-center justify-center ${
                    isFiring
                      ? 'bg-amber-500/40 border-amber-400 shadow-lg shadow-amber-500/50'
                      : isPreheating
                      ? 'bg-orange-500/20 border-orange-400'
                      : 'bg-slate-800 border-slate-600'
                  }`}
                  style={{
                    clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-all ${
                      isFiring
                        ? 'bg-amber-300 animate-ping'
                        : isPreheating
                        ? 'bg-orange-400'
                        : 'bg-slate-700'
                    }`}
                  />
                </div>

                {/* Animated Exhaust Plume Glow if firing */}
                {isFiring && (
                  <div className="w-20 h-16 bg-gradient-to-b from-amber-400 via-cyan-400 to-transparent blur-sm rounded-full mt-0.5 animate-pulse opacity-90" />
                )}

                {/* Thrust Vector Arrow Indicator */}
                <div className="mt-2 text-center font-mono">
                  <div className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                    {config.direction} VECTOR
                  </div>
                  <div className="text-[10px] text-slate-400">
                    F = {isFiring ? config.thrustMilliNewtons : 0} mN • Isp = {config.specificImpulseSec}s
                  </div>
                </div>
              </div>

              {/* Tank Controls */}
              <div className="w-full pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Fuel className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tank Level: {propulsion.propellantMassGrams.toFixed(1)}g</span>
                </div>
                <button
                  disabled={isFiring || isPreheating}
                  onClick={refuelPropellant}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 font-mono text-[11px] flex items-center gap-1 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refuel Tank (250g)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Real-Time EPS Power Budget Impact Visualizer */}
      {activeTab === 'POWER_BUDGET' && (
        <div className="p-4 flex flex-col gap-5">
          {/* Top Banner: Power Waterfall / Delta Explanation */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Thruster Electrical Power Coupling & Battery Discharge Impact
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isDischarging ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                Net Battery Current: {eps.batteryCurrentA >= 0 ? `+${eps.batteryCurrentA.toFixed(2)}` : eps.batteryCurrentA.toFixed(2)} A
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Micro-thruster solenoid valve actuation (3.5W PWM) and catalyst bed preheating (6.5W) draw high transient power from the regulated 12V bus.
              During firings, the spacecraft load demand jumps from nominal ~7.5W up to ~19.5W, forcing the LiFePO4 battery pack into an accelerated discharge state.
            </p>

            {/* Load Breakdown Stacked Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Base Avionics (OBC)</div>
                <div className="text-sm font-bold text-white mt-1">3.50 W</div>
                <div className="text-[10px] text-slate-400 mt-0.5">3.3V Rail (Always on)</div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">ADCS Reaction Wheels</div>
                <div className="text-sm font-bold text-cyan-300 mt-1">
                  {(Math.abs(adcs.wheelSpeedRpm[0]) / 3000 + 0.8 + (isFiring ? 1.4 : isPreheating ? 0.4 : 0)).toFixed(2)} W
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isFiring ? '+1.4W Counter-Torque' : 'Nominal Holding'}
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">RF Comms / Payload</div>
                <div className="text-sm font-bold text-indigo-300 mt-1">
                  {(eps.bus5vCurrentA * 5.0).toFixed(2)} W
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">5.0V Rail</div>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${
                isFiring
                  ? 'bg-amber-500/20 border-amber-500/70'
                  : isPreheating
                  ? 'bg-orange-500/20 border-orange-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="text-[10px] text-amber-300 flex items-center justify-between">
                  <span>Thruster Subsystem</span>
                  {isFiring && <span className="animate-pulse">FIRING</span>}
                </div>
                <div className="text-sm font-bold text-amber-400 mt-1">
                  +{propulsion.currentPowerDrawW.toFixed(2)} W
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  12.0V Solenoids & Htrs
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">Total EPS Load</div>
                <div className="text-sm font-bold text-white mt-1">
                  {eps.totalLoadPowerW.toFixed(2)} W
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Solar Gen: {eps.solarArrayPowerW.toFixed(2)} W
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Recharts Coupled Telemetry Stream */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Live Coupled Telemetry: Thruster Load vs. Battery State of Charge (SoC%)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time synchronous tracking of thruster electrical spikes and battery depletion rate.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Thruster Power (W)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Battery SoC (%)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Propellant (g)
                </span>
              </div>
            </div>

            <ChartViewport title="Thruster and EPS telemetry" className="h-64 w-full">
              <ChartInteractionHint compact />
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={telemetryPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                  {/* Left Axis: Power (Watts) & Propellant (g) */}
                  <YAxis yAxisId="left" stroke="#f59e0b" tick={{ fontSize: 10 }} domain={[0, 20]} />
                  {/* Right Axis: Battery SoC (%) */}
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="thrusterPower"
                    fill="#f59e0b"
                    fillOpacity={0.25}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Thruster Load (W)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="soc"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Battery SoC (%)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="propellant"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Propellant Mass (g)"
                  />
                  <ChartNavigator dataKey="time" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartViewport>
          </div>

          {/* Battery Safety Threshold & Max Allowable Burn Time Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Burn Feasibility Margin</span>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                {safeBurnMinutesRemaining > 60 ? '> 60 mins' : `${safeBurnMinutesRemaining.toFixed(1)} mins`}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Maximum allowable continuous firing time before hitting the 40% battery low-power safe threshold.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Illumination Status</span>
              <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                {orbit.eclipseState === 'UMBRA' ? 'UMBRA (In Shadow)' : 'SUNLIGHT (Harvesting)'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {orbit.eclipseState === 'UMBRA'
                  ? 'Solar generation 0.0W — all thruster load supplied purely by battery discharge!'
                  : `Solar panels generating ${eps.solarArrayPowerW.toFixed(1)}W, offsetting thruster electrical draw.`}
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Propellant Mass Energy Ratio</span>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {(propulsion.propellantMassGrams / 0.046).toFixed(0)} sec Burn Available
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Total remaining thruster burn duration at nominal 50 mN thrust before tank depletion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Maneuver Execution History Log */}
      {activeTab === 'HISTORY' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Recorded Orbital Maneuver Burn Logs
            </span>
            <span className="text-xs font-mono text-slate-400">
              {propulsion.history.length} completed maneuvers
            </span>
          </div>

          {propulsion.history.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
              No maneuvers executed yet. Arm thruster and configure Delta-V to perform an orbital burn.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-3">Burn ID</th>
                    <th className="py-2 px-3">Vector</th>
                    <th className="py-2 px-3">ΔV (m/s)</th>
                    <th className="py-2 px-3">Duration (s)</th>
                    <th className="py-2 px-3">Propellant (g)</th>
                    <th className="py-2 px-3">Energy (Wh)</th>
                    <th className="py-2 px-3">Orbit Impact (Δa)</th>
                    <th className="py-2 px-3">Peak Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {propulsion.history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-2.5 px-3 text-cyan-400">{rec.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                          {rec.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-300">{rec.deltaVMs.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{rec.durationSec.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-cyan-300">{rec.propellantConsumedG.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-amber-300">{rec.energyConsumedWh.toFixed(3)}</td>
                      <td className="py-2.5 px-3 text-emerald-400">
                        {(rec.finalSemiMajorAxisKm - rec.initialSemiMajorAxisKm) >= 0
                          ? `+${(rec.finalSemiMajorAxisKm - rec.initialSemiMajorAxisKm).toFixed(2)}`
                          : (rec.finalSemiMajorAxisKm - rec.initialSemiMajorAxisKm).toFixed(2)} km
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{rec.peakLoadW.toFixed(1)} W</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
