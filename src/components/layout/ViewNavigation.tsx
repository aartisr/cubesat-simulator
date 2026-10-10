import React from 'react';
import {
  LayoutDashboard,
  Orbit,
  RotateCw,
  Zap,
  Radio,
  ShieldAlert,
  Activity,
  Globe,
  Thermometer,
  BookOpen,
} from 'lucide-react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';

export type ActiveModuleView =
  | 'OVERVIEW'
  | 'ORBIT'
  | 'ADCS'
  | 'EPS'
  | 'THERMAL'
  | 'GNSS_RO'
  | 'COMMS'
  | 'DEBRIS'
  | 'TELEMETRY'
  | 'DOCS';

interface ViewNavigationProps {
  activeView: ActiveModuleView;
  onSelectView: (view: ActiveModuleView) => void;
}

export const ViewNavigation: React.FC<ViewNavigationProps> = ({
  activeView,
  onSelectView,
}) => {
  const conjunctions = useSimulatorStore((s) => s.conjunctions);
  const gnssRO = useSimulatorStore((s) => s.gnssRO);
  const propulsion = useSimulatorStore((s) => s.propulsion);
  const thermal = useSimulatorStore((s) => s.thermal);
  const hasWarning = conjunctions.some(
    (c) => (c.severity === 'CRITICAL' || c.severity === 'WARNING') && !c.maneuverExecuted
  );

  const isThrusterActive = propulsion.status === 'FIRING' || propulsion.status === 'PREHEATING';

  const tabs: {
    id: ActiveModuleView;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    alert?: boolean;
    badge?: string;
  }[] = [
    { id: 'OVERVIEW', label: 'Mission Overview', shortLabel: 'Overview', description: 'Mission at a glance', icon: LayoutDashboard },
    { id: 'ORBIT', label: 'Orbital Mechanics', shortLabel: 'Orbit', description: 'Trajectory and ground track', icon: Orbit },
    {
      id: 'ADCS',
      label: 'ADCS & Thrusters',
      shortLabel: 'Attitude',
      description: 'Pointing and maneuvers',
      icon: RotateCw,
      badge: isThrusterActive ? propulsion.status : propulsion.status === 'ARMED' ? 'ARMED' : undefined,
      alert: isThrusterActive,
    },
    { id: 'EPS', label: 'EPS Power', shortLabel: 'Power', description: 'Solar and battery', icon: Zap },
    {
      id: 'THERMAL',
      label: 'Thermal & Dissipation',
      shortLabel: 'Thermal',
      description: 'Temperatures and cooling',
      icon: Thermometer,
      badge: `${thermal.internalMeanTempC.toFixed(1)}°C`,
      alert: thermal.hasThermalWarning,
    },
    { id: 'GNSS_RO', label: 'GNSS-RO Climate', shortLabel: 'Climate', description: 'Atmospheric soundings', icon: Globe, badge: `${gnssRO?.completedSoundings.length ?? 6}` },
    { id: 'COMMS', label: 'RF Comms & GSN', shortLabel: 'Comms', description: 'Ground-station link', icon: Radio },
    { id: 'DEBRIS', label: 'Debris & CAM', shortLabel: 'Safety', description: 'Conjunction assessment', icon: ShieldAlert, alert: hasWarning },
    { id: 'TELEMETRY', label: 'Telemetry Stream', shortLabel: 'Telemetry', description: 'Raw mission stream', icon: Activity },
    { id: 'DOCS', label: 'Flight Spec & Monograph', shortLabel: 'Guide', description: 'Concepts and flight spec', icon: BookOpen },
  ];

  return (
    <nav aria-label="Mission workspaces" className="w-full bg-slate-950 border-b border-slate-800/80 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
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
        </div>

        <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400">
          <span>Choose a workspace to explore or control one subsystem.</span>
        </div>
      </div>
    </nav>
  );
};
