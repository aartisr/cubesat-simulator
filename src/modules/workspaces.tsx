import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  Globe,
  LayoutDashboard,
  Orbit,
  Radio,
  RotateCw,
  Settings2,
  ShieldAlert,
  Thermometer,
  Zap,
} from 'lucide-react';

const MissionDashboard = lazy(async () => ({ default: (await import('./dashboard/MissionDashboard')).MissionDashboard }));
const OrbitModule = lazy(async () => ({ default: (await import('./orbit/OrbitModule')).OrbitModule }));
const ADCSModule = lazy(async () => ({ default: (await import('./adcs/ADCSModule')).ADCSModule }));
const EPSModule = lazy(async () => ({ default: (await import('./eps/EPSModule')).EPSModule }));
const ThermalModule = lazy(async () => ({ default: (await import('./thermal/ThermalModule')).ThermalModule }));
const GNSSROModule = lazy(async () => ({ default: (await import('./gnssRO/GNSSROModule')).GNSSROModule }));
const CommsModule = lazy(async () => ({ default: (await import('./comms/CommsModule')).CommsModule }));
const DebrisModule = lazy(async () => ({ default: (await import('./debris/DebrisModule')).DebrisModule }));
const TelemetryStream = lazy(async () => ({ default: (await import('./telemetry/TelemetryStream')).TelemetryStream }));
const DataSourcesModule = lazy(async () => ({ default: (await import('./dataSources/DataSourcesModule')).DataSourcesModule }));
const DocumentationModule = lazy(async () => ({ default: (await import('./docs/DocumentationModule')).DocumentationModule }));

const withWorkspaceBoundary = (content: ReactNode) => (
  <Suspense fallback={<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Loading workspace…</div>}>
    {content}
  </Suspense>
);

/**
 * The application workspace contract. Adding a workspace is intentionally a
 * single registration: its navigation metadata and renderer stay together.
 */
export type WorkspaceId =
  | 'OVERVIEW'
  | 'ORBIT'
  | 'ADCS'
  | 'EPS'
  | 'THERMAL'
  | 'GNSS_RO'
  | 'COMMS'
  | 'DEBRIS'
  | 'TELEMETRY'
  | 'DATA_SOURCES'
  | 'DOCS';

export interface WorkspaceDefinition {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
  render: (onNavigate: (workspace: WorkspaceId) => void) => ReactNode;
}

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  { id: 'OVERVIEW', label: 'Mission Overview', shortLabel: 'Overview', description: 'Mission at a glance', icon: LayoutDashboard, primary: true, render: (onNavigate) => withWorkspaceBoundary(<MissionDashboard onNavigate={onNavigate} />) },
  { id: 'ORBIT', label: 'Orbital Mechanics', shortLabel: 'Orbit', description: 'Trajectory and ground track', icon: Orbit, primary: true, render: () => withWorkspaceBoundary(<OrbitModule />) },
  { id: 'ADCS', label: 'ADCS & Thrusters', shortLabel: 'Attitude', description: 'Pointing and maneuvers', icon: RotateCw, primary: true, render: () => withWorkspaceBoundary(<ADCSModule />) },
  { id: 'EPS', label: 'EPS Power', shortLabel: 'Power', description: 'Solar and battery', icon: Zap, primary: true, render: () => withWorkspaceBoundary(<EPSModule />) },
  { id: 'THERMAL', label: 'Thermal & Dissipation', shortLabel: 'Thermal', description: 'Temperatures and cooling', icon: Thermometer, primary: true, render: () => withWorkspaceBoundary(<ThermalModule />) },
  { id: 'GNSS_RO', label: 'GNSS-RO Climate', shortLabel: 'Climate', description: 'Atmospheric soundings', icon: Globe, render: () => withWorkspaceBoundary(<GNSSROModule />) },
  { id: 'COMMS', label: 'RF Comms & GSN', shortLabel: 'Comms', description: 'Ground-station link', icon: Radio, render: () => withWorkspaceBoundary(<CommsModule />) },
  { id: 'DEBRIS', label: 'Debris & CAM', shortLabel: 'Safety', description: 'Conjunction assessment', icon: ShieldAlert, primary: true, render: () => withWorkspaceBoundary(<DebrisModule />) },
  { id: 'TELEMETRY', label: 'Telemetry Stream', shortLabel: 'Telemetry', description: 'Raw mission stream', icon: Activity, render: () => withWorkspaceBoundary(<TelemetryStream />) },
  { id: 'DATA_SOURCES', label: 'Data Sources', shortLabel: 'Sources', description: 'Live context, replay, and connections', icon: Settings2, render: () => withWorkspaceBoundary(<DataSourcesModule />) },
  { id: 'DOCS', label: 'Flight Spec & Monograph', shortLabel: 'Guide', description: 'Concepts and flight spec', icon: BookOpen, render: () => withWorkspaceBoundary(<DocumentationModule />) },
];

export const DEFAULT_WORKSPACE: WorkspaceId = 'OVERVIEW';

export const findWorkspace = (id: WorkspaceId) =>
  WORKSPACES.find((workspace) => workspace.id === id) ?? WORKSPACES[0];
