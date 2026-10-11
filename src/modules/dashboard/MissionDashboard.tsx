import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { useMissionLogQuery, useSpaceWeatherQuery } from '../../services/telemetryQuery';
import { OrbitView3D } from '../../components/3d/OrbitView3D';
import { CUBESAT_PRESETS } from '../../core/data/tleCatalog';
import {
  Compass,
  RotateCw,
  Zap,
  Radio,
  ShieldAlert,
  Flame,
  Globe,
  BatteryCharging,
  Sun,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Rocket,
  Thermometer,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ActiveModuleView } from '../../components/layout/ViewNavigation';

interface MissionDashboardProps {
  onNavigate: (view: ActiveModuleView) => void;
}

export const MissionDashboard: React.FC<MissionDashboardProps> = ({ onNavigate }) => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const adcs = useSimulatorStore((s) => s.adcs);
  const eps = useSimulatorStore((s) => s.eps);
  const comms = useSimulatorStore((s) => s.comms);
  const conjunctions = useSimulatorStore((s) => s.conjunctions);
  const gnssRO = useSimulatorStore((s) => s.gnssRO);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const thermal = useSimulatorStore((s) => s.thermal);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);
  const switchSatellite = useSimulatorStore((s) => s.switchSatellite);
  const { data: logs } = useMissionLogQuery();
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);

  const criticalConj = conjunctions.find((c) => c.severity === 'CRITICAL' || c.severity === 'WARNING');
  const velKmS = Math.sqrt(
    orbit.velocityECI.x ** 2 + orbit.velocityECI.y ** 2 + orbit.velocityECI.z ** 2
  );

  return (
    <div className="flex flex-col gap-5">
      {/* A calm, action-oriented status summary. Detail is available below, not competing with the scene. */}
      <section aria-label="Mission pulse" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Mission pulse</p>
            <h1 className="mt-1 text-xl font-bold text-white">{criticalConj ? 'A safety review needs your attention' : 'Your mission is operating normally'}</h1>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              {criticalConj
                ? `${criticalConj.debrisName} has a predicted closest approach of ${criticalConj.missDistanceKm.toFixed(2)} km. Review the conjunction assessment before taking action.`
                : `Orbit, power, thermal control, and communications are being simulated together. Start with the live orbit, then open a workspace when you want to investigate.`}
            </p>
          </div>
          <button
            onClick={() => onNavigate(criticalConj ? 'DEBRIS' : 'ORBIT')}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${criticalConj ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'}`}
          >
            {criticalConj ? 'Review safety alert' : 'Explore live orbit'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => onNavigate('DATA_SOURCES')} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Data sources</button>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Orbit</span>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">{orbit.geodetic.altitude.toFixed(0)} km · {orbit.eclipseState.toLowerCase()}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Power reserve</span>
            <p className="mt-0.5 text-sm font-semibold text-emerald-400">{eps.batterySocPercent.toFixed(0)}% battery · {eps.solarArrayPowerW.toFixed(1)} W solar</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Safety</span>
            <p className={`mt-0.5 text-sm font-semibold ${criticalConj ? 'text-rose-400' : 'text-emerald-400'}`}>{criticalConj ? 'Conjunction review recommended' : 'No active safety actions'}</p>
          </div>
        </div>
      </section>

      {/* Spacecraft profile is a deliberate choice, separated from ongoing telemetry. */}
      <section aria-label="Spacecraft profile" className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400">
              Simulating
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-xs font-mono text-slate-400">NORAD #{selectedSatellite.noradId}</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">{selectedSatellite.name} ({selectedSatellite.formFactor})</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{selectedSatellite.missionDescription}</p>
        </div>

        {/* Spacecraft Preset Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          {CUBESAT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => switchSatellite(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedSatellite.id === p.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </section>

      {/* Main 3D Digital Twin View */}
      <section aria-label="Live orbit visualization" className="w-full h-[460px] sm:h-[520px]">
        <OrbitView3D />
      </section>

      {/* Essential signals come first; engineering detail is available without competing with the primary mission decision. */}
      <section aria-label="Mission indicators">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Mission indicators</h2>
            <p className="mt-1 text-xs text-slate-400">The mission pulse calls out safety first. These three signals summarize altitude, velocity, and energy reserve.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowTelemetryDetails((value) => !value)}
            aria-expanded={showTelemetryDetails}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:self-auto"
          >
            {showTelemetryDetails ? 'Hide engineering detail' : 'Show engineering detail'}
            {showTelemetryDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${showTelemetryDetails ? 'lg:grid-cols-6' : 'lg:grid-cols-3'}`}>
        {/* Metric 1: Orbital Altitude */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Altitude (LEO)</div>
          <div className="text-xl font-bold font-mono text-cyan-300 my-1">
            {orbit.geodetic.altitude.toFixed(1)} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Apogee: {orbit.elements.apogeeAltitude.toFixed(0)} km
          </div>
        </div>

        {/* Metric 2: Inertial Velocity */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orbital Velocity</div>
          <div className="text-xl font-bold font-mono text-cyan-300 my-1">
            {velKmS.toFixed(3)} <span className="text-xs font-normal text-slate-400">km/s</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Mach 22.4 ({(velKmS * 3600).toFixed(0)} km/h)
          </div>
        </div>

        {/* Metric 3: Battery SoC */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Battery SoC</div>
          <div className="text-xl font-bold font-mono text-emerald-400 my-1">
            {eps.batterySocPercent.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {eps.batteryVoltageV.toFixed(2)}V · {eps.batteryCurrentA > 0 ? `+${eps.batteryCurrentA.toFixed(2)}A` : `${eps.batteryCurrentA.toFixed(2)}A`}
          </div>
        </div>

        {showTelemetryDetails && <>
        {/* Metric 4: Solar Generation */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Solar Array</div>
          <div className="text-xl font-bold font-mono text-amber-400 my-1">
            {eps.solarArrayPowerW.toFixed(1)} <span className="text-xs font-normal text-slate-400">W</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {orbit.eclipseState} ({(orbit.eclipseFraction * 100).toFixed(0)}%)
          </div>
        </div>

        {/* Metric 5: Attitude Pointing Error */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pointing Accuracy</div>
          <div className="text-xl font-bold font-mono text-indigo-300 my-1">
            {adcs.pointingErrorDeg.toFixed(2)}°
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Mode: {adcs.mode}
          </div>
        </div>

        {/* Metric 6: Comms Link */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">GSN Telemetry Link</div>
          <div className="text-sm font-bold font-mono text-slate-200 my-1">
            {comms.linkStatus === 'DATA_DOWNLINK' ? (
              <span className="text-emerald-400">DOWNLINK (2 Mbps)</span>
            ) : comms.linkStatus === 'LINK_LOCKED' ? (
              <span className="text-cyan-400">LOCKED (+18 dB)</span>
            ) : (
              <span className="text-slate-400">STANDBY</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Station: {comms.activeGroundStation?.name.split(' ')[0] || 'None'}
          </div>
        </div>
        </>}
        </div>
      </section>

      {/* Lower Row: Mission Subsystem Health & Live Mission Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subsystems Status Panel */}
        <section aria-label="Subsystem health" className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              System health
            </span>
            <button onClick={() => setShowSystemDetails((value) => !value)} aria-expanded={showSystemDetails} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded">
              {showSystemDetails ? 'Hide details' : 'View details'}
              {showSystemDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <p className="text-sm text-emerald-400 font-medium">{criticalConj ? 'One safety item needs review' : 'All core systems are nominal'}</p>
          {showSystemDetails && <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-200">ADCS & Kinematics</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">3 Reaction Wheels Active</span>
                <span className="text-emerald-400 font-semibold">100% HEALTH</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-slate-200">EPS Power Distribution</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">Rails 3.3V / 5.0V / 12.0V Nominal</span>
                <span className="text-emerald-400 font-semibold">100% HEALTH</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium text-slate-200">Comms & RF Transceiver</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">S-Band 2245 MHz +33 dBm</span>
                <span className="text-emerald-400 font-semibold">LOCKED</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-200">Orbit & J2 Ephemeris</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">
                  {orbit.j2Enabled ? `dΩ/dt ${orbit.nodalRegressionRateDegDay.toFixed(3)}°/d` : '2-Body Keplerian'}
                </span>
                <span className={orbit.j2Enabled ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {orbit.j2Enabled ? 'J2 OBLATE' : '2-BODY'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-medium text-slate-200">Collision Avoidance Radar</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">5 Threats Tracked</span>
                {criticalConj ? (
                  <span className="text-rose-400 font-bold">HAZARD FLAGGED</span>
                ) : (
                  <span className="text-emerald-400 font-semibold">CLEAR</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-200">GNSS-RO & Edge-AI MCU</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">
                  {gnssRO?.completedSoundings.length ?? 6} Soundings · 13.6k:1 Comp.
                </span>
                <span className="text-cyan-400 font-semibold">
                  {gnssRO?.enabled ? 'EDGE-AI ON' : 'STANDBY'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-slate-200">ADCS Thrusters & Delta-V</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">
                  {propulsion.propellantMassGrams.toFixed(1)}g ({((propulsion.propellantMassGrams / propulsion.propellantCapacityGrams) * 100).toFixed(0)}%) · ΔV {propulsion.cumulativeDeltaVMs.toFixed(2)} m/s
                </span>
                <span
                  className={`font-semibold ${
                    propulsion.status === 'FIRING'
                      ? 'text-amber-400 animate-pulse'
                      : propulsion.status === 'ARMED'
                      ? 'text-cyan-400'
                      : 'text-slate-400'
                  }`}
                >
                  {propulsion.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-slate-200">Thermal Control (TCS)</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">
                  Core {thermal.internalMeanTempC.toFixed(1)}°C · Batt {thermal.batteryTempC.toFixed(1)}°C · {thermal.controls.louverAperturePercent.toFixed(0)}% Louver
                </span>
                <span className={thermal.hasThermalWarning ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                  {thermal.hasThermalWarning ? 'WARNING' : 'NOMINAL'}
                </span>
              </div>
            </div>
          </div>}
        </section>

        {/* Live Event Log Panel */}
        <section aria-label="Recent mission activity" className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Recent mission activity
              </span>
              <button onClick={() => onNavigate('TELEMETRY')} className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200">Open telemetry</button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
              {logs?.map((entry) => {
                const isWarn = entry.level === 'WARNING' || entry.level === 'ALERT';
                const isSucc = entry.level === 'SUCCESS';
                const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div
                    key={entry.id}
                    className={`p-2 rounded-lg border font-mono text-[11px] flex items-start gap-2 ${
                      isWarn
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : isSucc
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="text-slate-400 shrink-0">[{timeStr}]</span>
                    <span className="font-semibold text-cyan-400 shrink-0">[{entry.subsystem}]</span>
                    <span className="truncate">{entry.message}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Autonomous Safe-Mode Rule:</span>
            <span className="text-slate-300 font-mono">ACTIVE (TRIGGER &lt; 15% SOC)</span>
          </div>
        </section>
      </div>
    </div>
  );
};
