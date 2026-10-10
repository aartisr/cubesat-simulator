import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { GNSSConstellation, SoundingPoint } from '../../types/telemetry';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Globe,
  Cpu,
  Radio,
  Activity,
  Layers,
  Thermometer,
  Zap,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Wind,
  ShieldCheck,
  TrendingDown,
  Compass,
} from 'lucide-react';

export const GNSSROModule: React.FC = () => {
  const gnssRO = useSimulatorStore((s) => s.gnssRO);
  const orbit = useSimulatorStore((s) => s.orbit);
  const toggleGNSSROPayload = useSimulatorStore((s) => s.toggleGNSSROPayload);
  const selectSounding = useSimulatorStore((s) => s.selectSounding);
  const triggerManualSounding = useSimulatorStore((s) => s.triggerManualSounding);
  const toggleGNSSConstellation = useSimulatorStore((s) => s.toggleGNSSConstellation);
  const setEdgeAIPowerMode = useSimulatorStore((s) => s.setEdgeAIPowerMode);

  const [activeTab, setActiveTab] = useState<'TEMPERATURE' | 'REFRACTIVITY' | 'PRESSURE' | 'HUMIDITY' | 'ERROR'>('TEMPERATURE');

  if (!gnssRO) return null;

  const {
    enabled,
    activeOccultations,
    completedSoundings,
    selectedSoundingId,
    edgeAI,
    filterConstellations,
    totalPowerDrawW,
  } = gnssRO;

  // Selected sounding for deep vertical inspection
  const selectedSounding =
    completedSoundings.find((s) => s.id === selectedSoundingId) ||
    activeOccultations.find((s) => s.id === selectedSoundingId) ||
    completedSoundings[0] ||
    activeOccultations[0];

  const profileData: SoundingPoint[] = selectedSounding?.profile || [];

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner: Paradigm & Value-Add Overview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              GNSS Radio Occultation + Edge-AI Micro-Controller
            </h2>
            <span className="text-slate-400">·</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              3U/6U Envelope · Zero Moving Parts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Leverages grazing L-band GPS/Galileo signals refracted by Earth&apos;s atmospheric limb to retrieve continuous, sub-kilometer vertical climate soundings (temperature, pressure, humidity). An onboard Edge-AI MCU performs neural Abel inversion and 13,600:1 data reduction, eliminating ground station downlink bottlenecks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Total Downlink Saved:</div>
            <div className="text-xs font-mono font-bold text-emerald-400">
              {edgeAI.totalDataDownlinkSavedMB.toFixed(1)} MB (99.993% Reduced)
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleGNSSROPayload()}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-2 ${
              enabled
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{enabled ? 'RO Sounder Active' : 'Payload Standby'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerManualSounding()}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 transition-all flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 text-indigo-400" />
            <span>Trigger Sounding</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Subsystem Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Planetary Soundings Rate */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] uppercase tracking-wider">Global Soundings</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {completedSoundings.length} <span className="text-xs font-normal text-slate-400">completed</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Rate: ~14.5 soundings/hr (350/day)
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
            Full planetary limb coverage
          </div>
        </div>

        {/* Metric 2: Edge-AI Data Reduction */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] uppercase tracking-wider">Data Compression</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              13,600 : 1
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              24.8 MB raw $\to$ 1.82 KB BUFR
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-emerald-500 font-mono flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            99.993% downlink bandwidth saved
          </div>
        </div>

        {/* Metric 3: Edge-AI Micro-Controller NPU */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] uppercase tracking-wider">Edge-AI Latency</span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {edgeAI.inferenceLatencyMs.toFixed(1)} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              ARM Cortex-M55 + Ethos-U55
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
            INT8 Quantized Neural Inversion
          </div>
        </div>

        {/* Metric 4: Payload Power & Volume Footprint */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] uppercase tracking-wider">Payload Power Draw</span>
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-yellow-400">
              {enabled ? totalPowerDrawW.toFixed(2) : '0.05'} <span className="text-xs font-normal text-slate-400">W</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              RF: {enabled ? '1.15W' : '0W'} · NPU: {enabled ? `${edgeAI.powerConsumptionW.toFixed(2)}W` : '0.05W'}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
            Fits in 1U CubeSat payload bay
          </div>
        </div>
      </div>

      {/* Main Section: 2D Planetary Limb Map + Vertical Sounding Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 Cols): Planetary Sounding Map & Active Occultation Tracker */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Planetary Limb Sounding Map
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Click pin to inspect profile
              </span>
            </div>

            {/* 2D Equirectangular Cartographic Projection */}
            <div className="relative w-full aspect-[2/1] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
              <svg viewBox="0 0 360 180" className="w-full h-full">
                {/* Lat/Lon Grid lines */}
                <line x1="0" y1="90" x2="360" y2="90" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="180" y1="0" x2="180" y2="180" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="0" y1="45" x2="360" y2="45" stroke="#1e293b" strokeWidth="0.4" />
                <line x1="0" y1="135" x2="360" y2="135" stroke="#1e293b" strokeWidth="0.4" />
                <line x1="90" y1="0" x2="90" y2="180" stroke="#1e293b" strokeWidth="0.4" />
                <line x1="270" y1="0" x2="270" y2="180" stroke="#1e293b" strokeWidth="0.4" />

                {/* Simplified Continents Outline */}
                {/* North America */}
                <path d="M 50,40 L 75,35 L 95,45 L 90,65 L 75,70 L 60,60 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* South America */}
                <path d="M 85,90 L 105,95 L 95,140 L 80,120 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Eurasia */}
                <path d="M 160,35 L 230,30 L 260,55 L 240,75 L 180,65 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Africa */}
                <path d="M 170,75 L 205,80 L 195,130 L 175,100 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                {/* Australia */}
                <path d="M 270,115 L 305,115 L 295,145 L 270,135 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />

                {/* Completed Soundings Pins */}
                {completedSoundings.map((snd) => {
                  const x = ((snd.tangentLon + 180) / 360) * 360;
                  const y = ((90 - snd.tangentLat) / 180) * 180;
                  const isSel = snd.id === selectedSounding?.id;
                  const hasAnomaly = Boolean(snd.anomalyDetected);

                  return (
                    <g
                      key={snd.id}
                      onClick={() => selectSounding(snd.id)}
                      className="cursor-pointer transition-transform hover:scale-125"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isSel ? 4.5 : 2.5}
                        fill={hasAnomaly ? '#f59e0b' : '#38bdf8'}
                        stroke={isSel ? '#ffffff' : '#0284c7'}
                        strokeWidth={isSel ? 1.5 : 0.6}
                      />
                      {isSel && (
                        <circle
                          cx={x}
                          cy={y}
                          r={7}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="0.8"
                          className="animate-ping"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Active Occultation Tangent Point & Ray Projection */}
                {activeOccultations.map((occ) => {
                  const x = ((occ.tangentLon + 180) / 360) * 360;
                  const y = ((90 - occ.tangentLat) / 180) * 180;
                  const satX = ((orbit.geodetic.longitude + 180) / 360) * 360;
                  const satY = ((90 - orbit.geodetic.latitude) / 180) * 180;

                  return (
                    <g key={occ.id}>
                      {/* Atmospheric Ray Line-of-sight from satellite to tangent point */}
                      <line
                        x1={satX}
                        y1={satY}
                        x2={x}
                        y2={y}
                        stroke="#06b6d4"
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                      />
                      <circle cx={x} cy={y} r="4" fill="#06b6d4" className="animate-pulse" />
                      <circle cx={x} cy={y} r="8" fill="none" stroke="#22d3ee" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Satellite Current Sub-Satellite Point */}
                <g>
                  {(() => {
                    const satX = ((orbit.geodetic.longitude + 180) / 360) * 360;
                    const satY = ((90 - orbit.geodetic.latitude) / 180) * 180;
                    return (
                      <g>
                        <circle cx={satX} cy={satY} r="3" fill="#a855f7" />
                        <text
                          x={satX + 5}
                          y={satY - 3}
                          fill="#c084fc"
                          fontSize="7"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          PCSS-II (LEO)
                        </text>
                      </g>
                    );
                  })()}
                </g>
              </svg>

              <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                Blue: Nominal · Amber: Climate Anomaly · Purple: CubeSat
              </div>
            </div>

            {/* Active Limb Tracking Occultation Cards */}
            <div className="space-y-2 mt-1">
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Active Occultation Tracks</span>
                <span className="text-[10px] font-mono text-cyan-400">{activeOccultations.length} Active</span>
              </div>

              {activeOccultations.map((occ) => (
                <div
                  key={occ.id}
                  onClick={() => selectSounding(occ.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer text-xs font-mono flex flex-col gap-1.5 ${
                    occ.id === selectedSounding?.id
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-cyan-400" />
                      {occ.gnssSatellite}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {occ.type} LIMB
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Tangent Alt: {occ.tangentAltitudeKm.toFixed(1)} km</span>
                    <span>Doppler: {occ.excessDopplerHz.toFixed(1)} Hz</span>
                  </div>

                  {/* Descent Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${occ.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Status: {occ.status}</span>
                    <span>Progress: {occ.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Target Constellations Multi-Select */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 mb-2 font-mono">TRACKED CONSTELLATIONS:</div>
              <div className="flex flex-wrap gap-2">
                {(['GPS', 'GALILEO', 'GLONASS', 'BEIDOU'] as GNSSConstellation[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleGNSSConstellation(c)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-colors ${
                      filterConstellations[c]
                        ? 'bg-slate-800 border-cyan-500/50 text-cyan-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Edge-AI Micro-Controller Specifications Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Edge-AI Microcontroller Subsystem
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">ACTIVE INT8</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">MCU Hardware:</span>
                <span className="text-slate-200 font-bold">{edgeAI.processorModel}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Quantization Scheme:</span>
                <span className="text-amber-300">INT8 (CMSIS-NN / TFLite Micro)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">SRAM Footprint:</span>
                <span className="text-slate-200">
                  {edgeAI.sramUsageKB} / {edgeAI.maxSramKB} KB ({((edgeAI.sramUsageKB / edgeAI.maxSramKB) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Flash Model Size:</span>
                <span className="text-slate-200">
                  {edgeAI.flashModelSizeKB} / {edgeAI.maxFlashKB} KB ({((edgeAI.flashModelSizeKB / edgeAI.maxFlashKB) * 100).toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Retrieval RMSE Error:</span>
                <span className="text-emerald-400">{edgeAI.neuralAbelErrorRmsePercent}% vs Abel reference</span>
              </div>
            </div>

            {/* Power Mode Selector */}
            <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">MCU Power Mode:</span>
              <div className="flex gap-1.5">
                {(['ACTIVE_INFERENCE', 'BURST_NEURAL', 'DEEP_SLEEP'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEdgeAIPowerMode(m)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      edgeAI.powerMode === m
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {m === 'ACTIVE_INFERENCE' ? 'Nominal' : m === 'BURST_NEURAL' ? 'Burst' : 'Sleep'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Vertical Sounding Profiles & Recharts Visualizer */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
            {/* Header with Selected Sounding Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Vertical Atmospheric Sounding Profile
                  </h3>
                  <span className="text-slate-400">·</span>
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    {selectedSounding?.gnssSatellite || 'No Selection'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Location: {selectedSounding?.climateRegion} ({selectedSounding?.tangentLat.toFixed(1)}°, {selectedSounding?.tangentLon.toFixed(1)}°)
                </div>
              </div>

              {/* Anomaly Badge */}
              {selectedSounding?.anomalyDetected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-300 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedSounding.anomalyDetected}</span>
                </div>
              )}
            </div>

            {/* Profile Tab Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('TEMPERATURE')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  activeTab === 'TEMPERATURE'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Temperature T(z) & Edge-AI
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REFRACTIVITY')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  activeTab === 'REFRACTIVITY'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Refractivity N & Bending Angle
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PRESSURE')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  activeTab === 'PRESSURE'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Barometric Pressure P(z)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HUMIDITY')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  activeTab === 'HUMIDITY'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Specific Humidity q(z)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ERROR')}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  activeTab === 'ERROR'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Edge-AI INT8 Residuals
              </button>
            </div>

            {/* Recharts Atmospheric Plot Container */}
            <div className="w-full h-80 bg-slate-950 p-2 sm:p-3 rounded-lg border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'TEMPERATURE' ? (
                  <LineChart data={profileData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="temperatureC"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="altitudeKm"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(2)} °C` : String(val)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="temperatureC"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      name="Abel Analytical Truth (°C)"
                    />
                    <Line
                      type="monotone"
                      dataKey="int8NeuralTempC"
                      stroke="#f59e0b"
                      strokeWidth={1.8}
                      strokeDasharray="4 2"
                      dot={false}
                      name="Edge-AI INT8 Neural Reconstructed (°C)"
                    />
                  </LineChart>
                ) : activeTab === 'REFRACTIVITY' ? (
                  <LineChart data={profileData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="refractivityN"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Atmospheric Refractivity N (N-units)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="altitudeKm"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(1)} N-units` : String(val)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="refractivityN"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Refractivity N (Smith-Weintraub)"
                    />
                    <Line
                      type="monotone"
                      dataKey="bendingAngleMicrorad"
                      stroke="#10b981"
                      strokeWidth={1.8}
                      dot={false}
                      name="Bending Angle (μrad)"
                    />
                  </LineChart>
                ) : activeTab === 'PRESSURE' ? (
                  <LineChart data={profileData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="pressureHPa"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Barometric Pressure (hPa)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="altitudeKm"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(1)} hPa` : String(val)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="pressureHPa"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      name="Barometric Pressure P(z) (hPa)"
                    />
                  </LineChart>
                ) : activeTab === 'HUMIDITY' ? (
                  <LineChart data={profileData.filter((d) => d.altitudeKm <= 15)} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="specificHumidityGKg"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Specific Humidity q (g/kg)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="altitudeKm"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(2)} g/kg` : String(val)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="specificHumidityGKg"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                      name="Specific Humidity q (0-15 km)"
                    />
                  </LineChart>
                ) : (
                  <LineChart data={profileData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="int8ErrorDegC"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'INT8 Quantization Residual |T_int8 - T_abel| (°C)', position: 'insideBottom', offset: -12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="altitudeKm"
                      stroke="#64748b"
                      fontSize={11}
                      label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                      formatter={(val: unknown) => [typeof val === 'number' ? `${val.toFixed(3)} °C` : String(val)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                    <Line
                      type="monotone"
                      dataKey="int8ErrorDegC"
                      stroke="#ef4444"
                      strokeWidth={1.8}
                      dot={false}
                      name="Neural Quantization Error (°C)"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Profile Level Inspection Table (Sample Vertical Layers) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-1.5 px-2">Alt (km)</th>
                    <th className="py-1.5 px-2">Temp (°C)</th>
                    <th className="py-1.5 px-2">Edge-AI INT8</th>
                    <th className="py-1.5 px-2">Pres (hPa)</th>
                    <th className="py-1.5 px-2">Refractivity N</th>
                    <th className="py-1.5 px-2">Humidity (g/kg)</th>
                    <th className="py-1.5 px-2">Atm Layer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {profileData
                    .filter((_, idx) => idx % 6 === 0)
                    .map((pt) => {
                      const layer =
                        pt.altitudeKm <= 12
                          ? 'Troposphere'
                          : pt.altitudeKm <= 20
                          ? 'Tropopause'
                          : pt.altitudeKm <= 47
                          ? 'Stratosphere'
                          : 'Mesosphere';

                      return (
                        <tr key={pt.altitudeKm} className="hover:bg-slate-900/40">
                          <td className="py-1 px-2 font-bold text-white">{pt.altitudeKm.toFixed(1)}</td>
                          <td className="py-1 px-2 text-cyan-300">{pt.temperatureC.toFixed(1)}°C</td>
                          <td className="py-1 px-2 text-amber-300">{pt.int8NeuralTempC.toFixed(1)}°C</td>
                          <td className="py-1 px-2 text-slate-300">{pt.pressureHPa.toFixed(1)}</td>
                          <td className="py-1 px-2 text-slate-300">{pt.refractivityN.toFixed(1)}</td>
                          <td className="py-1 px-2 text-slate-300">{pt.specificHumidityGKg.toFixed(2)}</td>
                          <td className="py-1 px-2 text-slate-400">{layer}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
