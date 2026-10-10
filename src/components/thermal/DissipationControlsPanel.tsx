import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { ThermalStrapMode } from '../../types/telemetry';
import {
  Sliders,
  Flame,
  Zap,
  Cpu,
  Layers,
  Thermometer,
  Shield,
  RotateCcw,
  Sun,
  Moon,
  Radio,
  Power,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';

export const DissipationControlsPanel: React.FC = () => {
  const thermal = useSimulatorStore((s) => s.thermal);
  const setLouverAperture = useSimulatorStore((s) => s.setLouverAperture);
  const toggleLouverAutoThermostat = useSimulatorStore((s) => s.toggleLouverAutoThermostat);
  const setLouverTargetTemp = useSimulatorStore((s) => s.setLouverTargetTemp);
  const toggleBatteryHeater = useSimulatorStore((s) => s.toggleBatteryHeater);
  const toggleBatteryHeaterAutoThermostat = useSimulatorStore((s) => s.toggleBatteryHeaterAutoThermostat);
  const togglePayloadHeater = useSimulatorStore((s) => s.togglePayloadHeater);
  const setThermalStrapMode = useSimulatorStore((s) => s.setThermalStrapMode);
  const toggleThermalDerating = useSimulatorStore((s) => s.toggleThermalDerating);
  const triggerThermalScenario = useSimulatorStore((s) => s.triggerThermalScenario);

  const controls = thermal.controls;
  const nodes = thermal.nodes;

  // Effective emissivity based on louver aperture
  const effectiveEmissivity = 0.12 + 0.70 * (controls.louverAperturePercent / 100);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Heat Dissipation & Active Thermal Control System (ATCS)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Command variable radiator louvers, survival patch heaters, pyrolytic heat pipe straps, and component thermal throttling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Thermal Protection Mode:</span>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            {controls.louverAutoThermostat ? 'AUTONOMOUS THERMOSTAT' : 'MANUAL OVERRIDE'}
          </span>
        </div>
      </div>

      {/* Control Grid: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Control 1: Variable Radiator Louvers */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Variable Radiator Louvers
                </span>
              </div>
              <button
                onClick={toggleLouverAutoThermostat}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1 ${
                  controls.louverAutoThermostat
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {controls.louverAutoThermostat ? <ToggleRight className="w-3.5 h-3.5 text-cyan-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                Auto-Thermostat
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Modulates radiator aperture blades to control deep-space heat rejection. Closes in orbital night to trap heat; opens in sunlight when warm.
            </p>
          </div>

          <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            {/* Louver Aperture Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1">
                <span className="text-slate-400">Aperture Opening:</span>
                <span className="text-cyan-400 font-bold">{controls.louverAperturePercent.toFixed(0)}% Open</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={controls.louverAperturePercent}
                onChange={(e) => setLouverAperture(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>0% (Closed, ε=0.12)</span>
                <span>50%</span>
                <span>100% (Open, ε=0.82)</span>
              </div>
            </div>

            {/* Target Temperature Setpoint */}
            {controls.louverAutoThermostat && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="text-slate-400">Thermostat Target Setpoint:</span>
                  <span className="text-white font-semibold">{controls.louverTargetTempC.toFixed(1)}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="15"
                    max="30"
                    step="0.5"
                    value={controls.louverTargetTempC}
                    onChange={(e) => setLouverTargetTemp(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[11px] font-mono text-slate-400">{controls.louverTargetTempC}°C</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Effective Radiator Emissivity (ε):</span>
              <span className="text-cyan-300 font-bold">{effectiveEmissivity.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Control 2: Active Survival Patch Heaters */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Active Survival Patch Heaters
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Draws from EPS 12V Bus
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Thermostatically prevents battery freezing (&lt;0°C lithium plating) and keeps payload sensors within calibrated temperatures during orbital night.
            </p>
          </div>

          <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            {/* Battery Heater Controls */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                  <span>Battery Patch Heater</span>
                  {nodes['BATTERY'].heaterActive && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                      FIRING (+3.2W)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Temp: {nodes['BATTERY'].temperatureC.toFixed(1)}°C (Safe: 0°C to 45°C)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleBatteryHeaterAutoThermostat}
                  className={`px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                    controls.batteryHeaterAutoThermostat
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Auto (&lt;2°C)
                </button>
                <button
                  onClick={toggleBatteryHeater}
                  className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-all flex items-center gap-1 ${
                    controls.batteryHeaterEnabled || nodes['BATTERY'].heaterActive
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/60'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {controls.batteryHeaterEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Payload Heater Controls */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                  <span>Payload GNSS-RO Pre-Heater</span>
                  {nodes['PAYLOAD_GNSS'].heaterActive && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      WARMING (+2.0W)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Temp: {nodes['PAYLOAD_GNSS'].temperatureC.toFixed(1)}°C (Safe: -15°C to 55°C)
                </div>
              </div>

              <button
                onClick={togglePayloadHeater}
                className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded border transition-all flex items-center gap-1 ${
                  controls.payloadHeaterEnabled || nodes['PAYLOAD_GNSS'].heaterActive
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Power className="w-3 h-3" />
                {controls.payloadHeaterEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Control 3: Pyrolytic Heat Pipe / Thermal Strap */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase font-mono">
                Pyrolytic Graphite Thermal Strap (Heat Pipe)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Selects conductive coupling conductance between hot internal chips (OBC Core, RF PA) and the exterior radiator plate.
            </p>
          </div>

          <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ISOLATED' as ThermalStrapMode, label: 'ISOLATED', cond: '0.35 W/K', desc: 'Retain Night Heat' },
                { id: 'BALANCED' as ThermalStrapMode, label: 'BALANCED', cond: '1.8 W/K', desc: 'Nominal Cruise' },
                { id: 'MAX_COOLING' as ThermalStrapMode, label: 'MAX COOLING', cond: '5.2 W/K', desc: 'Heavy Compute/RF' },
              ].map((mode) => {
                const isActive = controls.thermalStrapMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setThermalStrapMode(mode.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{mode.label}</div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{mode.cond}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{mode.desc}</div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center pt-1 border-t border-slate-800">
              <span>Heat Transfer Rate to Radiator:</span>
              <span className="text-white font-bold">
                {((nodes['OBC_CORE'].temperatureC - nodes['RADIATOR'].temperatureC) * (controls.thermalStrapMode === 'ISOLATED' ? 0.35 : controls.thermalStrapMode === 'MAX_COOLING' ? 5.2 : 1.8)).toFixed(2)} W
              </span>
            </div>
          </div>
        </div>

        {/* Control 4: Active Component Thermal Derating & Throttling */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Autonomous Thermal Derating & Clock Gating
                </span>
              </div>
              <button
                onClick={toggleThermalDerating}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1 ${
                  controls.activeThermalDerating
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {controls.activeThermalDerating ? <ToggleRight className="w-3.5 h-3.5 text-rose-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {controls.activeThermalDerating ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Monitors OBC Core (&gt;52°C) and Comms RF PA (&gt;58°C). Automatically throttles Edge-AI clock speed and RF downlink transmit power to prevent silicon degradation.
            </p>
          </div>

          <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Current Throttling Status:</span>
              <span className={`font-bold ${thermal.thermalDeratingActive ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {thermal.thermalDeratingActive ? '⚠️ THROTTLED (-45% CLOCK)' : 'NOMINAL (FULL PERFORMANCE)'}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
              <span>OBC Temp Margin to Throttle:</span>
              <span className="text-slate-300">{(52.0 - nodes['OBC_CORE'].temperatureC).toFixed(1)}°C remaining</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Thermal Scenario Stress Tests */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Thermal Stress Simulation Presets:</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Test transient thermodynamic response and automated thermostat triggers
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => triggerThermalScenario('ECLIPSE_CHILL')}
            className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-1 text-xs font-mono font-bold">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              Deep Eclipse Chill
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Tests battery heater & louver closure</div>
          </button>

          <button
            onClick={() => triggerThermalScenario('SOLAR_PEAK')}
            className="p-2.5 rounded-lg bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-900/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-1 text-xs font-mono font-bold">
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
              High-Beta Solar Peak
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Tests radiator louver 100% aperture dump</div>
          </button>

          <button
            onClick={() => triggerThermalScenario('PA_BURST')}
            className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-1 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              RF PA Hotspot Surge
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Tests pyrolytic heat strap dissipation</div>
          </button>

          <button
            onClick={() => triggerThermalScenario('NOMINAL_RESET')}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all text-left flex flex-col justify-between"
          >
            <div className="flex items-center gap-1 text-xs font-mono font-bold">
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Equilibrium
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Restores nominal 21°C thermal balance</div>
          </button>
        </div>
      </div>
    </div>
  );
};
