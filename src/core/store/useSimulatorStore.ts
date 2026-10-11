import { create } from 'zustand';
import {
  OrbitalState,
  ADCSState,
  EPSState,
  CommsState,
  SpaceDebris,
  ConjunctionAssessment,
  TelemetryFrame,
  OrbitMode,
  GroundStation,
  Vector3D,
  GNSSROState,
  GNSSConstellation,
  PropulsionState,
  ThrusterManeuverConfig,
  ManeuverDirection,
  ManeuverRecord,
  DragParameters,
  AtmosphericDragTelemetry,
  DragAttitudePreset,
  ThermalState,
  ThermalStrapMode,
} from '../../types/telemetry';
import { CUBESAT_PRESETS, TRACKED_SPACE_DEBRIS, SatellitePreset } from '../data/tleCatalog';
import { GLOBAL_GROUND_STATIONS } from '../data/groundStations';
import { OrbitalMechanics } from '../math/sgp4';
import { QuaternionMath } from '../math/quaternion';
import { SolarPhysics, EARTH_RADIUS_KM } from '../math/solar';
import { CollisionPhysics } from '../math/collision';
import { GNSSROPhysics } from '../math/gnssRO';
import { PropulsionPhysics } from '../math/propulsion';
import { HarrisPriesterPhysics } from '../math/harrisPriester';
import { ThermalPhysics } from '../math/thermal';

export interface TelemetryHistoryPoint {
  timeSec: number;
  altitudeKm: number;
  velocityKmS: number;
  batterySoc: number;
  solarPowerW: number;
  pointingErrorDeg: number;
  dopplerShiftKHz: number;
  closestDebrisKm: number;
  raanDeg: number;
  nodalRegressDegDay: number;
  accumNodalShiftDeg: number;
  thrusterPowerW?: number;
  propellantGrams?: number;
  batteryCurrentA?: number;
  densityKgM3?: number;
  dragDecelMicroG?: number;
  decayRateMPerDay?: number;
  internalTempC?: number;
  batteryTempC?: number;
  solarPanelTempC?: number;
  radiatorTempC?: number;
  solarFluxW_M2?: number;
  netHeatFlowW?: number;
  rejectionPowerW?: number;
}

interface SimulatorStore {
  // Master Clock & Control
  simulatedTime: number; // ms timestamp
  realStartTime: number;
  timeWarp: number; // 0, 1, 5, 10, 30, 60, 300
  isPlaying: boolean;
  selectedSatellite: SatellitePreset;
  enableJ2Perturbation: boolean;
  enableAtmosphericDrag: boolean;

  // Active Subsystems
  orbit: OrbitalState;
  adcs: ADCSState;
  eps: EPSState;
  comms: CommsState;
  debrisList: SpaceDebris[];
  conjunctions: ConjunctionAssessment[];
  groundStations: GroundStation[];
  activeGroundStation: GroundStation | null;
  gnssRO: GNSSROState;
  propulsion: PropulsionState;
  dragParameters: DragParameters;
  dragTelemetry: AtmosphericDragTelemetry;
  thermal: ThermalState;

  // Telemetry Recording Buffer (Fixed capacity circular buffer)
  history: TelemetryHistoryPoint[];
  maxHistoryLength: number;

  // Control Actions
  setTimeWarp: (warp: number) => void;
  togglePlay: () => void;
  setOrbitMode: (mode: OrbitMode) => void;
  toggleSolarPanels: () => void;
  setEnableJ2Perturbation: (enabled: boolean) => void;
  setEnableAtmosphericDrag: (enabled: boolean) => void;
  setDragParameters: (params: Partial<DragParameters>) => void;
  setDragAttitudePreset: (preset: DragAttitudePreset) => void;
  resetDragAccumulator: () => void;
  executeDragReboostManeuver: () => void;
  triggerCollisionAvoidanceManeuver: (debrisId: string) => void;
  switchSatellite: (presetId: string) => void;
  setActiveGroundStation: (stationId: string | null) => void;
  toggleGNSSROPayload: (enabled?: boolean) => void;
  selectSounding: (soundingId: string) => void;
  triggerManualSounding: (lat?: number, lon?: number) => void;
  toggleGNSSConstellation: (constellation: GNSSConstellation) => void;
  setEdgeAIPowerMode: (mode: 'ACTIVE_INFERENCE' | 'BURST_NEURAL' | 'DEEP_SLEEP') => void;

  // Thermal Dissipation & Temperature Controls
  setLouverAperture: (aperturePercent: number) => void;
  toggleLouverAutoThermostat: () => void;
  setLouverTargetTemp: (targetC: number) => void;
  toggleBatteryHeater: () => void;
  toggleBatteryHeaterAutoThermostat: () => void;
  togglePayloadHeater: () => void;
  setThermalStrapMode: (mode: ThermalStrapMode) => void;
  toggleThermalDerating: () => void;
  triggerThermalScenario: (scenario: 'ECLIPSE_CHILL' | 'SOLAR_PEAK' | 'PA_BURST' | 'NOMINAL_RESET') => void;

  // ADCS Thruster Maneuver & Propulsion Control
  armThruster: (armed: boolean) => void;
  setThrusterConfig: (config: Partial<ThrusterManeuverConfig>) => void;
  startThrusterManeuver: () => void;
  abortThrusterManeuver: () => void;
  refuelPropellant: () => void;
  pulseRCS: (axis: 'roll' | 'pitch' | 'yaw', direction: 1 | -1) => void;

  tickPhysics: (deltaRealSeconds: number) => void;
  resetSimulation: () => void;
  exportTelemetryCSV: () => string;
}

const INITIAL_PRESET = CUBESAT_PRESETS[0];

const createInitialState = (preset: SatellitePreset, startEpoch = Date.now(), enableJ2 = true) => {
  const prop = OrbitalMechanics.propagate(preset.initialElements, 0, enableJ2);
  const geo = OrbitalMechanics.eciToGeodetic(prop.positionECI, startEpoch);
  const sunVec = SolarPhysics.getSunVectorECI(startEpoch);
  const eclipse = SolarPhysics.calculateEclipse(prop.positionECI, sunVec);
  const beta = SolarPhysics.calculateBetaAngle(prop.positionECI, prop.velocityECI, sunVec);

  const initialOrbit: OrbitalState = {
    epoch: startEpoch,
    simulatedTime: startEpoch,
    positionECI: prop.positionECI,
    velocityECI: prop.velocityECI,
    geodetic: geo,
    elements: prop.elements,
    sunVectorECI: sunVec,
    eclipseState: eclipse.state,
    eclipseFraction: eclipse.fraction,
    betaAngle: beta,
    j2Enabled: enableJ2,
    nodalRegressionRateDegDay: prop.nodalRegressionRateDegDay,
    accumulatedNodalShiftDeg: 0,
    perigeePrecessionRateDegDay: prop.perigeePrecessionRateDegDay,
    groundTrackNodalShiftDegOrbit: prop.groundTrackNodalShiftDegOrbit,
  };

  const initialADCS: ADCSState = {
    mode: 'SUN_POINTING',
    quaternion: { w: 1, x: 0, y: 0, z: 0 },
    targetQuaternion: { w: 1, x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0.0005, y: 0.0003, z: 0.0001 }, // Small tumble rate
    euler: { roll: 0, pitch: 0, yaw: 0 },
    wheelSpeedRpm: [1200, -850, 420],
    wheelTorqueNm: [0.001, -0.002, 0.0005],
    magnetorquerDipoleAm2: [0.1, 0.05, -0.08],
    magneticFieldNanoTesla: { x: 21500, y: -8400, z: 42100 },
    pointingErrorDeg: 1.45,
    detumbleRate: 0.0006,
  };

  const initialSolarIncidence = SolarPhysics.calculateSolarPanelIncidence(
    sunVec,
    initialADCS.quaternion,
    true,
    eclipse.fraction,
    24.5,
    preset.solarCapacityW,
    preset.geometry
  );

  const initialEPS: EPSState = {
    solarPanelDeployed: true,
    solarIrradianceWPerM2: 1361.0,
    solarArrayPowerW: initialSolarIncidence.totalArrayPowerW,
    batteryVoltageV: 8.24,
    batteryCurrentA: 0.85,
    batterySocPercent: 88.5,
    batteryCapacityWh: preset.batteryCapacityWh,
    batteryRemainingWh: preset.batteryCapacityWh * 0.885,
    batteryTempC: 18.2,
    solarPanelTempC: 24.5,
    bus3v3CurrentA: 0.42,
    bus5vCurrentA: 0.65,
    bus12vCurrentA: 0.18,
    totalLoadPowerW: 8.4,
    lowPowerModeActive: false,
    panelFaces: initialSolarIncidence.panelFaces,
    sunVectorBody: initialSolarIncidence.sunVectorBody,
    effectiveHarvestingEfficiencyPercent: initialSolarIncidence.effectiveHarvestingEfficiencyPercent,
  };

  const initialComms: CommsState = {
    transceiverEnabled: true,
    band: 'S-BAND',
    frequencyMHz: 2245.0,
    rfPowerWatts: 2.0,
    dopplerShiftHz: 1240.0,
    slantRangeKm: 850.0,
    elevationDeg: 28.5,
    azimuthDeg: 142.0,
    fsplDb: 158.4,
    receivedSnrDb: 18.2,
    bitErrorRate: 2.1e-7,
    activeGroundStation: GLOBAL_GROUND_STATIONS[0],
    linkStatus: 'LINK_LOCKED',
    downlinkSpeedKbps: 1024,
    packetsDownlinked: 1842,
    bufferQueueKBytes: 42.5,
  };

  // Initialize debris positions
  const initialDebris = TRACKED_SPACE_DEBRIS.map((deb) => {
    const dElem = {
      semiMajorAxis: deb.semiMajorAxisKm,
      eccentricity: deb.eccentricity,
      inclination: deb.inclinationDeg,
      raan: deb.raanDeg,
      argOfPerigee: deb.argOfPerigeeDeg,
      trueAnomaly: deb.meanAnomalyDeg,
      meanAnomaly: deb.meanAnomalyDeg,
      periodMinutes: 1440 / deb.meanMotionRevsPerDay,
      apogeeAltitude: deb.semiMajorAxisKm * (1 + deb.eccentricity) - 6378.137,
      perigeeAltitude: deb.semiMajorAxisKm * (1 - deb.eccentricity) - 6378.137,
    };
    const debProp = OrbitalMechanics.propagateJ2(dElem, 0);
    const dx = debProp.positionECI.x - initialOrbit.positionECI.x;
    const dy = debProp.positionECI.y - initialOrbit.positionECI.y;
    const dz = debProp.positionECI.z - initialOrbit.positionECI.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return {
      ...deb,
      positionECI: debProp.positionECI,
      velocityECI: debProp.velocityECI,
      currentDistanceKm: dist,
    };
  });

  const conjunctions = initialDebris.map((deb) =>
    CollisionPhysics.evaluateConjunction(initialOrbit, deb)
  );

  const defaultPropulsion = PropulsionPhysics.getDefaultPropulsionState();
  initialADCS.propulsion = defaultPropulsion;

  const defaultDragParams: DragParameters = {
    cd: 2.2,
    crossSectionAreaM2: preset.geometry.nominalDragAreaM2,
    satelliteMassKg: preset.massKg,
    f107SolarFlux: 145,
    hpExponentN: 4,
    bulgeLagDeg: 30,
    attitudeMode: 'NOMINAL',
  };

  const initialAltKm = prop.elements.semiMajorAxis - EARTH_RADIUS_KM;
  const initialDens = HarrisPriesterPhysics.calculateDensity(
    initialAltKm,
    prop.positionECI,
    sunVec,
    defaultDragParams.f107SolarFlux,
    defaultDragParams.hpExponentN,
    defaultDragParams.bulgeLagDeg
  );
  const initialDrag = HarrisPriesterPhysics.calculateAerodynamicDrag(
    prop.positionECI,
    prop.velocityECI,
    initialDens,
    defaultDragParams.cd,
    defaultDragParams.crossSectionAreaM2,
    defaultDragParams.satelliteMassKg
  );
  const initialDecay = HarrisPriesterPhysics.calculateDecayRates(
    prop.elements,
    initialDrag,
    defaultDragParams.cd,
    defaultDragParams.crossSectionAreaM2,
    defaultDragParams.satelliteMassKg
  );

  const initialDragTelemetry: AtmosphericDragTelemetry = {
    enabled: true,
    densityKgM3: initialDens.densityKgM3,
    rhoMinKgM3: initialDens.rhoMinKgM3,
    rhoMaxKgM3: initialDens.rhoMaxKgM3,
    diurnalRatio: initialDens.diurnalRatio,
    bulgeAngleDeg: initialDens.bulgeAngleDeg,
    diurnalBulgeFraction: initialDens.diurnalFactor,
    subsolarAngleDeg: initialDens.subsolarAngleDeg,
    scaleHeightKm: initialDens.scaleHeightKm,
    relVelocityKmS: initialDrag.relVelocityKmS,
    dragDecelVectorECI: initialDrag.dragDecelVectorECI,
    dragDecelMagnitudeMs2: initialDrag.dragDecelMagnitudeMs2,
    dragDecelMicroG: initialDrag.dragDecelMicroG,
    dragForceMicroN: initialDrag.dragForceMicroN,
    dynamicPressurePa: initialDrag.dynamicPressurePa,
    ballisticCoefficientKgM2: initialDrag.ballisticCoefficientKgM2,
    semiMajorAxisDecayMetersDay: initialDecay.semiMajorAxisDecayMetersPerDay,
    semiMajorAxisDecayKmYear: initialDecay.semiMajorAxisDecayKmPerYear,
    apogeeDecayMetersDay: initialDecay.apogeeDecayMetersPerDay,
    perigeeDecayMetersDay: initialDecay.perigeeDecayMetersPerDay,
    periodDecayMsPerDay: initialDecay.periodDecayMsPerDay,
    reentryLifetimeDays: initialDecay.reentryLifetimeDays,
    reentryStatus: initialDecay.reentryStatus,
    cumulativeAltitudeLossMeters: 0,
    parameters: defaultDragParams,
  };

  return {
    orbit: initialOrbit,
    adcs: initialADCS,
    eps: initialEPS,
    comms: initialComms,
    debris: initialDebris,
    conjunctions,
    gnssRO: GNSSROPhysics.getDefaultGNSSROState(),
    propulsion: defaultPropulsion,
    dragParameters: defaultDragParams,
    dragTelemetry: initialDragTelemetry,
    thermal: ThermalPhysics.createInitialThermalState(),
  };
};

export const useSimulatorStore = create<SimulatorStore>((set, get) => {
  const now = Date.now();
  const init = createInitialState(INITIAL_PRESET, now);

  return {
    simulatedTime: now,
    realStartTime: now,
    timeWarp: 1,
    isPlaying: true,
    selectedSatellite: INITIAL_PRESET,
    enableJ2Perturbation: true,
    enableAtmosphericDrag: true,

    orbit: init.orbit,
    adcs: init.adcs,
    eps: init.eps,
    comms: init.comms,
    debrisList: init.debris,
    conjunctions: init.conjunctions,
    groundStations: GLOBAL_GROUND_STATIONS,
    activeGroundStation: GLOBAL_GROUND_STATIONS[0],
    gnssRO: init.gnssRO,
    propulsion: init.propulsion,
    dragParameters: init.dragParameters,
    dragTelemetry: init.dragTelemetry,
    thermal: init.thermal,

    history: [],
    maxHistoryLength: 200,

    setTimeWarp: (warp: number) => set({ timeWarp: warp }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    setEnableJ2Perturbation: (enabled: boolean) => {
      set((state) => {
        // Recalculate immediate rates for current orbit
        const currentElem = state.orbit.elements;
        const rates = OrbitalMechanics.propagate(currentElem, 0, enabled);
        return {
          enableJ2Perturbation: enabled,
          orbit: {
            ...state.orbit,
            j2Enabled: enabled,
            nodalRegressionRateDegDay: rates.nodalRegressionRateDegDay,
            perigeePrecessionRateDegDay: rates.perigeePrecessionRateDegDay,
            groundTrackNodalShiftDegOrbit: rates.groundTrackNodalShiftDegOrbit,
          },
        };
      });
    },

    setEnableAtmosphericDrag: (enabled: boolean) => {
      set((state) => ({
        enableAtmosphericDrag: enabled,
        dragTelemetry: {
          ...state.dragTelemetry,
          enabled,
        },
      }));
    },

    setDragParameters: (params: Partial<DragParameters>) => {
      set((state) => {
        const updatedParams = { ...state.dragParameters, ...params };
        return {
          dragParameters: updatedParams,
          dragTelemetry: {
            ...state.dragTelemetry,
            parameters: updatedParams,
          },
        };
      });
    },

    setDragAttitudePreset: (preset: DragAttitudePreset) => {
      set((state) => {
        const geometry = state.selectedSatellite.geometry;
        let area = state.dragParameters.crossSectionAreaM2;
        if (preset === 'FEATHERED') area = Math.max(0.001, geometry.nominalDragAreaM2 * 0.55);
        else if (preset === 'NOMINAL') area = geometry.nominalDragAreaM2;
        else if (preset === 'BROADSIDE') area = geometry.broadsideDragAreaM2;
        else if (preset === 'DEORBIT_SAIL') area = Math.max(geometry.broadsideDragAreaM2 * 2.5, 0.05);

        const updatedParams = {
          ...state.dragParameters,
          crossSectionAreaM2: area,
          attitudeMode: preset,
        };

        return {
          dragParameters: updatedParams,
          dragTelemetry: {
            ...state.dragTelemetry,
            parameters: updatedParams,
          },
        };
      });
    },

    resetDragAccumulator: () => {
      set((state) => ({
        dragTelemetry: {
          ...state.dragTelemetry,
          cumulativeAltitudeLossMeters: 0,
        },
      }));
    },

    executeDragReboostManeuver: () => {
      const state = get();
      const currentAlt = state.orbit.geodetic.altitude;
      const lostMeters = Math.max(5, state.dragTelemetry.cumulativeAltitudeLossMeters);
      const req = HarrisPriesterPhysics.calculateReboostRequirement(
        lostMeters / 30.4375,
        currentAlt,
        state.propulsion.config.thrustMilliNewtons,
        state.propulsion.config.specificImpulseSec
      );

      const targetDeltaVMs = Math.max(0.1, Math.min(4.0, Number(req.deltaVMsPerMonth.toFixed(2))));

      // Configure thruster for prograde re-boost maneuver
      set((s) => ({
        propulsion: {
          ...s.propulsion,
          status: 'ARMED',
          config: {
            ...s.propulsion.config,
            direction: 'PROGRADE',
            targetDeltaVMs,
          },
        },
        dragTelemetry: {
          ...s.dragTelemetry,
          cumulativeAltitudeLossMeters: 0,
        },
      }));

      // Start the burn automatically
      get().startThrusterManeuver();
    },

    setOrbitMode: (mode: OrbitMode) => {
      set((state) => {
        // Calculate new target quaternion based on selected attitude guidance
        let targetQ = { ...state.adcs.quaternion };
        if (mode === 'SUN_POINTING') {
          // Align Z+ body axis with Sun vector
          const sun = state.orbit.sunVectorECI;
          targetQ = QuaternionMath.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.atan2(sun.x, sun.z));
        } else if (mode === 'NADIR_POINTING') {
          // Align Z+ body axis towards Earth center (-r vector)
          const r = state.orbit.positionECI;
          targetQ = QuaternionMath.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI + Math.atan2(r.y, r.z));
        } else if (mode === 'DETUMBLE') {
          // B-dot magnetic stabilization mode
          targetQ = state.adcs.quaternion;
        }

        return {
          adcs: {
            ...state.adcs,
            mode,
            targetQuaternion: targetQ,
          },
        };
      });
    },

    toggleSolarPanels: () => {
      set((state) => ({
        eps: {
          ...state.eps,
          solarPanelDeployed: !state.eps.solarPanelDeployed,
        },
      }));
    },

    triggerCollisionAvoidanceManeuver: (debrisId: string) => {
      set((state) => {
        const conj = state.conjunctions.find((c) => c.debrisId === debrisId);
        if (!conj) return state;

        // Apply impulsive delta-V burn to satellite velocity
        const dvMs = conj.recommendedDeltaVMs;
        const dvKmS = dvMs / 1000;
        const newVel: Vector3D = {
          x: state.orbit.velocityECI.x + (conj.burnVectorECI.x / (dvMs || 1)) * dvKmS,
          y: state.orbit.velocityECI.y + (conj.burnVectorECI.y / (dvMs || 1)) * dvKmS,
          z: state.orbit.velocityECI.z + (conj.burnVectorECI.z / (dvMs || 1)) * dvKmS,
        };

        const updatedConjunctions = state.conjunctions.map((c) => {
          if (c.debrisId === debrisId) {
            return {
              ...c,
              severity: 'NOMINAL' as const,
              missDistanceKm: c.missDistanceKm + 8.5,
              collisionProbability: 1.2e-8,
              maneuverExecuted: true,
              recommendedAction: 'CAM maneuver executed successfully. Safe trajectory confirmed.',
            };
          }
          return c;
        });

        return {
          orbit: {
            ...state.orbit,
            velocityECI: newVel,
          },
          adcs: {
            ...state.adcs,
            mode: 'MANEUVER_BURN' as OrbitMode,
          },
          conjunctions: updatedConjunctions,
        };
      });
    },

    switchSatellite: (presetId: string) => {
      const preset = CUBESAT_PRESETS.find((p) => p.id === presetId) || CUBESAT_PRESETS[0];
      const now = Date.now();
      const init = createInitialState(preset, now, get().enableJ2Perturbation);
      set({
        selectedSatellite: preset,
        simulatedTime: now,
        realStartTime: now,
        orbit: init.orbit,
        adcs: init.adcs,
        eps: init.eps,
        comms: init.comms,
        debrisList: init.debris,
        conjunctions: init.conjunctions,
        gnssRO: init.gnssRO,
        propulsion: init.propulsion,
        dragParameters: init.dragParameters,
        dragTelemetry: init.dragTelemetry,
        history: [],
      });
    },

    setActiveGroundStation: (stationId: string | null) => {
      const station = GLOBAL_GROUND_STATIONS.find((s) => s.id === stationId) || null;
      set({ activeGroundStation: station });
    },

    toggleGNSSROPayload: (enabled?: boolean) => {
      set((state) => {
        const nextEnabled = enabled !== undefined ? enabled : !state.gnssRO.enabled;
        return {
          gnssRO: {
            ...state.gnssRO,
            enabled: nextEnabled,
          },
        };
      });
    },

    selectSounding: (soundingId: string) => {
      set((state) => ({
        gnssRO: {
          ...state.gnssRO,
          selectedSoundingId: soundingId,
        },
      }));
    },

    triggerManualSounding: (lat?: number, lon?: number) => {
      set((state) => {
        const targetLat = lat !== undefined ? lat : state.orbit.geodetic.latitude;
        const targetLon = lon !== undefined ? lon : state.orbit.geodetic.longitude;
        const newOcc = GNSSROPhysics.createActiveOccultation(
          targetLat,
          targetLon,
          state.orbit.geodetic.altitude,
          state.gnssRO.completedSoundings.length + state.gnssRO.activeOccultations.length + 1
        );
        return {
          gnssRO: {
            ...state.gnssRO,
            activeOccultations: [newOcc, ...state.gnssRO.activeOccultations.slice(0, 2)],
            selectedSoundingId: newOcc.id,
          },
        };
      });
    },

    toggleGNSSConstellation: (constellation: GNSSConstellation) => {
      set((state) => ({
        gnssRO: {
          ...state.gnssRO,
          filterConstellations: {
            ...state.gnssRO.filterConstellations,
            [constellation]: !state.gnssRO.filterConstellations[constellation],
          },
        },
      }));
    },

    setEdgeAIPowerMode: (mode: 'ACTIVE_INFERENCE' | 'BURST_NEURAL' | 'DEEP_SLEEP') => {
      set((state) => {
        const powerW = mode === 'ACTIVE_INFERENCE' ? 1.65 : mode === 'BURST_NEURAL' ? 2.10 : 0.25;
        return {
          gnssRO: {
            ...state.gnssRO,
            totalPowerDrawW: Number((state.gnssRO.receiverRfPowerW + powerW).toFixed(2)),
            edgeAI: {
              ...state.gnssRO.edgeAI,
              powerMode: mode,
              powerConsumptionW: powerW,
            },
          },
        };
      });
    },

    // Thermal Dissipation & Temperature Control Actions
    setLouverAperture: (aperturePercent: number) => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            louverAperturePercent: Math.max(0, Math.min(100, Number(aperturePercent.toFixed(1)))),
            louverAutoThermostat: false, // User manual override
          },
        },
      }));
    },

    toggleLouverAutoThermostat: () => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            louverAutoThermostat: !state.thermal.controls.louverAutoThermostat,
          },
        },
      }));
    },

    setLouverTargetTemp: (targetC: number) => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            louverTargetTempC: Number(targetC.toFixed(1)),
          },
        },
      }));
    },

    toggleBatteryHeater: () => {
      set((state) => {
        const nextEnabled = !state.thermal.controls.batteryHeaterEnabled;
        return {
          thermal: {
            ...state.thermal,
            controls: {
              ...state.thermal.controls,
              batteryHeaterEnabled: nextEnabled,
              batteryHeaterPowerW: nextEnabled ? 3.2 : 0,
            },
          },
        };
      });
    },

    toggleBatteryHeaterAutoThermostat: () => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            batteryHeaterAutoThermostat: !state.thermal.controls.batteryHeaterAutoThermostat,
          },
        },
      }));
    },

    togglePayloadHeater: () => {
      set((state) => {
        const nextEnabled = !state.thermal.controls.payloadHeaterEnabled;
        return {
          thermal: {
            ...state.thermal,
            controls: {
              ...state.thermal.controls,
              payloadHeaterEnabled: nextEnabled,
              payloadHeaterPowerW: nextEnabled ? 2.0 : 0,
            },
          },
        };
      });
    },

    setThermalStrapMode: (mode: ThermalStrapMode) => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            thermalStrapMode: mode,
          },
        },
      }));
    },

    toggleThermalDerating: () => {
      set((state) => ({
        thermal: {
          ...state.thermal,
          controls: {
            ...state.thermal.controls,
            activeThermalDerating: !state.thermal.controls.activeThermalDerating,
          },
        },
      }));
    },

    triggerThermalScenario: (scenario: 'ECLIPSE_CHILL' | 'SOLAR_PEAK' | 'PA_BURST' | 'NOMINAL_RESET') => {
      set((state) => {
        if (scenario === 'NOMINAL_RESET') {
          return { thermal: ThermalPhysics.createInitialThermalState() };
        }

        const currentNodes = { ...state.thermal.nodes };

        if (scenario === 'ECLIPSE_CHILL') {
          currentNodes['BATTERY'] = { ...currentNodes['BATTERY'], temperatureC: 0.8, temperatureK: 273.95 };
          currentNodes['OBC_CORE'] = { ...currentNodes['OBC_CORE'], temperatureC: 8.5, temperatureK: 281.65 };
          currentNodes['SOLAR_PANELS'] = { ...currentNodes['SOLAR_PANELS'], temperatureC: -54.0, temperatureK: 219.15 };
          currentNodes['RADIATOR'] = { ...currentNodes['RADIATOR'], temperatureC: -42.0, temperatureK: 231.15 };
          currentNodes['CHASSIS'] = { ...currentNodes['CHASSIS'], temperatureC: 7.2, temperatureK: 280.35 };
        } else if (scenario === 'SOLAR_PEAK') {
          currentNodes['SOLAR_PANELS'] = { ...currentNodes['SOLAR_PANELS'], temperatureC: 78.5, temperatureK: 351.65 };
          currentNodes['OBC_CORE'] = { ...currentNodes['OBC_CORE'], temperatureC: 56.4, temperatureK: 329.55 };
          currentNodes['BATTERY'] = { ...currentNodes['BATTERY'], temperatureC: 38.2, temperatureK: 311.35 };
          currentNodes['CHASSIS'] = { ...currentNodes['CHASSIS'], temperatureC: 44.5, temperatureK: 317.65 };
        } else if (scenario === 'PA_BURST') {
          currentNodes['RF_PA'] = { ...currentNodes['RF_PA'], temperatureC: 66.8, temperatureK: 339.95 };
          currentNodes['OBC_CORE'] = { ...currentNodes['OBC_CORE'], temperatureC: 54.0, temperatureK: 327.15 };
        }

        const internalMean = (
          currentNodes['BATTERY'].temperatureC +
          currentNodes['OBC_CORE'].temperatureC +
          currentNodes['CHASSIS'].temperatureC +
          currentNodes['PAYLOAD_GNSS'].temperatureC
        ) / 4.0;

        return {
          thermal: {
            ...state.thermal,
            nodes: currentNodes,
            internalMeanTempC: Number(internalMean.toFixed(1)),
            batteryTempC: currentNodes['BATTERY'].temperatureC,
            obcTempC: currentNodes['OBC_CORE'].temperatureC,
            rfPaTempC: currentNodes['RF_PA'].temperatureC,
            chassisTempC: currentNodes['CHASSIS'].temperatureC,
            solarPanelTempC: currentNodes['SOLAR_PANELS'].temperatureC,
            radiatorTempC: currentNodes['RADIATOR'].temperatureC,
          },
        };
      });
    },

    armThruster: (armed: boolean) => {
      set((state) => ({
        propulsion: {
          ...state.propulsion,
          status: armed ? 'ARMED' : 'STANDBY',
          currentPowerDrawW: armed ? 0.5 : 0,
        },
      }));
    },

    setThrusterConfig: (config: Partial<ThrusterManeuverConfig>) => {
      set((state) => ({
        propulsion: {
          ...state.propulsion,
          config: {
            ...state.propulsion.config,
            ...config,
          },
        },
      }));
    },

    startThrusterManeuver: () => {
      set((state) => {
        if (state.propulsion.propellantMassGrams <= 0) return state;
        const config = state.propulsion.config;
        const est = PropulsionPhysics.estimateManeuverCost(
          config.targetDeltaVMs,
          config.thrustMilliNewtons,
          config.specificImpulseSec,
          state.propulsion.propellantMassGrams,
          state.selectedSatellite.massKg,
          config.valveHeatingEnabled
        );

        const activeBurn = {
          inProgress: true,
          startSimTime: state.simulatedTime,
          durationPlannedSec: est.burnDurationSec,
          durationElapsedSec: 0,
          targetDeltaVMs: config.targetDeltaVMs,
          achievedDeltaVMs: 0,
          direction: config.direction,
          initialOrbit: { ...state.orbit.elements },
        };

        const nextStatus = config.valveHeatingEnabled ? 'PREHEATING' : 'FIRING';
        const initialPowerW = config.valveHeatingEnabled ? 6.8 : 11.4;

        return {
          propulsion: {
            ...state.propulsion,
            status: nextStatus,
            currentPowerDrawW: initialPowerW,
            activeBurn,
          },
        };
      });
    },

    abortThrusterManeuver: () => {
      set((state) => {
        const active = state.propulsion.activeBurn;
        let newHistory = state.propulsion.history;
        if (active && active.achievedDeltaVMs > 0.005) {
          const record: ManeuverRecord = {
            id: `burn-${Date.now()}`,
            timestamp: state.simulatedTime,
            direction: active.direction,
            deltaVMs: Number(active.achievedDeltaVMs.toFixed(3)),
            durationSec: Number(active.durationElapsedSec.toFixed(1)),
            propellantConsumedG: Number((active.durationElapsedSec * 0.046).toFixed(2)),
            energyConsumedWh: Number(((11.4 * active.durationElapsedSec) / 3600).toFixed(3)),
            initialSemiMajorAxisKm: active.initialOrbit.semiMajorAxis,
            finalSemiMajorAxisKm: state.orbit.elements.semiMajorAxis,
            initialApogeeKm: active.initialOrbit.apogeeAltitude,
            finalApogeeKm: state.orbit.elements.apogeeAltitude,
            initialPerigeeKm: active.initialOrbit.perigeeAltitude,
            finalPerigeeKm: state.orbit.elements.perigeeAltitude,
            peakLoadW: 11.4,
          };
          newHistory = [record, ...newHistory].slice(0, 20);
        }

        return {
          propulsion: {
            ...state.propulsion,
            status: 'COOLDOWN',
            currentPowerDrawW: 1.2,
            activeBurn: null,
            history: newHistory,
          },
        };
      });
    },

    refuelPropellant: () => {
      set((state) => ({
        propulsion: {
          ...state.propulsion,
          propellantMassGrams: state.propulsion.propellantCapacityGrams,
          tankPressureBar: 3.2,
          status: 'STANDBY',
          currentPowerDrawW: 0,
          activeBurn: null,
        },
      }));
    },

    pulseRCS: (axis: 'roll' | 'pitch' | 'yaw', direction: 1 | -1) => {
      set((state) => {
        if (state.propulsion.propellantMassGrams < 0.05) return state;
        const impulseGrams = 0.04;
        const newMass = Math.max(0, state.propulsion.propellantMassGrams - impulseGrams);
        const idx = axis === 'roll' ? 0 : axis === 'pitch' ? 1 : 2;
        const wheelAdjustment = direction * 220;
        const newWheelSpeeds: [number, number, number] = [...state.adcs.wheelSpeedRpm];
        newWheelSpeeds[idx] = Math.max(-5000, Math.min(5000, newWheelSpeeds[idx] - wheelAdjustment));

        return {
          propulsion: {
            ...state.propulsion,
            propellantMassGrams: Number(newMass.toFixed(2)),
            totalPropellantConsumedGrams: Number(
              (state.propulsion.totalPropellantConsumedGrams + impulseGrams).toFixed(2)
            ),
          },
          adcs: {
            ...state.adcs,
            wheelSpeedRpm: newWheelSpeeds,
          },
        };
      });
    },

    resetSimulation: () => {
      const now = Date.now();
      const init = createInitialState(get().selectedSatellite, now, get().enableJ2Perturbation);
      set({
        simulatedTime: now,
        realStartTime: now,
        timeWarp: 1,
        isPlaying: true,
        orbit: init.orbit,
        adcs: init.adcs,
        eps: init.eps,
        comms: init.comms,
        debrisList: init.debris,
        conjunctions: init.conjunctions,
        gnssRO: init.gnssRO,
        propulsion: init.propulsion,
        dragParameters: init.dragParameters,
        dragTelemetry: init.dragTelemetry,
        thermal: init.thermal,
        history: [],
      });
    },

    exportTelemetryCSV: () => {
      const hist = get().history;
      const header = 'Time_s,Altitude_km,Velocity_km_s,RAAN_deg,Nodal_Regress_deg_day,Accum_Nodal_Shift_deg,Battery_SoC_pct,Solar_Power_W,Internal_Temp_C,Battery_Temp_C,Solar_Flux_W_m2,Net_Heat_Flow_W,Pointing_Error_deg,Doppler_kHz,Closest_Debris_km,Density_kg_m3,Drag_Decel_microG,Decay_Rate_m_day\n';
      const rows = hist
        .map((p) =>
          [
            p.timeSec.toFixed(2),
            p.altitudeKm.toFixed(3),
            p.velocityKmS.toFixed(4),
            (p.raanDeg ?? 0).toFixed(4),
            (p.nodalRegressDegDay ?? 0).toFixed(4),
            (p.accumNodalShiftDeg ?? 0).toFixed(5),
            p.batterySoc.toFixed(2),
            p.solarPowerW.toFixed(2),
            (p.internalTempC ?? 21.0).toFixed(1),
            (p.batteryTempC ?? 20.0).toFixed(1),
            (p.solarFluxW_M2 ?? 1361.0).toFixed(1),
            (p.netHeatFlowW ?? 0.0).toFixed(2),
            p.pointingErrorDeg.toFixed(3),
            p.dopplerShiftKHz.toFixed(3),
            p.closestDebrisKm.toFixed(3),
            (p.densityKgM3 ?? 0).toExponential(3),
            (p.dragDecelMicroG ?? 0).toFixed(4),
            (p.decayRateMPerDay ?? 0).toFixed(4),
          ].join(',')
        )
        .join('\n');
      return header + rows;
    },

    tickPhysics: (deltaRealSeconds: number) => {
      const {
        isPlaying,
        timeWarp,
        simulatedTime,
        enableJ2Perturbation,
        orbit,
        adcs,
        eps,
        comms,
        debrisList,
        selectedSatellite,
        activeGroundStation,
        gnssRO,
        propulsion,
        thermal,
        history,
        maxHistoryLength,
      } = get();

      if (!isPlaying || timeWarp === 0) return;

      // Effective physical simulation step
      const dtSimSec = deltaRealSeconds * timeWarp;
      const newSimTime = simulatedTime + dtSimSec * 1000;

      // 1. Orbital Mechanics Propagation (accounting for toggleable J2 oblateness & nodal regression)
      let propagated = OrbitalMechanics.propagate(orbit.elements, dtSimSec, enableJ2Perturbation);
      const sunDir = SolarPhysics.getSunVectorECI(newSimTime);

      // 1b. Harris-Priester Atmospheric Drag & Real-Time Secular Orbital Decay
      const dragParams = get().dragParameters;
      const enableDrag = get().enableAtmosphericDrag;
      let cumAltLossMeters = get().dragTelemetry?.cumulativeAltitudeLossMeters || 0;

      const satAltKm = Math.max(100, propagated.elements.semiMajorAxis - EARTH_RADIUS_KM);
      const hpDensity = HarrisPriesterPhysics.calculateDensity(
        satAltKm,
        propagated.positionECI,
        sunDir,
        dragParams.f107SolarFlux,
        dragParams.hpExponentN,
        dragParams.bulgeLagDeg
      );

      const aeroDrag = HarrisPriesterPhysics.calculateAerodynamicDrag(
        propagated.positionECI,
        propagated.velocityECI,
        hpDensity,
        dragParams.cd,
        dragParams.crossSectionAreaM2,
        dragParams.satelliteMassKg
      );

      const decayRates = HarrisPriesterPhysics.calculateDecayRates(
        propagated.elements,
        aeroDrag,
        dragParams.cd,
        dragParams.crossSectionAreaM2,
        dragParams.satelliteMassKg
      );

      if (enableDrag && dtSimSec > 0) {
        // da/dt is in m/s (negative for drag energy dissipation)
        const deltaA_meters = decayRates.semiMajorAxisDecayMetersPerSec * dtSimSec;
        const deltaA_km = deltaA_meters / 1000;
        const newSemiMajorAxisKm = Math.max(EARTH_RADIUS_KM + 120, propagated.elements.semiMajorAxis + deltaA_km);

        const decayScale = newSemiMajorAxisKm / propagated.elements.semiMajorAxis;
        propagated.elements.semiMajorAxis = newSemiMajorAxisKm;
        propagated.elements.periodMinutes *= Math.pow(decayScale, 1.5);
        propagated.elements.apogeeAltitude = newSemiMajorAxisKm * (1 + propagated.elements.eccentricity) - EARTH_RADIUS_KM;
        propagated.elements.perigeeAltitude = newSemiMajorAxisKm * (1 - propagated.elements.eccentricity) - EARTH_RADIUS_KM;

        cumAltLossMeters += Math.abs(deltaA_meters);
      }

      const updatedDragTelemetry: AtmosphericDragTelemetry = {
        enabled: enableDrag,
        densityKgM3: hpDensity.densityKgM3,
        rhoMinKgM3: hpDensity.rhoMinKgM3,
        rhoMaxKgM3: hpDensity.rhoMaxKgM3,
        diurnalRatio: hpDensity.diurnalRatio,
        bulgeAngleDeg: hpDensity.bulgeAngleDeg,
        diurnalBulgeFraction: hpDensity.diurnalFactor,
        subsolarAngleDeg: hpDensity.subsolarAngleDeg,
        scaleHeightKm: hpDensity.scaleHeightKm,
        relVelocityKmS: aeroDrag.relVelocityKmS,
        dragDecelVectorECI: aeroDrag.dragDecelVectorECI,
        dragDecelMagnitudeMs2: aeroDrag.dragDecelMagnitudeMs2,
        dragDecelMicroG: aeroDrag.dragDecelMicroG,
        dragForceMicroN: aeroDrag.dragForceMicroN,
        dynamicPressurePa: aeroDrag.dynamicPressurePa,
        ballisticCoefficientKgM2: aeroDrag.ballisticCoefficientKgM2,
        semiMajorAxisDecayMetersDay: decayRates.semiMajorAxisDecayMetersPerDay,
        semiMajorAxisDecayKmYear: decayRates.semiMajorAxisDecayKmPerYear,
        apogeeDecayMetersDay: decayRates.apogeeDecayMetersPerDay,
        perigeeDecayMetersDay: decayRates.perigeeDecayMetersPerDay,
        periodDecayMsPerDay: decayRates.periodDecayMsPerDay,
        reentryLifetimeDays: decayRates.reentryLifetimeDays,
        reentryStatus: decayRates.reentryStatus,
        cumulativeAltitudeLossMeters: Number(cumAltLossMeters.toFixed(2)),
        parameters: dragParams,
      };

      const newGeodetic = OrbitalMechanics.eciToGeodetic(propagated.positionECI, newSimTime);
      const eclipse = SolarPhysics.calculateEclipse(propagated.positionECI, sunDir);
      const betaAngle = SolarPhysics.calculateBetaAngle(propagated.positionECI, propagated.velocityECI, sunDir);

      // Accumulate secular nodal regression shift since mission epoch
      const prevAccumNodal = orbit.accumulatedNodalShiftDeg || 0;
      const deltaNodal = enableJ2Perturbation
        ? (propagated.nodalRegressionRateDegDay / 86400) * dtSimSec
        : 0;
      const accumulatedNodalShiftDeg = Number((prevAccumNodal + deltaNodal).toFixed(5));

      let updatedOrbit: OrbitalState = {
        epoch: orbit.epoch,
        simulatedTime: newSimTime,
        positionECI: propagated.positionECI,
        velocityECI: propagated.velocityECI,
        geodetic: newGeodetic,
        elements: propagated.elements,
        sunVectorECI: sunDir,
        eclipseState: eclipse.state,
        eclipseFraction: eclipse.fraction,
        betaAngle,
        j2Enabled: enableJ2Perturbation,
        nodalRegressionRateDegDay: propagated.nodalRegressionRateDegDay,
        accumulatedNodalShiftDeg,
        perigeePrecessionRateDegDay: propagated.perigeePrecessionRateDegDay,
        groundTrackNodalShiftDegOrbit: propagated.groundTrackNodalShiftDegOrbit,
      };

      // 2. ADCS Rotational Kinematics & Closed-Loop Control
      let targetQ = adcs.targetQuaternion;
      let targetOmega = { x: 0, y: 0, z: 0 };
      let pointingErrorDeg = adcs.pointingErrorDeg;

      if (adcs.mode === 'SUN_POINTING') {
        // Body Z pointing at Sun
        const sunAngle = Math.atan2(sunDir.x, sunDir.z);
        targetQ = QuaternionMath.fromAxisAngle({ x: 0, y: 1, z: 0 }, sunAngle);
        pointingErrorDeg = Math.max(0.2, QuaternionMath.angleBetween(adcs.quaternion, targetQ));
      } else if (adcs.mode === 'NADIR_POINTING') {
        const rPos = updatedOrbit.positionECI;
        const nadirAngle = Math.PI + Math.atan2(rPos.y, rPos.z);
        targetQ = QuaternionMath.fromAxisAngle({ x: 1, y: 0, z: 0 }, nadirAngle);
        pointingErrorDeg = Math.max(0.35, QuaternionMath.angleBetween(adcs.quaternion, targetQ));
      } else if (adcs.mode === 'DETUMBLE') {
        // B-dot controller dampens angular velocity exponentially
        targetOmega = {
          x: adcs.angularVelocity.x * 0.94,
          y: adcs.angularVelocity.y * 0.94,
          z: adcs.angularVelocity.z * 0.94,
        };
        pointingErrorDeg = 12.5;
      }

      // Attitude controller torque response
      const slerpFactor = Math.min(1.0, 0.08 * (dtSimSec > 10 ? 1 : dtSimSec));
      const newQ = QuaternionMath.slerp(adcs.quaternion, targetQ, slerpFactor);
      const euler = QuaternionMath.toEuler(newQ);

      // Reaction wheel RPM adjustment based on attitude torque
      const wheelDeltaRpm = (Math.random() - 0.5) * 4;
      const wheelSpeedRpm: [number, number, number] = [
        Math.min(5000, Math.max(-5000, adcs.wheelSpeedRpm[0] + wheelDeltaRpm)),
        Math.min(5000, Math.max(-5000, adcs.wheelSpeedRpm[1] - wheelDeltaRpm * 0.8)),
        Math.min(5000, Math.max(-5000, adcs.wheelSpeedRpm[2] + wheelDeltaRpm * 0.5)),
      ];

      const updatedADCS: ADCSState = {
        ...adcs,
        quaternion: newQ,
        targetQuaternion: targetQ,
        euler,
        wheelSpeedRpm,
        pointingErrorDeg: Number(pointingErrorDeg.toFixed(2)),
        detumbleRate: Math.sqrt(
          adcs.angularVelocity.x ** 2 + adcs.angularVelocity.y ** 2 + adcs.angularVelocity.z ** 2
        ),
      };

      // 3. ADCS Thruster & Propulsion Simulation (Orbit Maneuver & Delta-V execution)
      let updatedPropulsion: PropulsionState = { ...propulsion };
      let thrusterOrbitMod = updatedOrbit;

      if (updatedPropulsion.enabled) {
        let currentStatus = updatedPropulsion.status;
        let chamberTemp = updatedPropulsion.chamberTempC;
        let propMass = updatedPropulsion.propellantMassGrams;
        let consumedProp = updatedPropulsion.totalPropellantConsumedGrams;
        let cumulativeDv = updatedPropulsion.cumulativeDeltaVMs;
        let activeBurn = updatedPropulsion.activeBurn ? { ...updatedPropulsion.activeBurn } : null;
        let historyBurns = [...updatedPropulsion.history];

        if (currentStatus === 'PREHEATING') {
          // Heat nozzle & catalyst chamber
          chamberTemp = Math.min(260.0, chamberTemp + 35.0 * dtSimSec);
          if (chamberTemp >= 160.0 || !updatedPropulsion.config.valveHeatingEnabled) {
            currentStatus = 'FIRING';
          }
        } else if (currentStatus === 'FIRING' && activeBurn) {
          chamberTemp = Math.min(285.0, chamberTemp + 15.0 * dtSimSec);
          const satMassKg = selectedSatellite.massKg + propMass / 1000;
          const thrustN = updatedPropulsion.config.thrustMilliNewtons / 1000;
          const ispSec = updatedPropulsion.config.specificImpulseSec;
          const mDotGramsPerSec = (thrustN / (ispSec * 9.80665)) * 1000;

          // Propellant burned this time step
          const propStepGrams = mDotGramsPerSec * dtSimSec;
          const clampedPropGrams = Math.min(propMass, propStepGrams);

          // Delta-V step produced
          const accelKmS2 = thrustN / (satMassKg * 1000);
          let deltaVStepMs = accelKmS2 * 1000 * dtSimSec;

          const remainingTargetDv = Math.max(0, activeBurn.targetDeltaVMs - activeBurn.achievedDeltaVMs);
          if (deltaVStepMs > remainingTargetDv) {
            deltaVStepMs = remainingTargetDv;
          }

          if (deltaVStepMs > 0 && propMass > 0) {
            // Apply delta-v directly to orbital velocity vector & Keplerian elements
            const applied = PropulsionPhysics.applyDeltaV(
              thrusterOrbitMod,
              deltaVStepMs,
              activeBurn.direction
            );
            thrusterOrbitMod = applied.updatedOrbit;
            propMass = Math.max(0, Number((propMass - clampedPropGrams).toFixed(3)));
            consumedProp = Number((consumedProp + clampedPropGrams).toFixed(3));
            cumulativeDv = Number((cumulativeDv + deltaVStepMs).toFixed(3));

            activeBurn.achievedDeltaVMs = Number((activeBurn.achievedDeltaVMs + deltaVStepMs).toFixed(3));
            activeBurn.durationElapsedSec = Number((activeBurn.durationElapsedSec + dtSimSec).toFixed(1));
          }

          // Check for burn completion or propellant exhaustion
          if (activeBurn.achievedDeltaVMs >= activeBurn.targetDeltaVMs || propMass <= 0) {
            const finalRecord: ManeuverRecord = {
              id: `burn-${Date.now()}`,
              timestamp: newSimTime,
              direction: activeBurn.direction,
              deltaVMs: Number(activeBurn.achievedDeltaVMs.toFixed(3)),
              durationSec: Number(activeBurn.durationElapsedSec.toFixed(1)),
              propellantConsumedG: Number((activeBurn.durationElapsedSec * mDotGramsPerSec).toFixed(2)),
              energyConsumedWh: Number(((11.4 * activeBurn.durationElapsedSec) / 3600).toFixed(3)),
              initialSemiMajorAxisKm: activeBurn.initialOrbit.semiMajorAxis,
              finalSemiMajorAxisKm: thrusterOrbitMod.elements.semiMajorAxis,
              initialApogeeKm: activeBurn.initialOrbit.apogeeAltitude,
              finalApogeeKm: thrusterOrbitMod.elements.apogeeAltitude,
              initialPerigeeKm: activeBurn.initialOrbit.perigeeAltitude,
              finalPerigeeKm: thrusterOrbitMod.elements.perigeeAltitude,
              peakLoadW: 11.4,
            };
            historyBurns = [finalRecord, ...historyBurns].slice(0, 20);
            currentStatus = 'COOLDOWN';
            activeBurn = null;
          }
        } else if (currentStatus === 'COOLDOWN') {
          chamberTemp = Math.max(21.0, chamberTemp - 12.0 * dtSimSec);
          if (chamberTemp <= 32.0) {
            currentStatus = 'ARMED';
          }
        }

        const powerBreakdown = PropulsionPhysics.calculateSubsystemPower(
          currentStatus,
          updatedPropulsion.config.valveHeatingEnabled,
          updatedPropulsion.config.thrustMilliNewtons
        );

        updatedPropulsion = {
          ...updatedPropulsion,
          status: currentStatus,
          chamberTempC: Number(chamberTemp.toFixed(1)),
          propellantMassGrams: propMass,
          totalPropellantConsumedGrams: consumedProp,
          cumulativeDeltaVMs: cumulativeDv,
          currentPowerDrawW: Number(powerBreakdown.thrusterPowerW.toFixed(2)),
          currentThrustMilliN: currentStatus === 'FIRING' ? updatedPropulsion.config.thrustMilliNewtons : 0,
          currentMassFlowRateGramsPerSec: currentStatus === 'FIRING'
            ? Number(((updatedPropulsion.config.thrustMilliNewtons / 1000 / (updatedPropulsion.config.specificImpulseSec * 9.80665)) * 1000).toFixed(4))
            : 0,
          activeBurn,
          history: historyBurns,
        };
      }

      // Sync updated orbit with thruster modifications
      updatedOrbit = thrusterOrbitMod;
      updatedADCS.propulsion = updatedPropulsion;

      // 4. Thermal Subsystem Multi-Node Simulation & Heat Dissipation Controls
      const updatedThermal = ThermalPhysics.stepThermalSimulation(
        thermal,
        sunDir,
        newQ,
        updatedOrbit.positionECI,
        updatedOrbit.velocityECI,
        {
          semiMajorAxis: updatedOrbit.elements.semiMajorAxis,
          periodMinutes: updatedOrbit.elements.periodMinutes,
        },
        eclipse.state,
        eclipse.fraction,
        eps,
        updatedADCS,
        comms,
        updatedPropulsion,
        gnssRO,
        dtSimSec,
        selectedSatellite.geometry
      );

      // 5. Electrical Power System (EPS) Simulation with Solar Incidence Calculator
      const newPanelTemp = updatedThermal.solarPanelTempC;

      const solarIncidence = SolarPhysics.calculateSolarPanelIncidence(
        sunDir,
        newQ,
        eps.solarPanelDeployed,
        eclipse.fraction,
        newPanelTemp,
        selectedSatellite.solarCapacityW,
        selectedSatellite.geometry
      );

      const solarPowerGen = solarIncidence.totalArrayPowerW;

      // Power consumers: ADCS wheels (1.5W), Comms, OBC, Payload, Thrusters, and Active Thermal Heaters
      const baseLoad = 3.5;
      const commsLoad = comms.linkStatus === 'DATA_DOWNLINK' ? 3.8 : 1.5;
      const adcsLoad = Math.abs(wheelSpeedRpm[0]) / 3000 + 0.8;
      const gnssROLoad = gnssRO.enabled ? gnssRO.totalPowerDrawW : 0.05;
      const thrusterPowerW = updatedPropulsion.enabled ? updatedPropulsion.currentPowerDrawW : 0;
      const thrusterAdcsCouplingW = updatedPropulsion.status === 'FIRING' ? 1.4 : updatedPropulsion.status === 'PREHEATING' ? 0.4 : 0;
      const thermalHeatersPowerW = updatedThermal.controls.batteryHeaterPowerW + updatedThermal.controls.payloadHeaterPowerW;
      const totalLoadW = baseLoad + commsLoad + adcsLoad + thrusterAdcsCouplingW + gnssROLoad + thrusterPowerW + thermalHeatersPowerW;

      const netPowerW = solarPowerGen - totalLoadW;
      const netCurrentA = netPowerW / eps.batteryVoltageV;

      // Battery state of charge integration
      const deltaCapacityWh = (netPowerW * dtSimSec) / 3600;
      let newRemainingWh = Math.min(
        selectedSatellite.batteryCapacityWh,
        Math.max(0.5, eps.batteryRemainingWh + deltaCapacityWh)
      );
      const newSoc = Math.min(100, Math.max(2, (newRemainingWh / selectedSatellite.batteryCapacityWh) * 100));

      // Battery voltage estimation (LiFePO4 OCV curve)
      const nominalVoltage = 7.4 + (newSoc / 100) * 1.05 + (netCurrentA > 0 ? 0.15 : -0.1);

      const updatedEPS: EPSState = {
        ...eps,
        solarArrayPowerW: Number(solarPowerGen.toFixed(2)),
        totalLoadPowerW: Number(totalLoadW.toFixed(2)),
        batteryVoltageV: Number(nominalVoltage.toFixed(2)),
        batteryCurrentA: Number(netCurrentA.toFixed(2)),
        batterySocPercent: Number(newSoc.toFixed(1)),
        batteryRemainingWh: Number(newRemainingWh.toFixed(2)),
        solarPanelTempC: Number(updatedThermal.solarPanelTempC.toFixed(1)),
        batteryTempC: Number(updatedThermal.batteryTempC.toFixed(1)),
        bus3v3CurrentA: Number((1.2 / 3.3).toFixed(2)),
        bus5vCurrentA: Number((3.5 / 5.0).toFixed(2)),
        bus12vCurrentA: Number((0.18 + (thrusterPowerW / 12.0) + (thermalHeatersPowerW / 12.0) + (netPowerW < 0 ? 0.15 : 0.4)).toFixed(2)),
        lowPowerModeActive: newSoc < 20,
        panelFaces: solarIncidence.panelFaces,
        sunVectorBody: solarIncidence.sunVectorBody,
        effectiveHarvestingEfficiencyPercent: solarIncidence.effectiveHarvestingEfficiencyPercent,
      };

      // 4. Communications & Ground Link Tracking
      let commsLinkStatus = comms.linkStatus;
      let dopplerShiftHz = comms.dopplerShiftHz;
      let slantRangeKm = comms.slantRangeKm;
      let elevDeg = comms.elevationDeg;
      let azimDeg = comms.azimuthDeg;
      let fsplDb = comms.fsplDb;
      let snrDb = comms.receivedSnrDb;

      const station = activeGroundStation || GLOBAL_GROUND_STATIONS[0];
      if (station) {
        const lookAngles = OrbitalMechanics.computeGroundStationLookAngles(
          updatedOrbit.positionECI,
          station.latitude,
          station.longitude,
          station.altitudeM,
          newSimTime
        );

        slantRangeKm = lookAngles.slantRangeKm;
        elevDeg = lookAngles.elevationDeg;
        azimDeg = lookAngles.azimuthDeg;

        // Doppler shift: delta_f = -f0 * (v_radial / c)
        // Approximate radial velocity using elevation rate
        const radialVelKmS = (Math.sin((elevDeg * Math.PI) / 180) * 7.5 - 3.2);
        dopplerShiftHz = -(station.activeFrequencyMHz * 1e6 * (radialVelKmS / 299792.458));

        // Free Space Path Loss FSPL = 20*log10(d) + 20*log10(f) + 92.45
        fsplDb = 20 * Math.log10(Math.max(100, slantRangeKm)) + 20 * Math.log10(station.activeFrequencyMHz) - 27.55;
        snrDb = Math.max(0, 195 - fsplDb);

        if (lookAngles.inView) {
          commsLinkStatus = snrDb > 14 ? 'DATA_DOWNLINK' : 'LINK_LOCKED';
        } else {
          commsLinkStatus = 'DISCONNECTED';
        }
      }

      const packetsIncr = commsLinkStatus === 'DATA_DOWNLINK' ? Math.ceil(dtSimSec * 8) : 0;
      const updatedComms: CommsState = {
        ...comms,
        slantRangeKm: Number(slantRangeKm.toFixed(1)),
        elevationDeg: Number(elevDeg.toFixed(1)),
        azimuthDeg: Number(azimDeg.toFixed(1)),
        dopplerShiftHz: Number(dopplerShiftHz.toFixed(1)),
        fsplDb: Number(fsplDb.toFixed(1)),
        receivedSnrDb: Number(snrDb.toFixed(1)),
        linkStatus: commsLinkStatus,
        packetsDownlinked: comms.packetsDownlinked + packetsIncr,
        downlinkSpeedKbps: commsLinkStatus === 'DATA_DOWNLINK' ? 2048 : 0,
        activeGroundStation: station,
      };

      // 5. Space Debris Propagation & Conjunction Assessment
      const updatedDebris = debrisList.map((deb) => {
        const dElem = {
          semiMajorAxis: deb.semiMajorAxisKm,
          eccentricity: deb.eccentricity,
          inclination: deb.inclinationDeg,
          raan: deb.raanDeg,
          argOfPerigee: deb.argOfPerigeeDeg,
          trueAnomaly: deb.meanAnomalyDeg,
          meanAnomaly: deb.meanAnomalyDeg,
          periodMinutes: 1440 / deb.meanMotionRevsPerDay,
          apogeeAltitude: deb.semiMajorAxisKm * (1 + deb.eccentricity) - 6378.137,
          perigeeAltitude: deb.semiMajorAxisKm * (1 - deb.eccentricity) - 6378.137,
        };
        const debProp = OrbitalMechanics.propagateJ2(dElem, dtSimSec);
        const dx = debProp.positionECI.x - updatedOrbit.positionECI.x;
        const dy = debProp.positionECI.y - updatedOrbit.positionECI.y;
        const dz = debProp.positionECI.z - updatedOrbit.positionECI.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        return {
          ...deb,
          meanAnomalyDeg: (deb.meanAnomalyDeg + (360 / (1440 / deb.meanMotionRevsPerDay) / 60) * dtSimSec) % 360,
          positionECI: debProp.positionECI,
          velocityECI: debProp.velocityECI,
          currentDistanceKm: Number(dist.toFixed(2)),
        };
      });

      const updatedConjunctions = updatedDebris.map((deb) =>
        CollisionPhysics.evaluateConjunction(updatedOrbit, deb)
      );

      // 6. GNSS Radio Occultation & Edge-AI Micro-Controller Processing
      let updatedGNSSRO = gnssRO;
      if (gnssRO && gnssRO.enabled) {
        let completed = [...gnssRO.completedSoundings];
        let totalSavedMB = gnssRO.edgeAI.totalDataDownlinkSavedMB;
        let totalProcessed = gnssRO.edgeAI.totalSoundingsProcessed;

        const nextActive = gnssRO.activeOccultations.map((occ) => {
          // Progress occultation down/up the atmospheric limb
          const descentRateKmSec = 0.8 * (dtSimSec > 10 ? 10 : Math.max(0.1, dtSimSec));
          let newAlt = occ.type === 'SETTING'
            ? Math.max(0.2, occ.tangentAltitudeKm - descentRateKmSec)
            : Math.min(65.0, occ.tangentAltitudeKm + descentRateKmSec);

          let newProgress = occ.type === 'SETTING'
            ? Math.min(100, Math.round(((68.0 - newAlt) / 67.5) * 100))
            : Math.min(100, Math.round((newAlt / 65.0) * 100));

          let newStatus = occ.status;
          if (newProgress >= 88 && newProgress < 100) {
            newStatus = 'INVERTING_ABEL';
          } else if (newProgress >= 100) {
            newStatus = 'COMPRESSED';
          }

          const dopplerVal = occ.type === 'SETTING'
            ? -15.0 - (1.0 - newAlt / 70) * 35.0
            : 35.0 - (newAlt / 70) * 20.0;

          return {
            ...occ,
            tangentAltitudeKm: Number(newAlt.toFixed(2)),
            impactParameterKm: Number((6378.137 + newAlt).toFixed(2)),
            progressPercent: newProgress,
            status: newStatus,
            excessDopplerHz: Number(dopplerVal.toFixed(1)),
          };
        });

        // Filter finished occultations
        const finished = nextActive.filter((o) => o.progressPercent >= 100);
        const remaining = nextActive.filter((o) => o.progressPercent < 100);

        if (finished.length > 0) {
          finished.forEach((fin) => {
            completed.unshift(fin);
            totalSavedMB += (fin.rawDataSizeKB - fin.edgeCompressedSizeKB) / 1024;
            totalProcessed += 1;
          });
          completed = completed.slice(0, 30);
        }

        // Auto-seed next occultation along limb if active list drops below 2
        let finalActive = remaining;
        if (finalActive.length === 0) {
          const freshOcc = GNSSROPhysics.createActiveOccultation(
            updatedOrbit.geodetic.latitude,
            updatedOrbit.geodetic.longitude,
            updatedOrbit.geodetic.altitude,
            totalProcessed + 1
          );
          finalActive = [freshOcc];
        }

        updatedGNSSRO = {
          ...gnssRO,
          activeOccultations: finalActive,
          completedSoundings: completed,
          selectedSoundingId: gnssRO.selectedSoundingId || (completed[0]?.id ?? null),
          edgeAI: {
            ...gnssRO.edgeAI,
            totalDataDownlinkSavedMB: Number(totalSavedMB.toFixed(1)),
            totalSoundingsProcessed: totalProcessed,
            inferenceLatencyMs: Number((38.0 + (Math.random() - 0.5) * 1.5).toFixed(1)),
          },
        };
      }

      // Find closest debris distance for history
      const closestDebrisDist = Math.min(...updatedDebris.map((d) => d.currentDistanceKm));
      const velMag = Math.sqrt(
        updatedOrbit.velocityECI.x ** 2 + updatedOrbit.velocityECI.y ** 2 + updatedOrbit.velocityECI.z ** 2
      );

      // Append to ring buffer
      const newHistoryPoint: TelemetryHistoryPoint = {
        timeSec: (newSimTime - get().realStartTime) / 1000,
        altitudeKm: updatedOrbit.geodetic.altitude,
        velocityKmS: velMag,
        batterySoc: updatedEPS.batterySocPercent,
        solarPowerW: updatedEPS.solarArrayPowerW,
        pointingErrorDeg: updatedADCS.pointingErrorDeg,
        dopplerShiftKHz: updatedComms.dopplerShiftHz / 1000,
        closestDebrisKm: closestDebrisDist,
        raanDeg: updatedOrbit.elements.raan,
        nodalRegressDegDay: updatedOrbit.nodalRegressionRateDegDay,
        accumNodalShiftDeg: updatedOrbit.accumulatedNodalShiftDeg,
        thrusterPowerW: updatedPropulsion.currentPowerDrawW,
        propellantGrams: updatedPropulsion.propellantMassGrams,
        batteryCurrentA: updatedEPS.batteryCurrentA,
        densityKgM3: hpDensity.densityKgM3,
        dragDecelMicroG: aeroDrag.dragDecelMicroG,
        decayRateMPerDay: decayRates.semiMajorAxisDecayMetersPerDay,
        internalTempC: updatedThermal.internalMeanTempC,
        batteryTempC: updatedThermal.batteryTempC,
        solarPanelTempC: updatedThermal.solarPanelTempC,
        radiatorTempC: updatedThermal.radiatorTempC,
        solarFluxW_M2: updatedThermal.environment.solarIrradianceWPerM2,
        netHeatFlowW: updatedThermal.environment.netThermalImbalanceW,
        rejectionPowerW: updatedThermal.environment.totalHeatRejectedW,
      };

      const newHistory = [...history, newHistoryPoint].slice(-maxHistoryLength);

      set({
        simulatedTime: newSimTime,
        orbit: updatedOrbit,
        adcs: updatedADCS,
        eps: updatedEPS,
        comms: updatedComms,
        debrisList: updatedDebris,
        conjunctions: updatedConjunctions,
        gnssRO: updatedGNSSRO,
        propulsion: updatedPropulsion,
        dragTelemetry: updatedDragTelemetry,
        thermal: updatedThermal,
        history: newHistory,
      });
    },
  };
});
