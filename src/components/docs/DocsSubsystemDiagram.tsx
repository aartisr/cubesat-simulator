import React, { useState } from 'react';
import {
  Orbit,
  RotateCw,
  Zap,
  Thermometer,
  Globe,
  Radio,
  ShieldAlert,
  Wind,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SubsystemNode {
  id: string;
  name: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  inputs: string[];
  outputs: string[];
  governingLaw: string;
}

export const DocsSubsystemDiagram: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>('ORBIT');

  const nodes: Record<string, SubsystemNode> = {
    ORBIT: {
      id: 'ORBIT',
      name: 'Astrodynamics & Orbital Propagation',
      code: 'SGP4-J2',
      icon: Orbit,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/50',
      bgColor: 'bg-cyan-500/10',
      description: 'Propagates satellite position and velocity in ECI J2000 and geodetic WGS-84 frames, computing J2 secular nodal/apsidal precession and osculating elements.',
      inputs: ['Initial Keplerian Elements', 'Epoch UTC Time', 'Impulse Burns (Delta-V)'],
      outputs: ['Position & Velocity [r, v]', 'Geodetic Lat/Lon/Alt', 'Sun Vector in Body Frame'],
      governingLaw: 'Newtonian Gravity with J2 Harmonic: V(r, φ) = -(μ/r)[1 - J2(RE/r)² P2(sin φ)]',
    },
    AERO: {
      id: 'AERO',
      name: 'Harris-Priester Thermospheric Drag',
      code: 'AERO-DRAG',
      icon: Wind,
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/50',
      bgColor: 'bg-indigo-500/10',
      description: 'Calculates dynamic atmospheric mass density accounting for the diurnal solar bulge and solar radio flux F10.7, deriving continuous drag deceleration.',
      inputs: ['Altitude & Latitude', 'Solar F10.7 Index', 'Attitude Projected Area A(q)'],
      outputs: ['Neutral Density ρ', 'Aerodynamic Drag a_drag', 'Decay Rate (m/day)'],
      governingLaw: 'Modified Harris-Priester: ρ(h, ψ) = ρ_min + [ρ_max - ρ_min] cos^n(ψ/2)',
    },
    ADCS: {
      id: 'ADCS',
      name: 'Attitude Determination & Control (ADCS)',
      code: 'ADCS-Q',
      icon: RotateCw,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/50',
      bgColor: 'bg-sky-500/10',
      description: 'Maintains 3-axis stabilization via unit quaternions, reaction wheel momentum exchange, and magnetic B-dot detumbling rods.',
      inputs: ['Target Pointing Vector', 'Earth Magnetic Vector B', 'Reaction Wheel Speeds'],
      outputs: ['Unit Quaternion q', 'Body Rates ω', 'Face Normal Vectors n_k'],
      governingLaw: 'Euler Rotational Equations: I dω/dt + ω × (Iω + h_w) = τ_ext + τ_ctrl',
    },
    EPS: {
      id: 'EPS',
      name: 'Electrical Power System (EPS)',
      code: 'EPS-PV',
      icon: Zap,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/50',
      bgColor: 'bg-emerald-500/10',
      description: 'Models triple-junction photovoltaic conversion, cylindrical/penumbral shadow geometry, and battery state-of-charge with Coulomb counting.',
      inputs: ['Face Sun Angle (n_k · s)', 'Eclipse Illumination ν', 'Subsystem Load Demands'],
      outputs: ['Solar Power P_gen', 'Battery State of Charge (SOC)', 'Bus Voltages (3.3V/5V/12V)'],
      governingLaw: 'Photovoltaic Derating: P_gen = Σ A_k η0 [1 - β(T - 25)] S0 ν max(0, n_k · s)',
    },
    THERMAL: {
      id: 'THERMAL',
      name: 'Multi-Node Thermal Control (TCS)',
      code: 'TCS-LUMPED',
      icon: Thermometer,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/50',
      bgColor: 'bg-rose-500/10',
      description: 'Lumped-capacitance network resolving 8 internal component nodes, Stefan-Boltzmann radiation to deep space, variable louvers, and patch heaters.',
      inputs: ['Solar & Albedo Heat Fluxes', 'Joule Heating Dissipation', 'Louver Aperture θ'],
      outputs: ['Component Temperatures T_i', 'Radiated Power Q_rad', 'Thermal Alert Flags'],
      governingLaw: 'Stefan-Boltzmann & First Law: C_i dT_i/dt = Q_ext + Q_int - ε_eff σ A T⁴ + Σ K_ij(T_j - T_i)',
    },
    GNSS_RO: {
      id: 'GNSS_RO',
      name: 'GNSS Radio Occultation Payload',
      code: 'GNSS-RO',
      icon: Globe,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/50',
      bgColor: 'bg-amber-500/10',
      description: 'Performs atmospheric limb sounding via GPS/Galileo Doppler excess phase, retrieving vertical temperature, pressure, and refractivity profiles.',
      inputs: ['GNSS Carrier Phase Signals', 'Orbital Velocity Vectors', 'Edge-AI SNR Mask'],
      outputs: ['Bending Angle α(a)', 'Refractivity N(r)', 'Atmospheric Profile [T, P, e]'],
      governingLaw: 'Inverse Abel Transform: n(r0) = exp[ (1/π) ∫ (α / √(a² - a0²)) da ]',
    },
    DEBRIS: {
      id: 'DEBRIS',
      name: 'Conjunction Assessment & CAM',
      code: 'CAM-RISK',
      icon: ShieldAlert,
      color: 'text-orange-400',
      borderColor: 'border-orange-500/50',
      bgColor: 'bg-orange-500/10',
      description: 'Tracks tracked space debris fragments, projecting 2D B-plane covariances and evaluating Foster-Chan probability of collision to plan CAM burns.',
      inputs: ['Debris TLE Vectors', 'Covariance Ellipsoids', 'Hard Body Radius R_HBR'],
      outputs: ['Probability of Collision Pc', 'Miss Distance d_miss', 'CAM Burn Delta-V Vector'],
      governingLaw: 'Foster-Chan 2D Gaussian: Pc = ∬ exp[-0.5 (x - x_e)ᵀ C⁻¹ (x - x_e)] dx dy',
    },
    COMMS: {
      id: 'COMMS',
      name: 'RF Communications & GSN',
      code: 'COMMS-GSN',
      icon: Radio,
      color: 'text-violet-400',
      borderColor: 'border-violet-500/50',
      bgColor: 'bg-violet-500/10',
      description: 'Calculates Friis transmission link budgets, carrier-to-noise density C/N0, Doppler curve sweeps, and ground station overflights.',
      inputs: ['Spacecraft-to-GS Slant Range', 'Transmitter Power P_tx', 'Antenna Pointing Angle'],
      outputs: ['Received Power P_rx', 'Link Margin (dB)', 'Doppler Shift Δf_D (kHz)'],
      governingLaw: 'Friis Equation: P_rx = P_tx + G_tx + G_rx - FSPL - L_atm - L_pol',
    },
  };

  const active = nodes[selectedNode] || nodes['ORBIT'];
  const ActiveIcon = active.icon;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="border-b border-slate-800 pb-4 mb-5">
        <h3 className="text-sm font-semibold text-white">Coupled Multi-Physics Architecture & Data Flow</h3>
        <p className="text-xs text-slate-400">Click any subsystem node to inspect its mathematical transfer function and coupled data interfaces</p>
      </div>

      {/* Grid of Subsystem Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {Object.values(nodes).map((node) => {
          const Icon = node.icon;
          const isSelected = selectedNode === node.id;

          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? `${node.bgColor} ${node.borderColor} shadow-lg shadow-cyan-950/40`
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isSelected ? node.color : 'text-slate-400'}`} />
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {node.code}
                </span>
              </div>
              <div className={`text-xs font-semibold mt-2 line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {node.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Detailed Mathematical Card */}
      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-7 h-7 rounded-lg ${active.bgColor} border ${active.borderColor} flex items-center justify-center ${active.color}`}>
            <ActiveIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>{active.name}</span>
              <span className="text-[10px] text-cyan-400">[{active.code}]</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{active.description}</p>
          </div>
        </div>

        {/* Governing Mathematical Law */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 mb-3">
          <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">Governing Physical Law</div>
          <div className="text-xs font-mono text-cyan-300 font-medium overflow-x-auto">
            {active.governingLaw}
          </div>
        </div>

        {/* Data Inputs & Outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-amber-400 rotate-180" />
              <span>Input Telemetry & Couplings</span>
            </div>
            <ul className="space-y-1 text-slate-300">
              {active.inputs.map((inp, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  <span>{inp}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-emerald-400" />
              <span>Propagated Output Vectors</span>
            </div>
            <ul className="space-y-1 text-slate-300">
              {active.outputs.map((out, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>{out}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
