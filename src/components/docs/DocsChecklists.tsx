import React, { useState } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import {
  CheckSquare,
  Square,
  Play,
  RotateCcw,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Thermometer,
  Zap,
  Radio,
  Compass,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  code: string;
  title: string;
  description: string;
  subsystem: string;
  completed: boolean;
  actionLabel?: string;
  onExecute?: () => void;
}

export const DocsChecklists: React.FC = () => {
  const [activeChecklist, setActiveChecklist] = useState<'LEOP' | 'FDIR_THERMAL' | 'FDIR_CAM' | 'FDIR_EPS'>('LEOP');
  
  // Store actions
  const triggerThermalScenario = useSimulatorStore((s) => s.triggerThermalScenario);
  const setOrbitMode = useSimulatorStore((s) => s.setOrbitMode);
  const armThruster = useSimulatorStore((s) => s.armThruster);
  const startThrusterManeuver = useSimulatorStore((s) => s.startThrusterManeuver);
  const toggleThermalDerating = useSimulatorStore((s) => s.toggleThermalDerating);
  const setLouverAperture = useSimulatorStore((s) => s.setLouverAperture);
  const toggleBatteryHeaterAutoThermostat = useSimulatorStore((s) => s.toggleBatteryHeaterAutoThermostat);

  // Checklist state
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({
    'leop-1': true,
    'leop-2': true,
  });

  const toggleItem = (id: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const leopItems: ChecklistItem[] = [
    {
      id: 'leop-1',
      code: 'LEOP-01',
      title: 'P-POD Deployer Separation Sense',
      description: 'Microswitch circuit broken on rail ejection. On-board flight computer boots from cold state.',
      subsystem: 'CDH',
      completed: !!completedItems['leop-1'],
    },
    {
      id: 'leop-2',
      code: 'LEOP-02',
      title: '30-Minute Range Safety RF Silence Timer',
      description: 'Enforce non-transmission countdown in compliance with NASA/Air Force safety regulations.',
      subsystem: 'COMMS',
      completed: !!completedItems['leop-2'],
    },
    {
      id: 'leop-3',
      code: 'LEOP-03',
      title: 'Deploy Solar Arrays & Antennas',
      description: 'Fire thermal knife burn-wire resistors for 45s. Verify spring deployer latch telemetry.',
      subsystem: 'EPS/STRUCTURE',
      completed: !!completedItems['leop-3'],
    },
    {
      id: 'leop-4',
      code: 'LEOP-04',
      title: 'Activate B-Dot Magnetic Detumbling',
      description: 'Command magnetorquer coils proportional to -dB/dt to damp tip-off angular rates (< 0.2 deg/s).',
      subsystem: 'ADCS',
      completed: !!completedItems['leop-4'],
      actionLabel: 'Trigger B-Dot Detumble',
      onExecute: () => {
        setOrbitMode('DETUMBLE');
        setCompletedItems((p) => ({ ...p, 'leop-4': true }));
      },
    },
    {
      id: 'leop-5',
      code: 'LEOP-05',
      title: 'Acquire Sun-Pointing Attitude',
      description: 'Spin up reaction wheels to orient solar panel arrays normal to the Sun vector (+Y axis).',
      subsystem: 'ADCS',
      completed: !!completedItems['leop-5'],
      actionLabel: 'Command Sun-Point',
      onExecute: () => {
        setOrbitMode('SUN_POINTING');
        setCompletedItems((p) => ({ ...p, 'leop-5': true }));
      },
    },
    {
      id: 'leop-6',
      code: 'LEOP-06',
      title: 'Transmit First Health & Status Beacon',
      description: 'Verify Svalbard or Kiruna ground station AOS and downlink telemetry frame 0001.',
      subsystem: 'COMMS',
      completed: !!completedItems['leop-6'],
    },
  ];

  const thermalFdirItems: ChecklistItem[] = [
    {
      id: 'fdir-t-1',
      code: 'TH-EX-01',
      title: 'Identify Overheated Component Node',
      description: 'Confirm OBC Core or RF PA exceeds 65°C upper redline limit from telemetry stream.',
      subsystem: 'TCS',
      completed: !!completedItems['fdir-t-1'],
    },
    {
      id: 'fdir-t-2',
      code: 'TH-EX-02',
      title: 'Engage Active Thermal Derating',
      description: 'Throttle OBC and Edge-AI processing clock by 45% to immediately lower Joule dissipation.',
      subsystem: 'CDH/PAYLOAD',
      completed: !!completedItems['fdir-t-2'],
      actionLabel: 'Toggle Derating',
      onExecute: () => {
        toggleThermalDerating();
        setCompletedItems((p) => ({ ...p, 'fdir-t-2': true }));
      },
    },
    {
      id: 'fdir-t-3',
      code: 'TH-EX-03',
      title: 'Command Radiator Louvers 100% Open',
      description: 'Maximize optical solar reflector plate emissivity to 0.85 for full deep space radiative cooling.',
      subsystem: 'TCS',
      completed: !!completedItems['fdir-t-3'],
      actionLabel: 'Open Louvers 100%',
      onExecute: () => {
        setLouverAperture(100);
        setCompletedItems((p) => ({ ...p, 'fdir-t-3': true }));
      },
    },
    {
      id: 'fdir-t-4',
      code: 'TH-EX-04',
      title: 'Simulate Thermal Shock Recovery',
      description: 'Test multi-node transient equilibration across solar noon and deep eclipse cycles.',
      subsystem: 'TCS',
      completed: !!completedItems['fdir-t-4'],
      actionLabel: 'Solar Peak Stress Test',
      onExecute: () => {
        triggerThermalScenario('SOLAR_PEAK');
        setCompletedItems((p) => ({ ...p, 'fdir-t-4': true }));
      },
    },
  ];

  const camFdirItems: ChecklistItem[] = [
    {
      id: 'fdir-c-1',
      code: 'CAM-01',
      title: 'Foster-Chan Red Line Warning Acknowledged',
      description: 'Conjunction assessment indicates Pc > 1.0e-4 and miss distance < 500m on B-plane.',
      subsystem: 'ORBIT/SAFETY',
      completed: !!completedItems['fdir-c-1'],
    },
    {
      id: 'fdir-c-2',
      code: 'CAM-02',
      title: 'Arm Micro-Electrospray Thruster Bus',
      description: 'Energize high-voltage power converter and chamber preheater coils to 280°C.',
      subsystem: 'PROPULSION',
      completed: !!completedItems['fdir-c-2'],
      actionLabel: 'Arm Thruster',
      onExecute: () => {
        armThruster(true);
        setCompletedItems((p) => ({ ...p, 'fdir-c-2': true }));
      },
    },
    {
      id: 'fdir-c-3',
      code: 'CAM-03',
      title: 'Orient Spacecraft Along Tangential Burn Vector',
      description: 'Command ADCS to align nozzle thrust axis parallel to orbital velocity vector (+V).',
      subsystem: 'ADCS',
      completed: !!completedItems['fdir-c-3'],
      actionLabel: 'Command Nadir/V-Track',
      onExecute: () => {
        setOrbitMode('NADIR_POINTING');
        setCompletedItems((p) => ({ ...p, 'fdir-c-3': true }));
      },
    },
    {
      id: 'fdir-c-4',
      code: 'CAM-04',
      title: 'Execute Impulse Burn & Verify Post-Pass Clearance',
      description: 'Deliver delta-V = 0.45 m/s. Confirm secondary B-plane miss distance increases to > 2.5 km.',
      subsystem: 'ORBIT',
      completed: !!completedItems['fdir-c-4'],
      actionLabel: 'Execute CAM Burn',
      onExecute: () => {
        startThrusterManeuver();
        setCompletedItems((p) => ({ ...p, 'fdir-c-4': true }));
      },
    },
  ];

  const currentItems =
    activeChecklist === 'LEOP'
      ? leopItems
      : activeChecklist === 'FDIR_THERMAL'
      ? thermalFdirItems
      : camFdirItems;

  const total = currentItems.length;
  const done = currentItems.filter((i) => i.completed).length;
  const progressPercent = Math.round((done / total) * 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Flight Operations & FDIR Emergency Checklists</h3>
          <p className="text-xs text-slate-400">Formal aerospace operational procedures with interactive simulation hooks</p>
        </div>

        {/* Checklist Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveChecklist('LEOP')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChecklist === 'LEOP' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LEOP Commissioning
          </button>
          <button
            onClick={() => setActiveChecklist('FDIR_THERMAL')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChecklist === 'FDIR_THERMAL' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FDIR: Thermal
          </button>
          <button
            onClick={() => setActiveChecklist('FDIR_CAM')}
            className={`px-3 py-1 rounded transition-colors ${
              activeChecklist === 'FDIR_CAM' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FDIR: Collision CAM
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
          <span>Procedure Execution Status:</span>
          <span className="font-bold text-white">{done} of {total} Complete ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              progressPercent === 100 ? 'bg-emerald-400' : 'bg-cyan-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items list */}
      <div className="space-y-2.5">
        {currentItems.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              item.completed
                ? 'bg-slate-950/70 border-emerald-500/30 text-slate-300'
                : 'bg-slate-950/40 border-slate-800 text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleItem(item.id)}
                className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
              >
                {item.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{item.code}</span>
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {item.subsystem}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>

            {/* Quick action button if applicable */}
            {item.onExecute && (
              <button
                onClick={item.onExecute}
                className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>{item.actionLabel ?? 'Execute Step'}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
