import React, { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSimulatorStore } from './core/store/useSimulatorStore';
import { HeaderBar } from './components/layout/HeaderBar';
import { ViewNavigation, ActiveModuleView } from './components/layout/ViewNavigation';
import { MissionDashboard } from './modules/dashboard/MissionDashboard';
import { OrbitModule } from './modules/orbit/OrbitModule';
import { ADCSModule } from './modules/adcs/ADCSModule';
import { EPSModule } from './modules/eps/EPSModule';
import { GNSSROModule } from './modules/gnssRO/GNSSROModule';
import { CommsModule } from './modules/comms/CommsModule';
import { DebrisModule } from './modules/debris/DebrisModule';
import { ThermalModule } from './modules/thermal/ThermalModule';
import { TelemetryStream } from './modules/telemetry/TelemetryStream';
import { DocumentationModule } from './modules/docs/DocumentationModule';

// Create TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  },
});

export default function App() {
  const [activeView, setActiveView] = useState<ActiveModuleView>('OVERVIEW');
  const tickPhysics = useSimulatorStore((s) => s.tickPhysics);
  const isPlaying = useSimulatorStore((s) => s.isPlaying);

  // High-Frequency Real-Time Physics Worker Loop (20 Hz fixed-step decoupled clock)
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const loop = (currentTimestamp: number) => {
      const deltaSec = (currentTimestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTimestamp;

      // Cap deltaSec to prevent physics explosion if user switches tabs
      const clampedDelta = Math.min(0.2, Math.max(0.001, deltaSec));

      if (isPlaying) {
        tickPhysics(clampedDelta);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, tickPhysics]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Top Mission Control Header */}
        <HeaderBar onOpenDocs={() => setActiveView('DOCS')} />

        {/* Subsystem Module Navigation Bar */}
        <ViewNavigation activeView={activeView} onSelectView={setActiveView} />

        {/* Active Module Canvas Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-16">
          {activeView === 'OVERVIEW' && <MissionDashboard onNavigate={setActiveView} />}
          {activeView === 'ORBIT' && <OrbitModule />}
          {activeView === 'ADCS' && <ADCSModule />}
          {activeView === 'EPS' && <EPSModule />}
          {activeView === 'THERMAL' && <ThermalModule />}
          {activeView === 'GNSS_RO' && <GNSSROModule />}
          {activeView === 'COMMS' && <CommsModule />}
          {activeView === 'DEBRIS' && <DebrisModule />}
          {activeView === 'TELEMETRY' && <TelemetryStream />}
          {activeView === 'DOCS' && <DocumentationModule />}
        </main>

        {/* Quiet Aerospace Engineering Footer */}
        <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">PCSS II CUBESAT SIMULATOR</span>
              <span>·</span>
              <span>High-Fidelity 3U/6U CubeSat Virtual Twin & Orbital Dynamics Simulator</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400 flex items-center gap-3">
              <span>WGS-84 / ECI J2000</span>
              <span>·</span>
              <span>SGP4 KEPLERIAN PROPAGATOR</span>
              <span>·</span>
              <span>FOSTER-CHAN B-PLANE ASSESSMENT</span>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
