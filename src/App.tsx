import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSimulatorStore } from './core/store/useSimulatorStore';
import { usePhysicsClock } from './core/react/usePhysicsClock';
import { HeaderBar } from './components/layout/HeaderBar';
import { ViewNavigation } from './components/layout/ViewNavigation';
import { DEFAULT_WORKSPACE, findWorkspace } from './modules/workspaces';
import { LiveContextBridge } from './components/dataSources/LiveContextBridge';

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
  const [activeView, setActiveView] = useState(DEFAULT_WORKSPACE);
  const tickPhysics = useSimulatorStore((s) => s.tickPhysics);
  const isPlaying = useSimulatorStore((s) => s.isPlaying);
  const activeWorkspace = findWorkspace(activeView);

  usePhysicsClock(isPlaying, tickPhysics);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <LiveContextBridge />
        {/* Top Mission Control Header */}
        <HeaderBar onOpenDocs={() => setActiveView('DOCS')} />

        {/* Subsystem Module Navigation Bar */}
        <ViewNavigation activeView={activeView} onSelectView={setActiveView} />

        {/* Active Module Canvas Area */}
        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 pb-12 sm:pb-16">
          {activeWorkspace.render(setActiveView)}
        </main>

        {/* Quiet Aerospace Engineering Footer */}
        <footer className="w-full border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-xs text-slate-400 sm:px-6">
          <div className="max-w-7xl mx-auto flex min-w-0 flex-col items-center justify-between gap-2 sm:flex-row">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-semibold text-slate-400">ASTRONEER CUBESAT SIMULATOR</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden truncate sm:inline">1U/3U/6U CubeSat Virtual Twin & Orbital Dynamics Simulator</span>
            </div>
            <div className="hidden font-mono text-[11px] text-slate-400 md:flex md:items-center md:gap-3">
              <span>WGS-84 / ECI J2000</span>
              <span>·</span>
              <span>SGP4 KEPLERIAN PROPAGATOR</span>
              <span>·</span>
              <span>FOSTER-CHAN B-PLANE ASSESSMENT</span>
            </div>
            <a
              href="https://ai-aarti.com"
              target="_blank"
              rel="author noopener noreferrer"
              className="text-[11px] text-slate-400 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label="Created by Aarti S Ravikumar"
            >
              Created by Aarti S Ravikumar
            </a>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
