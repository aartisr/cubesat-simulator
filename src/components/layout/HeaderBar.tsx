import React, { useState, useEffect } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { Play, Pause, RotateCcw, Clock, Satellite, BookOpen } from 'lucide-react';

interface HeaderBarProps {
  onOpenDocs?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenDocs }) => {
  const simulatedTime = useSimulatorStore((s) => s.simulatedTime);
  const realStartTime = useSimulatorStore((s) => s.realStartTime);
  const timeWarp = useSimulatorStore((s) => s.timeWarp);
  const isPlaying = useSimulatorStore((s) => s.isPlaying);
  const setTimeWarp = useSimulatorStore((s) => s.setTimeWarp);
  const togglePlay = useSimulatorStore((s) => s.togglePlay);
  const resetSimulation = useSimulatorStore((s) => s.resetSimulation);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);
  const orbit = useSimulatorStore((s) => s.orbit);

  // Format UTC time
  const simDate = new Date(simulatedTime);
  const utcString = simDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // Mission Elapsed Time (MET)
  const elapsedSec = Math.floor((simulatedTime - realStartTime) / 1000);
  const d = Math.floor(elapsedSec / 86400);
  const h = Math.floor((elapsedSec % 86400) / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const metString = `MET+ ${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;

  const warpOptions = [1, 5, 10, 30, 60, 300];

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Project Branding & Satellite Name */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-950/40">
            <Satellite className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-widest text-white uppercase font-mono">
                ASTRONEER
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-semibold text-cyan-400 tracking-wide">
                MISSION STUDIO
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span className="truncate">{selectedSatellite.name}</span>
              <span className="text-slate-400">/</span>
              <span>{selectedSatellite.formFactor} BUS</span>
              <span className="text-slate-400">/</span>
              <span className={orbit.j2Enabled ? 'text-emerald-400' : 'text-amber-400'}>
                {orbit.j2Enabled ? 'J2 PERTURBED' : '2-BODY KEPLER'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mission clock, intentionally kept readable before advanced controls */}
        <div aria-label="Simulation clock" className="flex max-w-full items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 self-start md:self-center font-mono sm:gap-4 sm:px-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-200">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SIM:</span>
            <span className="font-semibold text-white whitespace-nowrap">{utcString}</span>
          </div>

          <div className="hidden sm:block text-slate-700">|</div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            <span className="text-cyan-400 font-bold">{metString}</span>
          </div>
        </div>

        {/* Right: Time Warp & Simulation Controls */}
        <div className="flex max-w-full items-center gap-1.5 self-start md:self-center sm:gap-2.5">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause simulation' : 'Resume simulation'}
            className={`p-2 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isPlaying
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Time Warp Multipliers */}
          <div aria-label="Simulation speed" className="flex items-center gap-0.5 p-1 bg-slate-900/80 rounded-lg border border-slate-800 font-mono text-xs sm:gap-1">
            {warpOptions.map((warp) => (
              <button
                key={warp}
                onClick={() => setTimeWarp(warp)}
                aria-pressed={timeWarp === warp}
                aria-label={`Set simulation speed to ${warp} times real time`}
                className={`px-1.5 py-1 rounded transition-colors font-medium sm:px-2 ${
                  timeWarp === warp && isPlaying
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {warp}x
              </button>
            ))}
          </div>

          {/* Reset button */}
          <button
            onClick={resetSimulation}
            aria-label="Reset simulation to the current epoch"
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="Reset Simulation Epoch"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Flight Specification Monograph Link */}
          {onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono font-medium text-cyan-300 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Open Technical Monograph & Flight Specification"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Flight Spec</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
