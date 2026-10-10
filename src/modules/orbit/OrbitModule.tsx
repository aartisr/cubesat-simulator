import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { useSpaceWeatherQuery } from '../../services/telemetryQuery';
import { GroundTrackView } from '../../components/orbit/GroundTrackView';
import { RaanProjectionChart } from '../../components/orbit/RaanProjectionChart';
import { AtmosphericDragModule } from '../../components/orbit/AtmosphericDragModule';
import { Orbit, Compass, Wind, Globe2, Sun, ToggleLeft, ToggleRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';

export const OrbitModule: React.FC = () => {
  const orbit = useSimulatorStore((s) => s.orbit);
  const dragTelemetry = useSimulatorStore((s) => s.dragTelemetry);
  const dragParams = useSimulatorStore((s) => s.dragParameters);
  const enableJ2Perturbation = useSimulatorStore((s) => s.enableJ2Perturbation);
  const setEnableJ2Perturbation = useSimulatorStore((s) => s.setEnableJ2Perturbation);
  const { data: weather } = useSpaceWeatherQuery();

  const elem = orbit.elements;

  // Theoretical Sun-synchronous rate required to match Earth's heliocentric revolution
  const ssoRequiredRateDegDay = 360 / 365.2422; // ~0.9856 deg/day
  const ssoDelta = Math.abs(orbit.nodalRegressionRateDegDay - ssoRequiredRateDegDay);
  const isCloseToSSO = ssoDelta < 0.15;

  // Equatorial ground track shift in km (Earth equatorial circumference ~40075 km)
  const shiftKm = (orbit.groundTrackNodalShiftDegOrbit / 360) * 40075;

  return (
    <div className="flex flex-col gap-5">
      {/* Interactive Orbital Perturbation Control Panel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Orbital Mechanics & Earth Oblateness (J2) Control Panel
            </h2>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] font-mono text-cyan-400">J₂ = 1.08263×10⁻³</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Toggle real-time quadrupole gravitational harmonic perturbation during active flight simulation. Models equatorial bulge torque inducing secular RAAN nodal regression and apsidal line rotation.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${enableJ2Perturbation ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              Live SGP4 Coupling: {enableJ2Perturbation ? 'Oblate Gravity Active' : 'Spherical Gravity'}
            </span>
            <span>·</span>
            <span>Affects: Ground Track Precession & 24h RAAN Projection</span>
          </div>
        </div>

        {/* Tactile Hardware Toggle Switch & Segmented Modes */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 bg-slate-950/80 p-3 rounded-xl border border-slate-800/90 shadow-inner">
          {/* Segmented Mode Quick Buttons */}
          <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setEnableJ2Perturbation(true)}
              className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                enableJ2Perturbation
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enableJ2Perturbation ? 'bg-cyan-400' : 'bg-slate-600'}`} />
              <span>J2 Oblate</span>
            </button>
            <button
              type="button"
              onClick={() => setEnableJ2Perturbation(false)}
              className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                !enableJ2Perturbation
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!enableJ2Perturbation ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span>2-Body Kepler</span>
            </button>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-800" />

          {/* Interactive Physical Aerospace Slider Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={enableJ2Perturbation}
              onClick={() => setEnableJ2Perturbation(!enableJ2Perturbation)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                enableJ2Perturbation
                  ? 'bg-cyan-600 border-cyan-400'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <span className="sr-only">Toggle J2 Earth Oblateness Perturbation</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out mt-0.5 ${
                  enableJ2Perturbation ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>

            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-200 font-mono">
                {enableJ2Perturbation ? 'J2 ACTIVE' : 'J2 OFF'}
              </span>
              <span className="text-[10px] text-slate-400">
                {enableJ2Perturbation ? 'Precession On' : 'Fixed Plane'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2D Projected Ground Track View */}
      <GroundTrackView />

      {/* Dedicated Nodal Regression & J2 Dynamics Banner */}
      <div className={`p-4 rounded-xl border transition-all ${
        enableJ2Perturbation
          ? 'bg-slate-900/70 border-cyan-500/40'
          : 'bg-slate-900/40 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Nodal Regression & Secular Perturbations Engine
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-xs font-mono">
              {enableJ2Perturbation ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Accounting for Earth Quadrupole Harmonic (J2)</span>
                  <span className="sm:hidden">J2 Active</span>
                </span>
              ) : (
                <span className="text-amber-400/90 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nodal Regression Zeroed (Inertial Spherical Gravity)</span>
                  <span className="sm:hidden">2-Body Flat</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEnableJ2Perturbation(!enableJ2Perturbation)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              {enableJ2Perturbation ? 'Disable J2' : 'Enable J2'}
            </button>
          </div>
        </div>

        {/* Real-Time Nodal Regression Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase">Secular Nodal Drift Rate (dΩ/dt)</div>
            <div className={`text-base font-bold mt-1 ${enableJ2Perturbation ? 'text-cyan-300' : 'text-slate-400'}`}>
              {enableJ2Perturbation ? `${orbit.nodalRegressionRateDegDay.toFixed(4)}° / day` : '0.0000° / day'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {enableJ2Perturbation
                ? `${(orbit.nodalRegressionRateDegDay / 24).toFixed(5)}° / hour`
                : 'Inertial fixed plane'}
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase">Accumulated RAAN Shift (ΔΩ)</div>
            <div className={`text-base font-bold mt-1 ${enableJ2Perturbation ? 'text-cyan-300' : 'text-slate-400'}`}>
              {enableJ2Perturbation
                ? `${orbit.accumulatedNodalShiftDeg > 0 ? `+${orbit.accumulatedNodalShiftDeg.toFixed(4)}` : orbit.accumulatedNodalShiftDeg.toFixed(4)}°`
                : '0.0000°'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Current RAAN: {elem.raan.toFixed(3)}°
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase">Perigee Precession (dω/dt)</div>
            <div className={`text-base font-bold mt-1 ${enableJ2Perturbation ? 'text-amber-300' : 'text-slate-400'}`}>
              {enableJ2Perturbation ? `${orbit.perigeePrecessionRateDegDay.toFixed(4)}° / day` : '0.0000° / day'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Apsidal rotation in plane
            </div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[10px] uppercase">Ground Track Nodal Shift</div>
            <div className="text-base font-bold text-slate-200 mt-1">
              {orbit.groundTrackNodalShiftDegOrbit.toFixed(2)}° / rev
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              ~{shiftKm.toFixed(0)} km equatorial shift
            </div>
          </div>
        </div>

        {/* Sun-Synchronous Alignment Diagnostic */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="font-semibold text-slate-300">Sun-Synchronous Heliocentric Lock:</span>
            <span className="font-mono text-slate-300">
              Required: +0.9856°/day · Actual: {orbit.nodalRegressionRateDegDay.toFixed(4)}°/day
            </span>
          </div>

          <div className="font-mono text-[11px]">
            {enableJ2Perturbation && isCloseToSSO ? (
              <span className="text-emerald-400 font-semibold">
                SSO SYNCHRONOUS REGIME (Δ: {ssoDelta.toFixed(3)}°/day)
              </span>
            ) : enableJ2Perturbation ? (
              <span className="text-slate-400">
                NON-SSO INCLINATION (Δ: {ssoDelta.toFixed(3)}°/day)
              </span>
            ) : (
              <span className="text-slate-400">SSO DRIFT INACTIVE (J2 DISABLED)</span>
            )}
          </div>
        </div>
      </div>

      {/* Atmospheric Drag & Harris-Priester Orbital Decay Module */}
      <AtmosphericDragModule />

      {/* 24-Hour Projected RAAN Simulation Visualization Panel (Recharts) */}
      <RaanProjectionChart />

      {/* Classical Keplerian Elements & Space Weather Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Keplerian Shape & Size */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <span>Orbital Shape & Size</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Semi-Major Axis (a):</span>
              <span className="text-slate-200">{elem.semiMajorAxis.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Eccentricity (e):</span>
              <span className="text-slate-200">{elem.eccentricity.toFixed(5)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Apogee Altitude:</span>
              <span className="text-slate-200">{elem.apogeeAltitude.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Perigee Altitude:</span>
              <span className="text-slate-200">{elem.perigeeAltitude.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Card 2: Spatial Orientation Angles */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <span>Orientation Angles</span>
            <Globe2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Inclination (i):</span>
              <span className="text-slate-200">{elem.inclination.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">RAAN (Ω):</span>
              <span className="text-cyan-300 font-semibold">{elem.raan.toFixed(3)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Arg of Perigee (ω):</span>
              <span className="text-slate-200">{elem.argOfPerigee.toFixed(2)}°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">True Anomaly (ν):</span>
              <span className="text-slate-200">{elem.trueAnomaly.toFixed(2)}°</span>
            </div>
          </div>
        </div>

        {/* Card 3: Orbital Physics Invariants */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <span>Invariants & Periods</span>
            <Orbit className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Orbital Period:</span>
              <span className="text-slate-200">{elem.periodMinutes.toFixed(2)} min</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Revolutions / Day:</span>
              <span className="text-slate-200">{(1440 / elem.periodMinutes).toFixed(2)} rev/day</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Critical Inclination:</span>
              <span className="text-slate-300">63.4° / 116.6°</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Beta Angle (β):</span>
              <span className="text-slate-200">{orbit.betaAngle.toFixed(2)}°</span>
            </div>
          </div>
        </div>

        {/* Card 4: Space Weather & Atmospheric Drag */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            <span>Space Weather & Drag</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Planetary Kp Index:</span>
              <span className="text-emerald-400">{weather?.kpIndex ?? 2.3} (Quiet)</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Solar 10.7cm Flux:</span>
              <span className="text-amber-300 font-bold">{dragParams.f107SolarFlux} sfu</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">H-P Air Density (ρ):</span>
              <span className="text-cyan-300 font-bold">{dragTelemetry.densityKgM3.toExponential(2)} kg/m³</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400">Lifetime to 180 km:</span>
              <span className={dragTelemetry.reentryLifetimeDays < 365 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                {dragTelemetry.reentryLifetimeDays > 365
                  ? `~${(dragTelemetry.reentryLifetimeDays / 365.25).toFixed(1)} Years`
                  : `~${Math.round(dragTelemetry.reentryLifetimeDays)} Days`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
