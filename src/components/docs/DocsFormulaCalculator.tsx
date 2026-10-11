import React, { useState } from 'react';
import { Calculator, Orbit, Wind, Thermometer, ShieldAlert, Radio, Activity } from 'lucide-react';

export const DocsFormulaCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'J2' | 'DRAG' | 'THERMAL' | 'COLLISION' | 'LINK'>('J2');

  // J2 Calculator State
  const [j2AltKm, setJ2AltKm] = useState<number>(520);
  const [j2IncDeg, setJ2IncDeg] = useState<number>(97.45);
  const [j2Ecc, setJ2Ecc] = useState<number>(0.001);

  // Harris-Priester State
  const [dragAltKm, setDragAltKm] = useState<number>(500);
  const [dragF107, setDragF107] = useState<number>(120);
  const [dragAreaM2, setDragAreaM2] = useState<number>(0.03);
  const [dragMassKg, setDragMassKg] = useState<number>(4.85);

  // Thermal Louver State
  const [tempC, setTempC] = useState<number>(25);
  const [louverAperture, setLouverAperture] = useState<number>(50); // %
  const [radiatorAreaM2, setRadiatorAreaM2] = useState<number>(0.06);

  // Foster-Chan State
  const [missDistM, setMissDistM] = useState<number>(240);
  const [sigmaM, setSigmaM] = useState<number>(120);
  const [hbrM, setHbrM] = useState<number>(2.5);

  // Friis Link Budget State
  const [txPowerW, setTxPowerW] = useState<number>(1.0);
  const [slantRangeKm, setSlantRangeKm] = useState<number>(1200);
  const [freqMHz, setFreqMHz] = useState<number>(2245);

  // --- Calculations ---

  // 1. J2 Calculations
  const RE = 6378.137;
  const J2 = 1.08263e-3;
  const mu = 398600.4418;
  const aKm = RE + j2AltKm;
  const pKm = aKm * (1 - j2Ecc * j2Ecc);
  const meanMotionRadS = Math.sqrt(mu / Math.pow(aKm, 3));
  const incRad = (j2IncDeg * Math.PI) / 180;
  // Nodal precession (rad/s)
  const dOmegaRadS = -1.5 * J2 * Math.pow(RE / pKm, 2) * meanMotionRadS * Math.cos(incRad);
  const dOmegaDegDay = dOmegaRadS * (180 / Math.PI) * 86400;
  // Apsidal precession (rad/s)
  const domegaRadS = 0.75 * J2 * Math.pow(RE / pKm, 2) * meanMotionRadS * (5 * Math.pow(Math.cos(incRad), 2) - 1);
  const domegaDegDay = domegaRadS * (180 / Math.PI) * 86400;
  // SSO condition
  const ssoTargetDegDay = 0.9856;
  const ssoDiff = Math.abs(dOmegaDegDay - ssoTargetDegDay);
  const isSSO = ssoDiff < 0.05;

  // 2. Drag & Decay
  // Simple Harris-Priester / Jacchia exponential fit for calculator
  const scaleHeight = 55.0; // km around 500 km
  const baseDensity500 = 2.15e-12; // kg/m^3
  const densityKgM3 = baseDensity500 * Math.exp(-(dragAltKm - 500) / scaleHeight) * (dragF107 / 120);
  const vOrbitalMS = Math.sqrt((mu * 1e9) / ((RE + dragAltKm) * 1000));
  const cd = 2.2;
  const accelDragMS2 = 0.5 * densityKgM3 * (cd * dragAreaM2 / dragMassKg) * vOrbitalMS * vOrbitalMS;
  const decayRateMDay = (2 * Math.PI * densityKgM3 * Math.pow((RE + dragAltKm) * 1000, 2) * (cd * dragAreaM2 / dragMassKg)) * 86400;

  // 3. Thermal Radiation
  const sigmaSB = 5.670374e-8;
  const tempK = tempC + 273.15;
  const tSpaceK = 2.73;
  const epsEff = 0.12 + (louverAperture / 100) * (0.85 - 0.12);
  const qRadW = epsEff * sigmaSB * radiatorAreaM2 * (Math.pow(tempK, 4) - Math.pow(tSpaceK, 4));

  // 4. Foster-Chan Collision Probability
  const exponent = -0.5 * Math.pow(missDistM / sigmaM, 2);
  const pc = (Math.pow(hbrM, 2) / (2 * Math.pow(sigmaM, 2))) * Math.exp(exponent);

  // 5. Friis Link Budget
  const txDbw = 10 * Math.log10(txPowerW);
  const gTxDbi = 6.0;
  const gRxDbi = 34.5;
  const fsplDb = 20 * Math.log10(slantRangeKm) + 20 * Math.log10(freqMHz) + 32.44;
  const lossesDb = 1.2; // atm + pol
  const rxPowerDbm = (txDbw + gTxDbi + gRxDbi - fsplDb - lossesDb) + 30;
  const cN0DbHz = rxPowerDbm - (-174 + 10 * Math.log10(135)); // approx C/N0
  const marginDb = cN0DbHz - 65; // margin against 1 Mbps QPSK

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Interactive Aerodynamics & Astrodynamics Calculator</h3>
            <p className="text-xs text-slate-400">Grounded in the Astroneer technical reference and first-principles equations</p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('J2')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'J2' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Orbit className="w-3 h-3" />
            <span>J2 Precession</span>
          </button>
          <button
            onClick={() => setActiveTab('DRAG')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'DRAG' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3 h-3" />
            <span>Drag Decay</span>
          </button>
          <button
            onClick={() => setActiveTab('THERMAL')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'THERMAL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-3 h-3" />
            <span>Thermal Rad</span>
          </button>
          <button
            onClick={() => setActiveTab('COLLISION')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'COLLISION' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Foster-Chan</span>
          </button>
          <button
            onClick={() => setActiveTab('LINK')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'LINK' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Friis Link</span>
          </button>
        </div>
      </div>

      {/* J2 Precession Tab */}
      {activeTab === 'J2' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-300 font-medium">Input Orbital Parameters:</div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Altitude: {j2AltKm} km</span>
                <span>a = {aKm.toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min="300"
                max="1200"
                step="10"
                value={j2AltKm}
                onChange={(e) => setJ2AltKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Inclination: {j2IncDeg.toFixed(2)}°</span>
                <span>{j2IncDeg > 90 ? 'Retrograde' : 'Prograde'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="0.05"
                value={j2IncDeg}
                onChange={(e) => setJ2IncDeg(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Eccentricity: {j2Ecc.toFixed(4)}</span>
                <span>Near-Circular</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.05"
                step="0.001"
                value={j2Ecc}
                onChange={(e) => setJ2Ecc(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {'Formula: dΩ/dt = -(3/2) · J2 · (RE/p)² · n̄ · cos(i)'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">Calculated Secular Perturbations</div>
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">RAAN Nodal Drift (dΩ/dt):</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {dOmegaDegDay > 0 ? `+${dOmegaDegDay.toFixed(4)}` : dOmegaDegDay.toFixed(4)} °/day
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Apsidal Drift (dω/dt):</span>
                  <span className="text-sm font-bold text-amber-300">
                    {domegaDegDay > 0 ? `+${domegaDegDay.toFixed(4)}` : domegaDegDay.toFixed(4)} °/day
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Target Sun-Sync Rate:</span>
                  <span className="text-sm font-mono text-slate-300">+0.9856 °/day</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Sun-Synchronous Status:</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    isSSO ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isSSO ? 'PERFECT SUN-SYNC MATCH' : `Offset by ${ssoDiff.toFixed(3)}°/day`}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              At {j2AltKm} km altitude, an inclination of ~97.45° ensures the orbit plane precesses at exactly 360°/year, maintaining fixed local solar time of ascending node (LST-AN).
            </p>
          </div>
        </div>
      )}

      {/* Harris-Priester Drag Tab */}
      {activeTab === 'DRAG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-300 font-medium">Input Atmospheric & Spacecraft Parameters:</div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Altitude: {dragAltKm} km</span>
              </div>
              <input
                type="range"
                min="300"
                max="800"
                step="10"
                value={dragAltKm}
                onChange={(e) => setDragAltKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Solar Flux ($F_{10.7}$): {dragF107} sfu</span>
                <span>{dragF107 > 150 ? 'Solar Max' : dragF107 < 90 ? 'Solar Min' : 'Moderate'}</span>
              </div>
              <input
                type="range"
                min="70"
                max="250"
                step="5"
                value={dragF107}
                onChange={(e) => setDragF107(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Cross-Section Area: {(dragAreaM2 * 10000).toFixed(0)} cm²</span>
                <span>{dragAreaM2 <= 0.015 ? 'Minimum (Ram)' : 'Maximum (Broadside)'}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.06"
                step="0.005"
                value={dragAreaM2}
                onChange={(e) => setDragAreaM2(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {'Formula: a_drag = -(1/2) · ρ · (Cd · A / m) · v_rel²'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">Calculated Aerodynamic Effects</div>
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Thermospheric Density (ρ):</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {densityKgM3.toExponential(3)} kg/m³
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Drag Deceleration:</span>
                  <span className="text-sm font-bold text-rose-300">
                    {(accelDragMS2 * 1e6).toFixed(2)} µm/s²
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Orbital Altitude Decay:</span>
                  <span className="text-sm font-bold text-amber-300">
                    {decayRateMDay < 1 ? `${(decayRateMDay * 1000).toFixed(1)} mm/day` : `${decayRateMDay.toFixed(2)} m/day`}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Ballistic Coefficient (B):</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {(dragMassKg / (cd * dragAreaM2)).toFixed(2)} kg/m²
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Aerodynamic drag in LEO is non-linear with altitude; doubling solar flux F10.7 triples atmospheric swelling and decay rates.
            </p>
          </div>
        </div>
      )}

      {/* Thermal Louver Radiation Tab */}
      {activeTab === 'THERMAL' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-300 font-medium">Input Thermal State & Louver Controls:</div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Radiator Plate Temp: {tempC}°C</span>
                <span>{tempK.toFixed(1)} K</span>
              </div>
              <input
                type="range"
                min="-20"
                max="80"
                step="1"
                value={tempC}
                onChange={(e) => setTempC(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Louver Shutter Aperture: {louverAperture}%</span>
                <span>ε_eff = {epsEff.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={louverAperture}
                onChange={(e) => setLouverAperture(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {'Formula: Q_rad = ε_eff · σ · A · (T⁴ - T_space⁴)'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">Radiative Rejection to Deep Space</div>
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Effective Emissivity (ε_eff):</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {epsEff.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Radiated Power (Q_rad):</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {qRadW.toFixed(2)} Watts
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Specific Flux (q):</span>
                  <span className="text-sm font-bold text-indigo-300">
                    {(qRadW / radiatorAreaM2).toFixed(1)} W/m²
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Modulating louver aperture between 0% and 100% alters heat rejection by over 700%, preventing component freeze-out during 35-minute orbital eclipses.
            </p>
          </div>
        </div>
      )}

      {/* Foster-Chan Collision Tab */}
      {activeTab === 'COLLISION' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-300 font-medium">Input Conjunction Geometry:</div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Miss Distance: {missDistM} m</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={missDistM}
                onChange={(e) => setMissDistM(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Position Uncertainty (σ): {sigmaM} m</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={sigmaM}
                onChange={(e) => setSigmaM(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {'Formula: Pc = (R_HBR² / 2σ²) · exp(-d² / 2σ²)'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">Foster-Chan Probability Result</div>
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Probability of Collision ($P_c$):</span>
                  <span className={`text-base font-bold ${
                    pc > 1e-4 ? 'text-rose-400' : pc > 1e-6 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {pc.toExponential(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Action Threshold:</span>
                  <span className="text-xs font-mono text-slate-400">1.0e-4 (NASA/ESA Red Line)</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Risk Assessment:</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    pc > 1e-4 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {pc > 1e-4 ? 'MANDATORY CAM BURN' : 'ACCEPTABLE RISK'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Notice the non-intuitive maximum: if positional uncertainty $\sigma$ is extremely large, $P_c$ decreases because the probability density is diluted over a huge volume.
            </p>
          </div>
        </div>
      )}

      {/* Friis Link Budget Tab */}
      {activeTab === 'LINK' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-300 font-medium">Input RF Transmitter & Geometry:</div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>TX Power: {txPowerW.toFixed(1)} W</span>
                <span>{txDbw.toFixed(1)} dBW</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={txPowerW}
                onChange={(e) => setTxPowerW(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Slant Range: {slantRangeKm} km</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="50"
                value={slantRangeKm}
                onChange={(e) => setSlantRangeKm(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {'Formula: FSPL = 20 · log10(d_km) + 20 · log10(f_MHz) + 32.44 dB'}
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">RF Link Budget Performance</div>
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Path Loss (FSPL):</span>
                  <span className="text-sm font-bold text-amber-300">
                    {fsplDb.toFixed(1)} dB
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Received Power:</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {rxPowerDbm.toFixed(1)} dBm
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs text-slate-400">Carrier-to-Noise ($C/N_0$):</span>
                  <span className="text-sm font-bold text-indigo-300">
                    {cN0DbHz.toFixed(1)} dB-Hz
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Link Margin (1 Mbps):</span>
                  <span className={`text-sm font-bold ${
                    marginDb > 3.0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}>
                    {marginDb.toFixed(1)} dB {marginDb > 3.0 ? '(HEALTHY)' : '(MARGIN CRITICAL)'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Standard aerospace criteria require at least +3.0 dB link margin at minimum elevation angle (5°) to ensure bit error rates stay below 10⁻⁶.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
