import React, { useRef, useEffect } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { usePassPredictionsQuery } from '../../services/telemetryQuery';
import { Radio, Signal, Wifi, Activity, Database, ArrowDownCircle, CheckCircle2, Clock } from 'lucide-react';

export const CommsModule: React.FC = () => {
  const comms = useSimulatorStore((s) => s.comms);
  const orbit = useSimulatorStore((s) => s.orbit);
  const activeStation = useSimulatorStore((s) => s.activeGroundStation);
  const { data: passes, isLoading: passesLoading } = usePassPredictionsQuery();

  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);

  // Animated RF Waterfall Spectrum Canvas
  useEffect(() => {
    const canvas = waterfallCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Shift existing waterfall down by 2px
    const imgData = ctx.getImageData(0, 0, width, height - 2);
    ctx.putImageData(imgData, 0, 2);

    // Draw new top line based on signal-to-noise ratio and Doppler shift
    const centerBin = Math.floor(width / 2);
    const dopplerOffset = Math.floor((comms.dopplerShiftHz / 15000) * (width / 4));
    const carrierBin = centerBin + dopplerOffset;

    for (let x = 0; x < width; x++) {
      let intensity = Math.random() * 0.15; // Noise floor
      const dist = Math.abs(x - carrierBin);

      if (comms.linkStatus !== 'DISCONNECTED' && dist < 12) {
        // Main carrier tone + modulation sidebands
        const peak = Math.max(0, 1 - dist / 12) * (comms.receivedSnrDb / 20);
        intensity += peak;
      }

      // Heatmap color gradient: blue -> cyan -> yellow -> red
      let r = 0, g = 0, b = 0;
      if (intensity < 0.25) {
        b = Math.floor(intensity * 4 * 160);
      } else if (intensity < 0.6) {
        g = Math.floor((intensity - 0.25) * 2.8 * 220);
        b = 200;
      } else {
        r = Math.floor((intensity - 0.6) * 2.5 * 255);
        g = 220;
        b = 50;
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, 0, 1, 2);
    }
  }, [comms]);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              RF Communications & Ground Station Link
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            S-Band transceivers, line-of-sight Doppler tracking, link margin budgeting, and automated telemetry packet downlink.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Target Ground Station:</div>
            <div className="text-xs font-semibold text-cyan-300">
              {activeStation ? activeStation.name : 'No Target Selected'}
            </div>
          </div>

          <div
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 ${
              comms.linkStatus === 'DATA_DOWNLINK'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : comms.linkStatus === 'LINK_LOCKED'
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <Signal className="w-3.5 h-3.5" />
            <span>{comms.linkStatus}</span>
          </div>
        </div>
      </div>

      {/* Grid of Comms Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel 1: RF Link Budget & Doppler */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Link Budget & Doppler</span>
              <span className="text-[11px] font-mono text-cyan-400">{comms.band} {comms.frequencyMHz} MHz</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Doppler Shift (Δf):</span>
                <span className={Math.abs(comms.dopplerShiftHz) > 5000 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                  {comms.dopplerShiftHz > 0 ? `+${(comms.dopplerShiftHz / 1000).toFixed(2)}` : (comms.dopplerShiftHz / 1000).toFixed(2)} kHz
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Slant Range:</span>
                <span className="text-slate-200">{comms.slantRangeKm.toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Elevation / Azimuth:</span>
                <span className="text-slate-200">{comms.elevationDeg.toFixed(1)}° / {comms.azimuthDeg.toFixed(1)}°</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Path Loss (FSPL):</span>
                <span className="text-slate-200">{comms.fsplDb.toFixed(1)} dB</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Signal-to-Noise (SNR):</span>
                <span className="text-emerald-400 font-semibold">{comms.receivedSnrDb.toFixed(1)} dB</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80 font-mono">
                <span className="text-slate-400">Bit Error Rate (BER):</span>
                <span className="text-slate-300">{comms.bitErrorRate.toExponential(1)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>RF Output Power:</span>
            <span className="font-mono text-slate-200 font-bold">{comms.rfPowerWatts.toFixed(1)} W (+33 dBm)</span>
          </div>
        </div>

        {/* Panel 2: Live RF Waterfall Spectrum Display */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">RF Waterfall Spectrum</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden h-44 flex flex-col">
              <canvas
                ref={waterfallCanvasRef}
                width={280}
                height={160}
                className="w-full h-full object-fill"
              />
              <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1 rounded">
                <span>-50 kHz</span>
                <span className="text-cyan-400">f0 ({comms.frequencyMHz} MHz)</span>
                <span>+50 kHz</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Demodulator Lock:</span>
            <span className="font-mono text-emerald-400 font-semibold">QPSK / DVB-S2</span>
          </div>
        </div>

        {/* Panel 3: Packet Downlink Queue & Ground Station Passes */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Pass Prediction Schedule</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {passesLoading ? (
                <div className="text-xs text-slate-400 py-4 text-center">Calculating pass trajectories...</div>
              ) : (
                passes?.map((p) => {
                  const aosTime = new Date(p.aos).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <div
                      key={p.stationId}
                      className={`p-2 rounded-lg border text-xs transition-colors ${
                        p.inContactNow
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span>{p.stationName.split(' ')[0]}</span>
                        <span className="font-mono text-[11px] text-cyan-400">Max {p.maxElevationDeg}°</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                        <span>AOS: {aosTime}</span>
                        <span>Dur: {p.durationSeconds}s</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Packets Downlinked:</span>
            <span className="font-mono text-cyan-300 font-bold">{comms.packetsDownlinked.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
