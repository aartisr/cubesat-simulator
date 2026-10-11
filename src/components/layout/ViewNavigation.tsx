import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { WORKSPACES, type WorkspaceId } from '../../modules/workspaces';

export type ActiveModuleView = WorkspaceId;

interface ViewNavigationProps {
  activeView: ActiveModuleView;
  onSelectView: (view: ActiveModuleView) => void;
}

export const ViewNavigation: React.FC<ViewNavigationProps> = ({
  activeView,
  onSelectView,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const conjunctions = useSimulatorStore((s) => s.conjunctions);
  const gnssRO = useSimulatorStore((s) => s.gnssRO);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const thermal = useSimulatorStore((s) => s.thermal);
  const hasWarning = conjunctions.some(
    (c) => (c.severity === 'CRITICAL' || c.severity === 'WARNING') && !c.maneuverExecuted
  );

  const isThrusterActive = propulsion.status === 'FIRING' || propulsion.status === 'PREHEATING';

  const tabs = WORKSPACES.map((workspace) => ({
    ...workspace,
    badge: workspace.id === 'ADCS'
      ? (isThrusterActive ? propulsion.status : propulsion.status === 'ARMED' ? 'ARMED' : undefined)
      : workspace.id === 'THERMAL'
        ? `${thermal.internalMeanTempC.toFixed(1)}°C`
        : workspace.id === 'GNSS_RO'
          ? `${gnssRO?.completedSoundings.length ?? 6}`
          : undefined,
    alert: workspace.id === 'ADCS'
      ? isThrusterActive
      : workspace.id === 'THERMAL'
        ? thermal.hasThermalWarning
        : workspace.id === 'DEBRIS' && hasWarning,
  }));
  const primaryTabs = tabs.filter((tab) => tab.primary);
  const moreTabs = tabs.filter((tab) => !tab.primary);
  const activeMoreTab = moreTabs.find((tab) => tab.id === activeView);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscapeOrOutside = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') setMoreOpen(false);
      if (event instanceof MouseEvent && !navigationRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    window.addEventListener('keydown', closeOnEscapeOrOutside);
    window.addEventListener('mousedown', closeOnEscapeOrOutside);
    return () => {
      window.removeEventListener('keydown', closeOnEscapeOrOutside);
      window.removeEventListener('mousedown', closeOnEscapeOrOutside);
    };
  }, [moreOpen]);

  return (
    <nav ref={navigationRef} aria-label="Mission workspaces" className="w-full bg-slate-950 border-b border-slate-800/80 px-4 py-2">
      <div className="relative max-w-7xl mx-auto flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 max-w-full overflow-x-auto no-scrollbar">
          <div className="flex w-max items-center gap-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-1">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => { setMoreOpen(false); onSelectView(tab.id); }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${tab.label}: ${tab.description}`}
                title={tab.description}
                className={`relative px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.shortLabel}</span>

                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                    {tab.badge}
                  </span>
                )}

                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            );
          })}

            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              aria-label={activeMoreTab ? `More workspaces. Current: ${activeMoreTab.label}` : 'More workspaces'}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                activeMoreTab || moreOpen
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <span>{activeMoreTab ? activeMoreTab.shortLabel : 'More'}</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400">
          <span>Start with the mission pulse, then open a workspace when you need detail.</span>
        </div>

        {moreOpen && (
          <div className="absolute left-0 top-full z-[60] mt-2 grid w-[min(34rem,calc(100vw-2rem))] grid-cols-1 gap-1 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl sm:grid-cols-2" role="menu" aria-label="Additional workspaces">
            {moreTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { setMoreOpen(false); onSelectView(tab.id); }}
                  className={`flex min-w-0 items-start gap-3 rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">{tab.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{tab.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};
