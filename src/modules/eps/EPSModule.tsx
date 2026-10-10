import React from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { SolarIncidenceCalculator } from '../../components/eps/SolarIncidenceCalculator';
import { Sun, BatteryCharging, Zap, Thermometer, ShieldAlert, Cpu, Power, Rocket, Flame } from 'lucide-react';

export const EPSModule: React.FC = () => {
  const eps = useSimulatorStore((s) => s.eps);
  const orbit = useSimulatorStore((s) => s.orbit);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const toggleSolarPanels = useSimulatorStore((s) => s.toggleSolarPanels);

  const isUmbra = orbit.eclipseState === 'UMBRA';
  const isPenumbra = orbit.eclipseState === 'PENUMBRA';

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner with Solar Array Deployment Control */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Electrical Power System (EPS) & Energy Balance
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic MPPT solar cell harvesting, LiFePO4 battery charge curve, power bus distribution, and orbital thermal dissipation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Illumination Regime:</div>
            <div className="text-xs font-semibold font-mono">
              {isUmbra && <span className="text-indigo-400">UMBRA (Earth Shadow)</span>}
              {isPenumbra && <span className="text-amber-400">PENUMBRA (Partial Sun)</span>}
              {!isUmbra && !isPenumbra && <span className="text-yellow-400">DIRECT SUNLIGHT</span>}
            </div>
          </div>

          <button
            onClick={toggleSolarPanels}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 ${
              eps.solarPanelDeployed
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{eps.solarPanelDeployed ? 'Arrays Deployed' : 'Deploy Solar Arrays'}</span>
          </button>
        </div>
      </div>

      {/* Thruster Power Budget Alert Banner when active */}
      {(propulsion.status === 'FIRING' || propulsion.status === 'PREHEATING' || propulsion.currentPowerDrawW > 0) && (
        <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Active ADCS Thruster Maneuver Coupling</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/40">
                  {propulsion.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Thruster heaters & valves drawing <span className="font-mono font-bold text-amber-400">+{propulsion.currentPowerDrawW.toFixed(2)} W</span> on 12V bus • Total spacecraft demand <span className="font-mono text-white font-semibold">{eps.totalLoadPowerW.toFixed(2)} W</span> • Net battery current <span className="font-mono font-semibold text-rose-400">{eps.batteryCurrentA.toFixed(2)} A</span>.
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs hidden sm:block">
            <div className="text-[10px] text-slate-400">Propellant Remaining:</div>
            <div className="text-cyan-300 font-bold">{propulsion.propellantMassGrams.toFixed(1)} g ({((propulsion.propellantMassGrams / propulsion.propellantCapacityGrams) * 100).toFixed(1)}%)</div>
          </div>
        </div>
      )}

      {/* Solar Incidence Calculator & Multi-Face Generation Engine */}
      <SolarIncidenceCalculator />

      {/* Grid of Power Metrics & Curves */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel 1: Solar Energy Generation */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Solar Array Harvesting</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>

            <div className="text-center py-3 bg-slate-950/80 rounded-lg border border-slate-800 mb-4">
              <div className="text-3xl font-mono font-bold text-amber-400">
                {eps.solarArrayPowerW.toFixed(2)} <span className="text-sm font-normal text-slate-400">Watts</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Irradiance: {orbit.eclipseFraction > 0 ? (1361 * orbit.eclipseFraction).toFixed(0) : 0} W/m² (LEO)
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Beta Angle (β):</span>
                <span className="text-slate-200">{orbit.betaAngle.toFixed(2)}°</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Solar Illumination:</span>
                <span className="text-slate-200">{(orbit.eclipseFraction * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Array Cell Temp:</span>
                <span className={eps.solarPanelTempC < 0 ? 'text-cyan-400' : 'text-amber-300'}>
                  {eps.solarPanelTempC > 0 ? `+${eps.solarPanelTempC.toFixed(1)}` : eps.solarPanelTempC.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Cell Eff (Derated):</span>
            <span className="font-mono text-emerald-400 font-semibold">{eps.effectiveHarvestingEfficiencyPercent?.toFixed(1) ?? '29.5'}%</span>
          </div>
        </div>

        {/* Panel 2: Battery Pack State of Charge */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">LiFePO4 Battery Pack</span>
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="text-center py-3 bg-slate-950/80 rounded-lg border border-slate-800 mb-4">
              <div className="text-3xl font-mono font-bold text-emerald-400">
                {eps.batterySocPercent.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {eps.batteryRemainingWh.toFixed(1)} / {eps.batteryCapacityWh.toFixed(1)} Wh
              </div>

              {/* SoC Progress Bar */}
              <div className="w-4/5 mx-auto h-2 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    eps.batterySocPercent > 40
                      ? 'bg-emerald-400'
                      : eps.batterySocPercent > 20
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${eps.batterySocPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Terminal Voltage:</span>
                <span className="text-slate-200">{eps.batteryVoltageV.toFixed(2)} V</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Net Current:</span>
                <span className={eps.batteryCurrentA >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {eps.batteryCurrentA >= 0 ? `+${eps.batteryCurrentA.toFixed(2)}` : eps.batteryCurrentA.toFixed(2)} A
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60 font-mono">
                <span className="text-slate-400">Battery Cell Temp:</span>
                <span className="text-emerald-300">+{eps.batteryTempC.toFixed(1)}°C</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Health Status:</span>
            <span className="text-emerald-400 font-semibold">100% SOH (0 Cycles Degrad.)</span>
          </div>
        </div>

        {/* Panel 3: Power Buses & Load Shedding */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Regulated Power Rails</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">3.3V Bus (OBC & Sensors)</div>
                  <div className="text-[10px] text-slate-400">Main Flight Computer</div>
                </div>
                <div className="font-mono text-xs text-right">
                  <div className="text-cyan-400 font-bold">{eps.bus3v3CurrentA.toFixed(2)} A</div>
                  <div className="text-[10px] text-slate-400">{(eps.bus3v3CurrentA * 3.3).toFixed(2)} W</div>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">5.0V Bus (Payload & Radio)</div>
                  <div className="text-[10px] text-slate-400">S-Band RF Transceiver</div>
                </div>
                <div className="font-mono text-xs text-right">
                  <div className="text-cyan-400 font-bold">{eps.bus5vCurrentA.toFixed(2)} A</div>
                  <div className="text-[10px] text-slate-400">{(eps.bus5vCurrentA * 5.0).toFixed(2)} W</div>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">12.0V Bus (Actuators & Thrusters)</div>
                  <div className="text-[10px] text-slate-400">
                    Reaction Wheels, Torquers & Micro-Propulsion
                  </div>
                  {propulsion.currentPowerDrawW > 0 && (
                    <span className="text-[10px] text-amber-400 font-mono font-bold block mt-0.5">
                      Thruster: +{propulsion.currentPowerDrawW.toFixed(2)} W ({propulsion.status})
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-right">
                  <div className="text-cyan-400 font-bold">{eps.bus12vCurrentA.toFixed(2)} A</div>
                  <div className="text-[10px] text-slate-400">{(eps.bus12vCurrentA * 12.0).toFixed(2)} W</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Total Load Demand:</span>
            <span className="font-mono text-slate-200 font-bold">{eps.totalLoadPowerW.toFixed(2)} W</span>
          </div>
        </div>
      </div>
    </div>
  );
};
