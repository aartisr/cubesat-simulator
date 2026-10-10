import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { ThermalNodeId } from '../../types/telemetry';
import {
  Thermometer,
  Flame,
  Zap,
  Cpu,
  Radio,
  RotateCw,
  Layers,
  ArrowRight,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export const CubeSatThermalCutaway: React.FC = () => {
  const thermal = useSimulatorStore((s) => s.thermal);
  const eps = useSimulatorStore((s) => s.eps);
  const [selectedNodeId, setSelectedNodeId] = useState<ThermalNodeId>('BATTERY');

  const nodes = thermal.nodes;
  const selectedNode = nodes[selectedNodeId] || nodes['BATTERY'];

  // Temperature color mapper
  const getTempColor = (tempC: number) => {
    if (tempC < 0) return { bg: 'bg-indigo-950/70', border: 'border-indigo-500/60', text: 'text-indigo-400', hex: '#6366f1' };
    if (tempC < 15) return { bg: 'bg-cyan-950/70', border: 'border-cyan-500/60', text: 'text-cyan-400', hex: '#06b6d4' };
    if (tempC < 30) return { bg: 'bg-emerald-950/70', border: 'border-emerald-500/60', text: 'text-emerald-400', hex: '#10b981' };
    if (tempC < 48) return { bg: 'bg-amber-950/70', border: 'border-amber-500/60', text: 'text-amber-400', hex: '#f59e0b' };
    return { bg: 'bg-rose-950/70', border: 'border-rose-500/60', text: 'text-rose-400', hex: '#f43f5e' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOMINAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Nominal</span>;
      case 'HOT_WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Hot Warning</span>;
      case 'COLD_WARNING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cold Warning</span>;
      case 'CRITICAL_HOT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-pulse flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Critical Hot</span>;
      case 'CRITICAL_COLD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/50 animate-pulse flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Critical Cold</span>;
      default:
        return null;
    }
  };

  const louverAngle = (thermal.controls.louverAperturePercent / 100) * 80; // 0 to 80 deg rotation

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              3U CubeSat Internal Multi-Node Thermal Cross-Section
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time conductive and radiative nodal network. Select any internal component node for thermal telemetry analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Mean Core:</span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            {thermal.internalMeanTempC.toFixed(1)}°C
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400">Louver State:</span>
          <span className="font-bold text-cyan-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
            {thermal.controls.louverAperturePercent.toFixed(0)}% Open
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Schematic Blueprint Canvas (SVG Cross-Section) */}
        <div className="lg:col-span-7 bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 relative overflow-hidden flex flex-col items-center justify-center">
          {/* Subtle aerospace grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Top Label */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 z-10">
            <span>+Z NADIR (EARTH-FACING)</span>
            <span>3U BUS CAD SCHEMATIC</span>
            <span>-Z ZENITH (DEEP SPACE)</span>
          </div>

          {/* SVG CubeSat Cutaway Diagram */}
          <svg
            viewBox="0 0 540 380"
            className="w-full max-w-[500px] h-auto select-none z-10"
          >
            <defs>
              {/* Thermal strap heat gradient */}
              <linearGradient id="heatStrapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>

              {/* Chassis structural gradient */}
              <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* External Solar Panels (Top & Bottom wings) */}
            {eps.solarPanelDeployed && (
              <g
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => setSelectedNodeId('SOLAR_PANELS')}
              >
                {/* Left Solar Wing */}
                <rect
                  x="20"
                  y="120"
                  width="70"
                  height="140"
                  rx="4"
                  fill="#0c4a6e"
                  stroke={getTempColor(nodes['SOLAR_PANELS'].temperatureC).hex}
                  strokeWidth={selectedNodeId === 'SOLAR_PANELS' ? '2.5' : '1.2'}
                  opacity="0.9"
                />
                {/* Solar Wing Grid Lines */}
                <line x1="20" y1="155" x2="90" y2="155" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                <line x1="20" y1="190" x2="90" y2="190" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                <line x1="20" y1="225" x2="90" y2="225" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                <line x1="55" y1="120" x2="55" y2="260" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                {/* Hinge mount */}
                <rect x="90" y="180" width="15" height="20" fill="#334155" rx="2" />
                <text x="55" y="110" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  WING-L ({nodes['SOLAR_PANELS'].temperatureC.toFixed(0)}°C)
                </text>
              </g>
            )}

            {/* External Right Radiator Panel with Variable Louvers */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('RADIATOR')}
            >
              <rect
                x="435"
                y="110"
                width="75"
                height="160"
                rx="4"
                fill="#0f172a"
                stroke={getTempColor(nodes['RADIATOR'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'RADIATOR' ? '2.5' : '1.5'}
              />
              <text x="472" y="100" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
                RADIATOR (-Y)
              </text>
              <text x="472" y="285" fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                {nodes['RADIATOR'].temperatureC.toFixed(1)}°C
              </text>

              {/* Animated Louver Blades (4 blades showing opening angle) */}
              {[125, 160, 195, 230].map((yPos, i) => (
                <g key={i}>
                  {/* Blade Frame base */}
                  <rect x="442" y={yPos} width="60" height="22" fill="#1e293b" rx="2" opacity="0.4" />
                  {/* Rotating Blade */}
                  <line
                    x1="445"
                    y1={yPos + 11}
                    x2={445 + 54 * Math.cos((louverAngle * Math.PI) / 180)}
                    y2={yPos + 11 - 18 * Math.sin((louverAngle * Math.PI) / 180)}
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Blade Pivot Dot */}
                  <circle cx="445" cy={yPos + 11} r="2.5" fill="#38bdf8" />
                </g>
              ))}
            </g>

            {/* Main 3U CubeSat Aluminum Chassis Structure Frame */}
            <rect
              x="105"
              y="50"
              width="330"
              height="280"
              rx="8"
              fill="url(#chassisGrad)"
              stroke={selectedNodeId === 'CHASSIS' ? '#06b6d4' : '#334155'}
              strokeWidth={selectedNodeId === 'CHASSIS' ? '3' : '2'}
              className="cursor-pointer"
              onClick={() => setSelectedNodeId('CHASSIS')}
            />

            {/* Aluminum Rails & Corner Fasteners */}
            <rect x="110" y="55" width="320" height="8" fill="#475569" opacity="0.8" />
            <rect x="110" y="317" width="320" height="8" fill="#475569" opacity="0.8" />
            <rect x="110" y="55" width="8" height="270" fill="#475569" opacity="0.8" />
            <rect x="422" y="55" width="8" height="270" fill="#475569" opacity="0.8" />

            {/* Conductive Heat Pipe / Thermal Strap line (From OBC & RF PA to Radiator) */}
            <path
              d="M 280 200 L 375 200 L 435 190"
              fill="none"
              stroke="url(#heatStrapGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={thermal.controls.thermalStrapMode === 'ISOLATED' ? '4,4' : 'none'}
              filter="url(#glow)"
              opacity={thermal.controls.thermalStrapMode === 'ISOLATED' ? 0.4 : 0.9}
            />
            <text x="350" y="190" fill="#f43f5e" fontSize="9" fontFamily="monospace">
              HEAT STRAP ({thermal.controls.thermalStrapMode})
            </text>

            {/* --- INTERNAL COMPONENTS (3U Stacks) --- */}

            {/* 1. ADCS Reaction Wheels (Upper Stack) */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('ADCS_WHEELS')}
            >
              <rect
                x="130"
                y="75"
                width="140"
                height="50"
                rx="5"
                fill={nodes['ADCS_WHEELS'].id === selectedNodeId ? '#0f293d' : '#091522'}
                stroke={getTempColor(nodes['ADCS_WHEELS'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'ADCS_WHEELS' ? '2.5' : '1.5'}
              />
              <circle cx="150" cy="100" r="14" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
              <path d="M 143 100 A 7 7 0 1 1 157 100" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <text x="175" y="95" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                ADCS RW-3
              </text>
              <text x="175" y="112" fill={getTempColor(nodes['ADCS_WHEELS'].temperatureC).hex} fontSize="10" fontFamily="monospace">
                {nodes['ADCS_WHEELS'].temperatureC.toFixed(1)}°C · {nodes['ADCS_WHEELS'].internalHeatDissipationW.toFixed(1)}W
              </text>
            </g>

            {/* 2. GNSS-RO Payload Receiver (Upper-Mid Stack) */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('PAYLOAD_GNSS')}
            >
              <rect
                x="130"
                y="135"
                width="140"
                height="50"
                rx="5"
                fill={nodes['PAYLOAD_GNSS'].id === selectedNodeId ? '#0f293d' : '#091522'}
                stroke={getTempColor(nodes['PAYLOAD_GNSS'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'PAYLOAD_GNSS' ? '2.5' : '1.5'}
              />
              {/* GNSS Antenna symbol */}
              <circle cx="150" cy="160" r="12" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
              <text x="175" y="155" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                GNSS-RO LNA
              </text>
              <text x="175" y="172" fill={getTempColor(nodes['PAYLOAD_GNSS'].temperatureC).hex} fontSize="10" fontFamily="monospace">
                {nodes['PAYLOAD_GNSS'].temperatureC.toFixed(1)}°C · {nodes['PAYLOAD_GNSS'].internalHeatDissipationW.toFixed(1)}W
              </text>
              {nodes['PAYLOAD_GNSS'].heaterActive && (
                <circle cx="260" cy="145" r="4" fill="#f59e0b" className="animate-ping" />
              )}
            </g>

            {/* 3. OBC Core & Edge AI Processor (Lower-Mid Stack) */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('OBC_CORE')}
            >
              <rect
                x="130"
                y="195"
                width="140"
                height="55"
                rx="5"
                fill={nodes['OBC_CORE'].id === selectedNodeId ? '#0f293d' : '#091522'}
                stroke={getTempColor(nodes['OBC_CORE'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'OBC_CORE' ? '2.5' : '1.5'}
              />
              {/* CPU Chip Graphic */}
              <rect x="140" y="207" width="22" height="22" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" rx="3" />
              <text x="175" y="217" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                OBC / Edge AI
              </text>
              <text x="175" y="234" fill={getTempColor(nodes['OBC_CORE'].temperatureC).hex} fontSize="10" fontFamily="monospace">
                {nodes['OBC_CORE'].temperatureC.toFixed(1)}°C · {nodes['OBC_CORE'].internalHeatDissipationW.toFixed(1)}W
              </text>
            </g>

            {/* 4. Battery Pack (LiFePO4) (Bottom Stack) */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('BATTERY')}
            >
              <rect
                x="130"
                y="260"
                width="280"
                height="50"
                rx="5"
                fill={nodes['BATTERY'].id === selectedNodeId ? '#0f293d' : '#091522'}
                stroke={getTempColor(nodes['BATTERY'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'BATTERY' ? '2.5' : '1.5'}
              />
              {/* Battery cell icon */}
              <rect x="140" y="272" width="26" height="24" rx="3" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
              <rect x="166" y="279" width="3" height="10" fill="#10b981" rx="1" />
              <text x="180" y="282" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                LiFePO4 Battery Pack (8.2V 42Wh)
              </text>
              <text x="180" y="299" fill={getTempColor(nodes['BATTERY'].temperatureC).hex} fontSize="10" fontFamily="monospace">
                {nodes['BATTERY'].temperatureC.toFixed(1)}°C · {nodes['BATTERY'].internalHeatDissipationW.toFixed(1)}W {nodes['BATTERY'].heaterActive ? '🔥 HEATER ACTIVE' : ''}
              </text>
              {nodes['BATTERY'].heaterActive && (
                <g>
                  <circle cx="395" cy="285" r="5" fill="#f59e0b" className="animate-ping" />
                  <text x="350" y="280" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                    +3.2W
                  </text>
                </g>
              )}
            </g>

            {/* 5. RF Power Amplifier Hotspot (Right Mid) */}
            <g
              className="cursor-pointer transition-all hover:opacity-90"
              onClick={() => setSelectedNodeId('RF_PA')}
            >
              <rect
                x="285"
                y="110"
                width="125"
                height="75"
                rx="5"
                fill={nodes['RF_PA'].id === selectedNodeId ? '#0f293d' : '#091522'}
                stroke={getTempColor(nodes['RF_PA'].temperatureC).hex}
                strokeWidth={selectedNodeId === 'RF_PA' ? '2.5' : '1.5'}
              />
              <circle cx="305" cy="135" r="12" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="325" y="132" fill="#f1f5f9" fontSize="11" fontWeight="600" fontFamily="sans-serif">
                RF PA Hotspot
              </text>
              <text x="325" y="148" fill={getTempColor(nodes['RF_PA'].temperatureC).hex} fontSize="10" fontFamily="monospace">
                {nodes['RF_PA'].temperatureC.toFixed(1)}°C
              </text>
              <text x="325" y="165" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {nodes['RF_PA'].internalHeatDissipationW.toFixed(1)} W Dissipated
              </text>
            </g>

            {/* Multi-Layer Insulation (MLI) Blanket Indicator */}
            <rect
              x="116"
              y="60"
              width="308"
              height="6"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="0.5"
              strokeDasharray="3,3"
              opacity="0.8"
            />
            <text x="260" y="42" fill="#eab308" fontSize="9" fontFamily="monospace" textAnchor="middle">
              MLI THERMAL BLANKET (α = 0.14, ε = 0.05)
            </text>
          </svg>

          {/* Color Key Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 z-10">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500" /> &lt; 0°C Cold</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-cyan-500" /> 0–15°C Chilled</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> 15–30°C Nominal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> 30–48°C Warm</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> &gt; 48°C Hot</span>
          </div>
        </div>

        {/* Selected Thermal Node Deep-Dive Card */}
        <div className="lg:col-span-5 bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase">Selected Node Telemetry</div>
              <h4 className="text-base font-bold text-white mt-0.5">{selectedNode.name}</h4>
            </div>
            {getStatusBadge(selectedNode.status)}
          </div>

          {/* Big Temperature Readout */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Current Node Temperature:</div>
              <div className={`text-3xl font-mono font-bold mt-1 ${getTempColor(selectedNode.temperatureC).text}`}>
                {selectedNode.temperatureC.toFixed(2)} <span className="text-sm font-normal text-slate-400">°C</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                {selectedNode.temperatureK.toFixed(2)} K · ΔT/Δt: {selectedNode.rateOfTempChangeCPerMin >= 0 ? '+' : ''}{selectedNode.rateOfTempChangeCPerMin.toFixed(2)} °C/min
              </div>
            </div>

            <div className="text-right">
              <Thermometer className={`w-8 h-8 ${getTempColor(selectedNode.temperatureC).text}`} />
            </div>
          </div>

          {/* Operating Limits vs Survival Limits Progress Gauge */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Operational Limit Range:</span>
              <span className="text-cyan-300 font-semibold">{selectedNode.minOperatingTempC}°C to {selectedNode.maxOperatingTempC}°C</span>
            </div>

            {/* Visual Temperature Scale Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
              {/* Safe zone indicator */}
              <div
                className="absolute h-full bg-emerald-500/20 border-x border-emerald-500/50"
                style={{
                  left: `${Math.max(0, Math.min(100, ((selectedNode.minOperatingTempC + 60) / 160) * 100))}%`,
                  width: `${Math.max(10, Math.min(100, ((selectedNode.maxOperatingTempC - selectedNode.minOperatingTempC) / 160) * 100))}%`,
                }}
              />
              {/* Current temperature pointer needle */}
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-md transition-all duration-300"
                style={{
                  left: `${Math.max(0, Math.min(98, ((selectedNode.temperatureC + 60) / 160) * 100))}%`,
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-0.5">
              <span>Survival Min: {selectedNode.minSurvivalTempC}°C</span>
              <span>Survival Max: {selectedNode.maxSurvivalTempC}°C</span>
            </div>
          </div>

          {/* Heat Balance & Power Coupling Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-1">
            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Internal Heat Gen:</span>
              <span className="text-amber-400 font-bold text-sm">+{selectedNode.internalHeatDissipationW.toFixed(2)} W</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Electrical waste</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Net Thermal Flow:</span>
              <span className={`font-bold text-sm ${selectedNode.netHeatFlowW >= 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {selectedNode.netHeatFlowW >= 0 ? '+' : ''}{selectedNode.netHeatFlowW.toFixed(2)} W
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">dQ/dt equilibrium</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Conductive Transfer:</span>
              <span className="text-slate-300 font-bold text-sm">
                {selectedNode.conductiveHeatTransferW >= 0 ? '+' : ''}{selectedNode.conductiveHeatTransferW.toFixed(2)} W
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Adjacent structural rails</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <span className="text-slate-400 block text-[10px]">Heat Capacity:</span>
              <span className="text-slate-300 font-bold text-sm">{selectedNode.heatCapacityJPerK} J/K</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Lumped mass C = m·c</span>
            </div>
          </div>

          {/* Quick node switcher buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-800/80">
            {(Object.keys(nodes) as ThermalNodeId[]).map((id) => (
              <button
                key={id}
                onClick={() => setSelectedNodeId(id)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded border transition-all ${
                  selectedNodeId === id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {id.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
