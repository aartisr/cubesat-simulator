import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { OrbitMode } from '../../types/telemetry';
import { Compass, RotateCw, Activity, Zap, Gauge, AlertTriangle, ShieldCheck, Rocket } from 'lucide-react';
import { ADCSThrusterControl } from '../../components/adcs/ADCSThrusterControl';

export const ADCSModule: React.FC = () => {
  const adcs = useSimulatorStore((s) => s.adcs);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const setOrbitMode = useSimulatorStore((s) => s.setOrbitMode);
  const [subView, setSubView] = useState<'ALL' | 'THRUSTERS' | 'ATTITUDE'>('ALL');

  const modes: { id: OrbitMode; label: string; desc: string }[] = [
    { id: 'SUN_POINTING', label: 'Sun Pointing', desc: 'Solar array maximum illumination vector alignment' },
    { id: 'NADIR_POINTING', label: 'Nadir Pointing', desc: 'Payload camera Earth-facing boresight lock' },
    { id: 'DETUMBLE', label: 'B-Dot Detumble', desc: 'Magnetic coil kinetic dampening of angular rates' },
    { id: 'GROUND_TRACKING', label: 'Ground Track', desc: 'Active S-Band antenna slew toward ground station' },
    { id: 'SAFE_MODE', label: 'Safe Hold', desc: 'Minimal power rate dampening with broad sun bias' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner & Mode Segmented Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Attitude Determination & Control System (ADCS)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Closed-loop 3-axis quaternion kinematics, reaction wheel momentum management, and magnetorquer B-dot stabilization.
          </p>
        </div>

        {/* Sub-view Switcher & Mode Selector Buttons */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <div className="flex bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setSubView('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                subView === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Subsystem
            </button>
            <button
              onClick={() => setSubView('THRUSTERS')}
              className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                subView === 'THRUSTERS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              <span>Thruster Control</span>
              {propulsion.status === 'FIRING' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setSubView('ATTITUDE')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                subView === 'ATTITUDE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Attitude & RWA
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setOrbitMode(m.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  adcs.mode === m.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded ADCS Thruster Control Panel */}
      {(subView === 'ALL' || subView === 'THRUSTERS') && (
        <ADCSThrusterControl />
      )}

      {/* Grid of Key Subsystem Panels (Quaternions, Wheels, Torquers) */}
      {(subView === 'ALL' || subView === 'ATTITUDE') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Panel 1: Quaternions & Euler Angles */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Orientation & Quaternion</span>
                <span className="text-[11px] font-mono text-cyan-400">NORM: 1.0000</span>
              </div>

            <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-center sm:grid-cols-4">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">q0 (w)</div>
                <div className="text-xs text-slate-200 font-semibold">{adcs.quaternion.w.toFixed(4)}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">q1 (x)</div>
                <div className="text-xs text-slate-200 font-semibold">{adcs.quaternion.x.toFixed(4)}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">q2 (y)</div>
                <div className="text-xs text-slate-200 font-semibold">{adcs.quaternion.y.toFixed(4)}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">q3 (z)</div>
                <div className="text-xs text-slate-200 font-semibold">{adcs.quaternion.z.toFixed(4)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400 mb-1">Body Euler Angles (Tait-Bryan Z-Y-X):</div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">Roll (ϕ):</span>
                <span className="text-slate-200 font-semibold">{adcs.euler.roll.toFixed(2)}°</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">Pitch (θ):</span>
                <span className="text-slate-200 font-semibold">{adcs.euler.pitch.toFixed(2)}°</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">Yaw (ψ):</span>
                <span className="text-slate-200 font-semibold">{adcs.euler.yaw.toFixed(2)}°</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Pointing Error:</span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{adcs.pointingErrorDeg.toFixed(2)}° (Target &lt; 2.0°)</span>
            </div>
          </div>
        </div>

        {/* Panel 2: 3-Axis Reaction Wheel Assembly (RWA) */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Reaction Wheels (3-Axis)</span>
              <span className="text-[11px] font-mono text-slate-400">MAX: ±5000 RPM</span>
            </div>

            <div className="space-y-3">
              {['Wheel X (Roll)', 'Wheel Y (Pitch)', 'Wheel Z (Yaw)'].map((name, i) => {
                const rpm = adcs.wheelSpeedRpm[i];
                const pct = (Math.abs(rpm) / 5000) * 100;
                const isWarning = Math.abs(rpm) > 4200;

                return (
                  <div key={name} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{name}</span>
                      <span className={`font-mono font-semibold ${isWarning ? 'text-amber-400' : 'text-slate-200'}`}>
                        {rpm > 0 ? `+${rpm.toFixed(0)}` : rpm.toFixed(0)} RPM
                      </span>
                    </div>
                    {/* Gauge bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isWarning ? 'bg-amber-400' : 'bg-cyan-400'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>RWA Power Draw:</span>
            <span className="font-mono text-cyan-300 font-semibold">
              {(
                Math.abs(adcs.wheelSpeedRpm[0]) / 3000 +
                0.8 +
                (propulsion.status === 'FIRING' ? 1.4 : propulsion.status === 'PREHEATING' ? 0.4 : 0)
              ).toFixed(2)}{' '}
              W
            </span>
          </div>
        </div>

        {/* Panel 3: Magnetorquers & Geomagnetic B-Field */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Magnetorquers & B-Field</span>
              <span className="text-[11px] font-mono text-indigo-400">IGRF-13 MODEL</span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="text-xs text-slate-400">Local Geomagnetic Induction (nT):</div>
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Bx</div>
                  <div className="text-xs text-slate-200">{adcs.magneticFieldNanoTesla.x.toFixed(0)}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">By</div>
                  <div className="text-xs text-slate-200">{adcs.magneticFieldNanoTesla.y.toFixed(0)}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Bz</div>
                  <div className="text-xs text-slate-200">{adcs.magneticFieldNanoTesla.z.toFixed(0)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-400">Coil Dipole Moment (A·m²):</div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">Mx:</span>
                <span className="text-slate-200">{adcs.magnetorquerDipoleAm2[0].toFixed(3)} A·m²</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">My:</span>
                <span className="text-slate-200">{adcs.magnetorquerDipoleAm2[1].toFixed(3)} A·m²</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 p-2 rounded border border-slate-800/80">
                <span className="text-slate-400">Mz:</span>
                <span className="text-slate-200">{adcs.magnetorquerDipoleAm2[2].toFixed(3)} A·m²</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Momentum Dumping Status:</span>
            <span className="text-emerald-400 font-medium">
              {propulsion.status === 'FIRING' ? 'Thruster Alignment Compensation' : 'Desaturating RW3'}
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
