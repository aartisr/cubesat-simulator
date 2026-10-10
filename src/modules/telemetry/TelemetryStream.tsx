import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { Download, Table, Activity, Filter, CheckCircle2 } from 'lucide-react';

export const TelemetryStream: React.FC = () => {
  const history = useSimulatorStore((s) => s.history);
  const exportTelemetryCSV = useSimulatorStore((s) => s.exportTelemetryCSV);
  const comms = useSimulatorStore((s) => s.comms);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadCSV = () => {
    const csvContent = exportTelemetryCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PCSS-II_Telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  // Recent 15 entries in reverse order
  const recentEntries = [...history].reverse().slice(0, 15);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Real-Time High-Frequency Telemetry Stream & Buffer
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic ring buffer maintaining sub-millisecond timestamped flight parameters for post-flight flight dynamic reconstruction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-slate-400">
            Buffer: <span className="text-cyan-300 font-bold">{history.length}</span> / 200 frames
          </div>

          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            {downloaded ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            <span>{downloaded ? 'Export Complete' : 'Download Telemetry CSV'}</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry Table */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Active Telemetry Frames
          </span>
          <span className="text-[11px] font-mono text-emerald-400">10 Hz FIXED-STEP STREAM</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-3 font-medium">T+ (s)</th>
                <th className="py-2 px-3 font-medium">Altitude (km)</th>
                <th className="py-2 px-3 font-medium">Velocity (km/s)</th>
                <th className="py-2 px-3 font-medium">RAAN Ω (°)</th>
                <th className="py-2 px-3 font-medium">dΩ/dt (°/d)</th>
                <th className="py-2 px-3 font-medium">Solar Pwr (W)</th>
                <th className="py-2 px-3 font-medium">Battery SoC</th>
                <th className="py-2 px-3 font-medium">Point Err (°)</th>
                <th className="py-2 px-3 font-medium">Doppler (kHz)</th>
                <th className="py-2 px-3 font-medium">Min Debris (km)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    Recording telemetry buffer frames...
                  </td>
                </tr>
              ) : (
                recentEntries.map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      idx === 0 ? 'bg-cyan-950/20 text-cyan-200' : 'text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-400">+{pt.timeSec.toFixed(1)}</td>
                    <td className="py-2 px-3">{pt.altitudeKm.toFixed(2)}</td>
                    <td className="py-2 px-3">{pt.velocityKmS.toFixed(4)}</td>
                    <td className="py-2 px-3 text-cyan-300">{(pt.raanDeg ?? 0).toFixed(3)}°</td>
                    <td className="py-2 px-3 text-indigo-300">{(pt.nodalRegressDegDay ?? 0).toFixed(4)}</td>
                    <td className="py-2 px-3 text-amber-300">{pt.solarPowerW.toFixed(2)}</td>
                    <td className="py-2 px-3 text-emerald-400">{pt.batterySoc.toFixed(1)}%</td>
                    <td className="py-2 px-3">{pt.pointingErrorDeg.toFixed(2)}</td>
                    <td className="py-2 px-3">{pt.dopplerShiftKHz.toFixed(3)}</td>
                    <td className="py-2 px-3 font-semibold text-rose-300">{pt.closestDebrisKm.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
