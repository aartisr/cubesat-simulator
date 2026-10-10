import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { OrbitMode, SolarFaceId } from '../../types/telemetry';
import {
  Sun,
  Zap,
  Compass,
  Layers,
  Thermometer,
  RotateCw,
  Power,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const SolarIncidenceCalculator: React.FC = () => {
  const eps = useSimulatorStore((s) => s.eps);
  const orbit = useSimulatorStore((s) => s.orbit);
  const adcs = useSimulatorStore((s) => s.adcs);
  const setOrbitMode = useSimulatorStore((s) => s.setOrbitMode);
  const toggleSolarPanels = useSimulatorStore((s) => s.toggleSolarPanels);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);

  const [selectedFaceId, setSelectedFaceId] = useState<SolarFaceId | null>('+Z');

  const panelFaces = eps.panelFaces || [];
  const sBody = eps.sunVectorBody || { x: 0, y: 0, z: 1 };
  const isUmbra = orbit.eclipseState === 'UMBRA';

  // Selected face detail
  const activeFace = panelFaces.find((f) => f.faceId === selectedFaceId) || panelFaces[0];

  // Calculate sun azimuth and elevation in body frame
  const sunAzimuthDeg = (Math.atan2(sBody.y, sBody.x) * (180 / Math.PI) + 360) % 360;
  const sunElevationDeg = Math.asin(Math.max(-1, Math.min(1, sBody.z))) * (180 / Math.PI);

  const testModes: { id: OrbitMode; label: string }[] = [
    { id: 'SUN_POINTING', label: 'Sun Pointing (+Z Boresight)' },
    { id: 'NADIR_POINTING', label: 'Nadir Pointing (Earth Lock)' },
    { id: 'DETUMBLE', label: 'B-Dot Tumble' },
    { id: 'SAFE_MODE', label: 'Safe Hold Mode' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5 shadow-2xl">
      {/* Header with Title and Mode Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Solar Incidence Calculator & Face Power Yield
            </h3>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] font-mono text-amber-400">
              {eps.solarArrayPowerW.toFixed(2)} W TOTAL GENERATION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Calculates 3D angle of incidence θ_k = arccos(n̂_k · ŝ_body) for all CubeSat chassis faces and deployable solar array wings in real time.
          </p>
        </div>

        {/* Action Controls: Solar Panel Wing Toggle & Attitude Testbed */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSolarPanels}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              eps.solarPanelDeployed
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{eps.solarPanelDeployed ? 'Wings Deployed (+11W)' : 'Deploy Wings'}</span>
          </button>

          {/* Attitude Guidance Quick Selector */}
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
            {testModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setOrbitMode(m.id)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  adcs.mode === m.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: 3D Body Vector Compass & Face Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Body Frame Sun Vector Compass & 3D Isometric Face Schematic */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Sun Vector in Body Frame (ŝ_body)
              </span>
              <Compass className="w-4 h-4 text-cyan-400" />
            </div>

            {/* Sun Vector Cartesian Readout */}
            <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-center text-xs">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">ŝ_x (Pitch axis)</div>
                <div className={`font-bold ${Math.abs(sBody.x) > 0.5 ? 'text-amber-300' : 'text-slate-200'}`}>
                  {sBody.x > 0 ? `+${sBody.x.toFixed(3)}` : sBody.x.toFixed(3)}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">ŝ_y (Roll axis)</div>
                <div className={`font-bold ${Math.abs(sBody.y) > 0.5 ? 'text-amber-300' : 'text-slate-200'}`}>
                  {sBody.y > 0 ? `+${sBody.y.toFixed(3)}` : sBody.y.toFixed(3)}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">ŝ_z (Boresight)</div>
                <div className={`font-bold ${sBody.z > 0.7 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {sBody.z > 0 ? `+${sBody.z.toFixed(3)}` : sBody.z.toFixed(3)}
                </div>
              </div>
            </div>

            {/* Isometric Visual Schematic of CubeSat Chassis & Wings */}
            <div className="relative w-full h-44 bg-slate-950 rounded-lg border border-slate-800/90 flex items-center justify-center overflow-hidden p-2">
              <svg viewBox="0 0 260 170" className="w-full h-full">
                {/* Deployed Wing Left */}
                {eps.solarPanelDeployed && (
                  <g
                    onClick={() => setSelectedFaceId('WING_LEFT')}
                    className="cursor-pointer transition-all hover:opacity-80"
                  >
                    <polygon
                      points="20,70 65,50 65,115 20,135"
                      fill={sBody.z > 0.1 ? '#1d4ed8' : '#1e293b'}
                      stroke={selectedFaceId === 'WING_LEFT' ? '#fbbf24' : '#38bdf8'}
                      strokeWidth={selectedFaceId === 'WING_LEFT' ? 2 : 1}
                    />
                    <text x="24" y="105" fill="#e2e8f0" fontSize="8" fontFamily="monospace">
                      WING-L
                    </text>
                  </g>
                )}

                {/* 3U CubeSat Chassis (Isometric projection) */}
                {/* +Z Face (Top) */}
                <polygon
                  points="130,25 185,50 130,75 75,50"
                  fill={sBody.z > 0.1 ? (sBody.z > 0.7 ? '#f59e0b' : '#3b82f6') : '#1e293b'}
                  stroke={selectedFaceId === '+Z' ? '#fbbf24' : '#64748b'}
                  strokeWidth={selectedFaceId === '+Z' ? 2 : 1}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedFaceId('+Z')}
                />
                <text x="122" y="52" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  +Z
                </text>

                {/* -X / Port Face */}
                <polygon
                  points="75,50 130,75 130,145 75,120"
                  fill={sBody.x < -0.1 ? '#2563eb' : '#0f172a'}
                  stroke={selectedFaceId === '-X' ? '#fbbf24' : '#475569'}
                  strokeWidth={selectedFaceId === '-X' ? 2 : 1}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedFaceId('-X')}
                />
                <text x="96" y="105" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  -X
                </text>

                {/* +Y / Zenith Face */}
                <polygon
                  points="130,75 185,50 185,120 130,145"
                  fill={sBody.y > 0.1 ? '#2563eb' : '#0f172a'}
                  stroke={selectedFaceId === '+Y' ? '#fbbf24' : '#475569'}
                  strokeWidth={selectedFaceId === '+Y' ? 2 : 1}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedFaceId('+Y')}
                />
                <text x="152" y="105" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  +Y
                </text>

                {/* Deployed Wing Right */}
                {eps.solarPanelDeployed && (
                  <g
                    onClick={() => setSelectedFaceId('WING_RIGHT')}
                    className="cursor-pointer transition-all hover:opacity-80"
                  >
                    <polygon
                      points="195,50 240,70 240,135 195,115"
                      fill={sBody.z > 0.1 ? '#1d4ed8' : '#1e293b'}
                      stroke={selectedFaceId === 'WING_RIGHT' ? '#fbbf24' : '#38bdf8'}
                      strokeWidth={selectedFaceId === 'WING_RIGHT' ? 2 : 1}
                    />
                    <text x="200" y="105" fill="#e2e8f0" fontSize="8" fontFamily="monospace">
                      WING-R
                    </text>
                  </g>
                )}

                {/* Sun Ray Vector Direction Arrow */}
                <g>
                  <line
                    x1={130 - sBody.x * 40}
                    y1={75 - sBody.z * 40 - sBody.y * 20}
                    x2="130"
                    y2="75"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx={130 - sBody.x * 40}
                    cy={75 - sBody.z * 40 - sBody.y * 20}
                    r="4"
                    fill="#fbbf24"
                  />
                </g>
              </svg>

              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-400">
                Click faces to inspect details
              </div>
              <div className="absolute top-1 right-2 text-[9px] font-mono text-amber-400">
                ☀️ Sun Ray Vector
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-400">
            <span>Body Azimuth: {sunAzimuthDeg.toFixed(1)}°</span>
            <span>Elevation: {sunElevationDeg.toFixed(1)}°</span>
          </div>
        </div>

        {/* Right 2 Columns: Full Face-by-Face Telemetry Matrix */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-3">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Panel Face Incidence & Output Table
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {isUmbra ? 'ECLIPSE: 0 W' : `${(orbit.eclipseFraction * 100).toFixed(0)}% ILLUMINATED`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2.5 font-medium">Face</th>
                    <th className="py-2 px-2.5 font-medium">Normal [x,y,z]</th>
                    <th className="py-2 px-2.5 font-medium">Incidence θ</th>
                    <th className="py-2 px-2.5 font-medium">cos(θ)</th>
                    <th className="py-2 px-2.5 font-medium">Area</th>
                    <th className="py-2 px-2.5 font-medium">Power (W)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {panelFaces.map((f) => {
                    const isSelected = selectedFaceId === f.faceId;
                    const isLit = f.isIlluminated && !isUmbra;

                    return (
                      <tr
                        key={f.faceId}
                        onClick={() => setSelectedFaceId(f.faceId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-amber-950/30 text-amber-200'
                            : isLit
                            ? 'hover:bg-slate-800/40 text-slate-200'
                            : 'text-slate-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-2 px-2.5 font-bold flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isLit ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
                            }`}
                          />
                          <span>{f.faceId}</span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-400">
                          [{f.normalBody.x}, {f.normalBody.y}, {f.normalBody.z}]
                        </td>
                        <td className="py-2 px-2.5">
                          <span
                            className={`font-semibold ${
                              f.incidenceAngleDeg < 45 && isLit
                                ? 'text-emerald-400'
                                : f.incidenceAngleDeg < 80 && isLit
                                ? 'text-amber-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {f.incidenceAngleDeg.toFixed(1)}°
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">{f.cosIncidence.toFixed(3)}</td>
                        <td className="py-2 px-2.5 text-slate-400">{(f.areaM2 * 10000).toFixed(0)} cm²</td>
                        <td className="py-2 px-2.5 font-bold">
                          {isLit ? (
                            <span className="text-amber-400">+{f.powerOutputW.toFixed(2)} W</span>
                          ) : (
                            <span className="text-slate-400">0.00 W</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Face Deep-Dive Callout */}
          {activeFace && (
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{activeFace.name}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-400">
                    Incidence: {activeFace.incidenceAngleDeg.toFixed(2)}°
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Cell Efficiency: {activeFace.cellEfficiencyPercent.toFixed(2)}% (GaAs 3-Junction Derated @ {eps.solarPanelTempC.toFixed(1)}°C)
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400">EFFECTIVE YIELD:</div>
                <div className="text-sm font-bold text-amber-300">
                  {activeFace.powerOutputW.toFixed(2)} W (cosθ: {activeFace.cosIncidence.toFixed(4)})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
