import {
  ThermalNodeId,
  ThermalNode,
  ThermalState,
  HeatDissipationControls,
  ThermalEnvironment,
  ThermalNodeStatus,
  Vector3D,
  Quaternion,
  EPSState,
  ADCSState,
  CommsState,
  PropulsionState,
  GNSSROState,
} from '../../types/telemetry';
import { QuaternionMath } from './quaternion';
import type { CubeSatGeometry } from '../data/tleCatalog';

// Physical constants
export const STEFAN_BOLTZMANN_SIGMA = 5.670374419e-8; // W/(m²·K⁴)
export const SOLAR_CONSTANT_W_M2 = 1361.0;            // W/m² in LEO
export const EARTH_ALBEDO_COEFF = 0.30;               // Average Earth albedo
export const EARTH_IR_FLUX_W_M2 = 237.0;              // Earth planetary outgoing longwave radiation
export const DEEP_SPACE_TEMP_K = 3.0;                 // 3 Kelvin (-270.15 °C)
export const KELVIN_ZERO_C = 273.15;

export interface ThermalNodeDef {
  id: ThermalNodeId;
  name: string;
  category: 'INTERNAL_COMPONENT' | 'STRUCTURE' | 'EXTERNAL_SURFACE';
  heatCapacityJPerK: number;
  minOperatingTempC: number;
  maxOperatingTempC: number;
  minSurvivalTempC: number;
  maxSurvivalTempC: number;
  initialTempC: number;
}

export const THERMAL_NODE_DEFINITIONS: ThermalNodeDef[] = [
  {
    id: 'BATTERY',
    name: 'Battery Pack (LiFePO4)',
    category: 'INTERNAL_COMPONENT',
    heatCapacityJPerK: 850,
    minOperatingTempC: 0.0,
    maxOperatingTempC: 45.0,
    minSurvivalTempC: -20.0,
    maxSurvivalTempC: 60.0,
    initialTempC: 19.5,
  },
  {
    id: 'OBC_CORE',
    name: 'OBC Core & Edge AI MCU',
    category: 'INTERNAL_COMPONENT',
    heatCapacityJPerK: 340,
    minOperatingTempC: -20.0,
    maxOperatingTempC: 65.0,
    minSurvivalTempC: -40.0,
    maxSurvivalTempC: 85.0,
    initialTempC: 28.2,
  },
  {
    id: 'PAYLOAD_GNSS',
    name: 'GNSS-RO Payload Receiver',
    category: 'INTERNAL_COMPONENT',
    heatCapacityJPerK: 460,
    minOperatingTempC: -15.0,
    maxOperatingTempC: 55.0,
    minSurvivalTempC: -35.0,
    maxSurvivalTempC: 75.0,
    initialTempC: 24.8,
  },
  {
    id: 'RF_PA',
    name: 'Comms RF Power Amplifier',
    category: 'INTERNAL_COMPONENT',
    heatCapacityJPerK: 210,
    minOperatingTempC: -20.0,
    maxOperatingTempC: 70.0,
    minSurvivalTempC: -40.0,
    maxSurvivalTempC: 90.0,
    initialTempC: 34.0,
  },
  {
    id: 'ADCS_WHEELS',
    name: 'ADCS Reaction Wheel Assembly',
    category: 'INTERNAL_COMPONENT',
    heatCapacityJPerK: 580,
    minOperatingTempC: -15.0,
    maxOperatingTempC: 50.0,
    minSurvivalTempC: -30.0,
    maxSurvivalTempC: 65.0,
    initialTempC: 21.0,
  },
  {
    id: 'CHASSIS',
    name: 'Internal Structural Chassis',
    category: 'STRUCTURE',
    heatCapacityJPerK: 1650,
    minOperatingTempC: -30.0,
    maxOperatingTempC: 70.0,
    minSurvivalTempC: -50.0,
    maxSurvivalTempC: 90.0,
    initialTempC: 21.5,
  },
  {
    id: 'RADIATOR',
    name: 'Variable Louver Radiator Panel',
    category: 'STRUCTURE',
    heatCapacityJPerK: 320,
    minOperatingTempC: -50.0,
    maxOperatingTempC: 75.0,
    minSurvivalTempC: -70.0,
    maxSurvivalTempC: 95.0,
    initialTempC: 11.2,
  },
  {
    id: 'SOLAR_PANELS',
    name: 'External Skin & Solar Arrays',
    category: 'EXTERNAL_SURFACE',
    heatCapacityJPerK: 480,
    minOperatingTempC: -65.0,
    maxOperatingTempC: 85.0,
    minSurvivalTempC: -80.0,
    maxSurvivalTempC: 110.0,
    initialTempC: 38.0,
  },
];

export class ThermalPhysics {
  /**
   * Initializes the default thermal state
   */
  public static createInitialThermalState(): ThermalState {
    const nodes: Record<ThermalNodeId, ThermalNode> = {} as any;

    THERMAL_NODE_DEFINITIONS.forEach((def) => {
      nodes[def.id] = {
        id: def.id,
        name: def.name,
        category: def.category,
        temperatureC: def.initialTempC,
        temperatureK: def.initialTempC + KELVIN_ZERO_C,
        minOperatingTempC: def.minOperatingTempC,
        maxOperatingTempC: def.maxOperatingTempC,
        minSurvivalTempC: def.minSurvivalTempC,
        maxSurvivalTempC: def.maxSurvivalTempC,
        heatCapacityJPerK: def.heatCapacityJPerK,
        internalHeatDissipationW: 0,
        environmentalHeatInputW: 0,
        conductiveHeatTransferW: 0,
        radiativeRejectionW: 0,
        netHeatFlowW: 0,
        rateOfTempChangeCPerMin: 0,
        status: 'NOMINAL',
        activeCoolingCoupling: 1.8,
        heaterActive: false,
      };
    });

    const defaultControls: HeatDissipationControls = {
      louverAperturePercent: 45.0,
      louverAutoThermostat: true,
      louverTargetTempC: 21.0,
      batteryHeaterEnabled: false,
      batteryHeaterAutoThermostat: true,
      batteryHeaterPowerW: 0.0,
      payloadHeaterEnabled: false,
      payloadHeaterAutoThermostat: true,
      payloadHeaterPowerW: 0.0,
      thermalStrapMode: 'BALANCED',
      activeThermalDerating: true,
      deepSpaceRadiationShield: true,
    };

    const defaultEnvironment: ThermalEnvironment = {
      solarIrradianceWPerM2: SOLAR_CONSTANT_W_M2,
      solarFluxDirectW: 24.8,
      earthAlbedoFluxW: 5.4,
      earthIRFluxW: 4.8,
      totalHeatInputW: 42.6,
      totalHeatRejectedW: 41.8,
      netThermalImbalanceW: 0.8,
      rateOfSpacecraftTempChangeCPerMin: 0.01,
      eclipseState: 'SUNLIGHT',
      eclipseFraction: 1.0,
      timeInCurrentRegimeSec: 120,
      predictedTimeInEclipseSec: 2180,
      predictedTimeInSunlightSec: 3480,
    };

    return {
      internalMeanTempC: 22.4,
      chassisTempC: 21.5,
      batteryTempC: 19.5,
      obcTempC: 28.2,
      payloadTempC: 24.8,
      rfPaTempC: 34.0,
      adcsTempC: 21.0,
      radiatorTempC: 11.2,
      solarPanelTempC: 38.0,
      nodes,
      controls: defaultControls,
      environment: defaultEnvironment,
      hasThermalWarning: false,
      thermalDeratingActive: false,
      autoProtectionEngaged: false,
    };
  }

  /**
   * Determine thermal node health status
   */
  public static evaluateNodeStatus(node: ThermalNode): ThermalNodeStatus {
    const t = node.temperatureC;
    if (t < node.minSurvivalTempC) return 'CRITICAL_COLD';
    if (t > node.maxSurvivalTempC) return 'CRITICAL_HOT';
    if (t < node.minOperatingTempC) return 'COLD_WARNING';
    if (t > node.maxOperatingTempC) return 'HOT_WARNING';
    return 'NOMINAL';
  }

  /**
   * Calculates component internal waste heat generation based on real-time subsystem state
   */
  public static calculateComponentDissipation(
    nodeId: ThermalNodeId,
    eps: EPSState,
    adcs: ADCSState,
    comms: CommsState,
    propulsion: PropulsionState,
    gnssRO: GNSSROState,
    controls: HeatDissipationControls,
    deratingActive: boolean
  ): { heatW: number; heaterActive: boolean } {
    let heatW = 0;
    let heaterActive = false;

    switch (nodeId) {
      case 'BATTERY': {
        // Battery electrochemical loss and Joule heating I^2 * R
        const rInt = 0.085; // Ohms internal resistance
        const iBatt = Math.abs(eps.batteryCurrentA);
        const jouleLossW = iBatt * iBatt * rInt;
        // Battery chemical reaction thermal entropy (~6% of throughput power)
        const throughputW = Math.abs(eps.batteryVoltageV * eps.batteryCurrentA);
        const chemHeatW = throughputW * 0.055;
        heatW = Math.min(6.0, 0.25 + jouleLossW + chemHeatW);

        // Active Battery Patch Heater (+3.2 W when firing)
        if (controls.batteryHeaterEnabled || (controls.batteryHeaterAutoThermostat && controls.batteryHeaterPowerW > 0)) {
          heatW += 3.2;
          heaterActive = true;
        }
        break;
      }

      case 'OBC_CORE': {
        // Baseline MCU power dissipation
        let obcBaseW = 1.35;
        const edgeMode = gnssRO?.edgeAI?.powerMode || 'ACTIVE_INFERENCE';

        if (edgeMode === 'BURST_NEURAL') {
          obcBaseW += 3.1;
        } else if (edgeMode === 'ACTIVE_INFERENCE') {
          obcBaseW += 1.45;
        } else if (edgeMode === 'DEEP_SLEEP') {
          obcBaseW -= 0.6;
        }

        // Active Thermal Derating reduces CPU clock rate by 45% if hot
        if (deratingActive) {
          obcBaseW *= 0.55;
        }
        heatW = obcBaseW;
        break;
      }

      case 'PAYLOAD_GNSS': {
        if (gnssRO?.enabled) {
          const occCount = gnssRO.activeOccultations.length;
          // Dual frequency GNSS-RO front-end LNA + RF synthesizer
          heatW = 1.9 + Math.min(2.5, occCount * 0.7);
        } else {
          heatW = 0.15; // Quiescent standby
        }

        // Payload Patch Heater (+2.0 W)
        if (controls.payloadHeaterEnabled || (controls.payloadHeaterAutoThermostat && controls.payloadHeaterPowerW > 0)) {
          heatW += 2.0;
          heaterActive = true;
        }
        break;
      }

      case 'RF_PA': {
        // Comms Power Amplifier dissipation
        // RF PA efficiency is ~35%, remaining 65% is pure heat
        if (comms.linkStatus === 'DATA_DOWNLINK') {
          heatW = deratingActive ? 1.6 : 3.8;
        } else if (comms.linkStatus === 'LINK_LOCKED') {
          heatW = 1.8;
        } else if (comms.linkStatus === 'ACQUIRING') {
          heatW = 1.2;
        } else {
          heatW = 0.35; // Standby receiver listening
        }
        break;
      }

      case 'ADCS_WHEELS': {
        // Reaction wheel motor winding resistance and bearing viscous friction
        const wheelRpmTotal = (
          Math.abs(adcs.wheelSpeedRpm[0]) +
          Math.abs(adcs.wheelSpeedRpm[1]) +
          Math.abs(adcs.wheelSpeedRpm[2])
        );
        heatW = 0.5 + (wheelRpmTotal / 12000) * 1.5;
        break;
      }

      case 'CHASSIS': {
        // EPS bus converter switching losses & ADCS thruster coupling
        const busLoss = (eps.bus3v3CurrentA * 3.3 + eps.bus5vCurrentA * 5.0) * 0.12;
        let thrusterHeat = 0;
        if (propulsion?.enabled) {
          if (propulsion.status === 'FIRING') {
            thrusterHeat = 4.2; // Catalyst bed conduction into bracket
          } else if (propulsion.status === 'PREHEATING') {
            thrusterHeat = 2.8;
          }
        }
        heatW = 0.4 + busLoss + thrusterHeat;
        break;
      }

      case 'RADIATOR':
        heatW = 0.0;
        break;

      case 'SOLAR_PANELS':
        // Solar cells unharvested solar flux is treated as surface thermal load
        heatW = 0.0;
        break;
    }

    return { heatW: Number(heatW.toFixed(2)), heaterActive };
  }

  /**
   * Main multi-node numerical simulation step
   */
  public static stepThermalSimulation(
    prevState: ThermalState,
    sunVectorECI: Vector3D,
    satQuaternion: Quaternion,
    satPosECI: Vector3D,
    satVelECI: Vector3D,
    orbitElements: { semiMajorAxis: number; periodMinutes: number },
    eclipseState: 'SUNLIGHT' | 'PENUMBRA' | 'UMBRA',
    eclipseFraction: number,
    eps: EPSState,
    adcs: ADCSState,
    comms: CommsState,
    propulsion: PropulsionState,
    gnssRO: GNSSROState,
    dtSimSec: number,
    geometry?: CubeSatGeometry
  ): ThermalState {
    const clampedDt = Math.max(0.01, Math.min(10.0, dtSimSec));
    const nodes = { ...prevState.nodes };
    const controls = { ...prevState.controls };

    // 1. Orbital Night / Day cycle calculation
    const isUmbra = eclipseState === 'UMBRA';
    const isPenumbra = eclipseState === 'PENUMBRA';
    const effectiveIrradiance = SOLAR_CONSTANT_W_M2 * eclipseFraction;

    // Calculate Earth subsolar angle & view factor for Albedo & Earth IR
    const rSatKm = Math.sqrt(satPosECI.x * satPosECI.x + satPosECI.y * satPosECI.y + satPosECI.z * satPosECI.z);
    const altitudeKm = Math.max(150, rSatKm - 6378.137);
    const earthViewFactor = Math.min(0.42, 0.5 * (1 - Math.sqrt(1 - Math.pow(6378.137 / rSatKm, 2))));

    // Nadir direction vector (-r normalized)
    const nadirECI = {
      x: -satPosECI.x / rSatKm,
      y: -satPosECI.y / rSatKm,
      z: -satPosECI.z / rSatKm,
    };

    // Cosine of angle between Sun and Nadir for day/night albedo
    const sunDotNadir = sunVectorECI.x * nadirECI.x + sunVectorECI.y * nadirECI.y + sunVectorECI.z * nadirECI.z;
    const earthDaylightFraction = Math.max(0, sunDotNadir);

    // Surface areas derive from the active satellite envelope. The fallback
    // retains the former 3U baseline for independent callers.
    const body = geometry?.bodyDimensionsM ?? { x: 0.1, y: 0.3405, z: 0.1 };
    const wing = geometry?.solarWing ?? { spanM: 0.18, chordM: 0.30 };
    const areaBodyXFaceM2 = body.y * body.z;
    const areaBodyYFaceM2 = body.x * body.z;
    const areaBodyZFaceM2 = body.x * body.y;
    const areaSolarWingsM2 = eps.solarPanelDeployed ? 2 * wing.spanM * wing.chordM : 0.0;
    const areaRadiatorM2 = Math.max(0.005, areaBodyZFaceM2 * 0.65);

    // 2. Incident Solar Flux on External Faces
    // Transform Sun vector into Satellite Body Frame using quaternion
    const sunBody = QuaternionMath.rotateVector(QuaternionMath.conjugate(satQuaternion), sunVectorECI);

    // Sum of projected illuminated area * solar absorptivity (alpha ~ 0.90 for solar cells, 0.40 for aluminum)
    const absX = Math.abs(sunBody.x) * areaBodyXFaceM2 * 0.90;
    const absY = Math.abs(sunBody.y) * areaBodyYFaceM2 * 0.45;
    const absZ = Math.abs(sunBody.z) * areaBodyZFaceM2 * 0.90;
    const absWings = areaSolarWingsM2 * Math.max(0, sunBody.z) * 0.92;

    const projectedSolarAreaM2 = (absX + absY + absZ + absWings);
    const directSolarAbsorbedW = projectedSolarAreaM2 * effectiveIrradiance;

    // Albedo absorbed on Earth-facing side
    const albedoAbsorbedW = earthDaylightFraction * EARTH_ALBEDO_COEFF * SOLAR_CONSTANT_W_M2 * earthViewFactor * 0.05 * 0.85;

    // Earth Planetary IR emission (constant day and night)
    const earthIRAbsorbedW = EARTH_IR_FLUX_W_M2 * earthViewFactor * 0.06 * 0.85;

    // 3. Automated Closed-Loop Controls (Thermostat & Louver Logic)
    let currentLouverAperture = controls.louverAperturePercent;
    const obcTempCurrent = nodes['OBC_CORE'].temperatureC;
    const batteryTempCurrent = nodes['BATTERY'].temperatureC;

    // Active Thermal Derating check: if OBC > 52°C or RF PA > 60°C, derating engages
    const needsDerating = controls.activeThermalDerating && (obcTempCurrent > 52.0 || nodes['RF_PA'].temperatureC > 58.0);
    const thermalDeratingActive = needsDerating;

    // Closed-loop Louver Thermostat
    if (controls.louverAutoThermostat) {
      if (isUmbra) {
        // In orbital night eclipse, automatically close louvers to 0-10% to prevent rapid cold freeze
        currentLouverAperture = Math.max(0, currentLouverAperture - 20.0 * clampedDt);
      } else {
        // Modulate based on internal core target setpoint
        const tempDelta = obcTempCurrent - controls.louverTargetTempC;
        if (tempDelta > 2.0) {
          currentLouverAperture = Math.min(100.0, currentLouverAperture + 15.0 * clampedDt);
        } else if (tempDelta < -1.5) {
          currentLouverAperture = Math.max(0.0, currentLouverAperture - 12.0 * clampedDt);
        }
      }
    }

    // Battery Auto-Thermostat: if Battery < 2.0°C, heater engages until 10.0°C
    let battHeaterFiring = controls.batteryHeaterEnabled;
    let battHeaterPowerW = controls.batteryHeaterEnabled ? 3.2 : 0.0;

    if (controls.batteryHeaterAutoThermostat && !controls.batteryHeaterEnabled) {
      if (batteryTempCurrent < 2.5) {
        battHeaterFiring = true;
        battHeaterPowerW = 3.2;
      } else if (batteryTempCurrent >= 9.5) {
        battHeaterFiring = false;
        battHeaterPowerW = 0.0;
      } else if (controls.batteryHeaterPowerW > 0) {
        battHeaterFiring = true;
        battHeaterPowerW = 3.2;
      }
    }

    // Payload Auto-Thermostat
    let payloadHeaterFiring = controls.payloadHeaterEnabled;
    let payloadHeaterPowerW = controls.payloadHeaterEnabled ? 2.0 : 0.0;
    if (controls.payloadHeaterAutoThermostat && !controls.payloadHeaterEnabled) {
      if (nodes['PAYLOAD_GNSS'].temperatureC < -8.0) {
        payloadHeaterFiring = true;
        payloadHeaterPowerW = 2.0;
      } else if (nodes['PAYLOAD_GNSS'].temperatureC >= 5.0) {
        payloadHeaterFiring = false;
        payloadHeaterPowerW = 0.0;
      }
    }

    const updatedControls: HeatDissipationControls = {
      ...controls,
      louverAperturePercent: Number(currentLouverAperture.toFixed(1)),
      batteryHeaterPowerW: battHeaterPowerW,
      payloadHeaterPowerW: payloadHeaterPowerW,
    };

    // Radiator effective emissivity modulation via louvers:
    // Closed (0%) = 0.12 (low emissivity, heat retained)
    // Open (100%) = 0.82 (high emissivity, maximum deep space heat dump)
    const effectiveRadiatorEmissivity = 0.12 + (0.70 * (updatedControls.louverAperturePercent / 100.0));

    // Variable Pyrolytic Graphite Strap Conductance to Radiator
    let gStrapWPerK = 1.8;
    if (controls.thermalStrapMode === 'ISOLATED') gStrapWPerK = 0.35;
    if (controls.thermalStrapMode === 'MAX_COOLING') gStrapWPerK = 5.2;

    // 4. Multi-Node Thermal Balance Equations
    // Conductive coupling network G_ij (W/K)
    const G: Record<string, number> = {
      'BATTERY-CHASSIS': 1.4,
      'OBC_CORE-CHASSIS': 0.9,
      'PAYLOAD_GNSS-CHASSIS': 0.85,
      'RF_PA-CHASSIS': 0.75,
      'ADCS_WHEELS-CHASSIS': 1.1,
      'CHASSIS-RADIATOR': 0.45,
      'CHASSIS-SOLAR_PANELS': 0.38,
      // Direct thermal straps from hot processors to Radiator
      'OBC_CORE-RADIATOR': gStrapWPerK,
      'RF_PA-RADIATOR': gStrapWPerK * 0.8,
    };

    const getG = (n1: ThermalNodeId, n2: ThermalNodeId): number => {
      return G[`${n1}-${n2}`] || G[`${n2}-${n1}`] || 0.0;
    };

    // Calculate Heat Dissipations for each node
    const nodeDissipations: Record<ThermalNodeId, { heatW: number; heaterActive: boolean }> = {} as any;
    let totalInternalHeatW = 0;

    (Object.keys(nodes) as ThermalNodeId[]).forEach((id) => {
      const diss = ThermalPhysics.calculateComponentDissipation(
        id,
        eps,
        adcs,
        comms,
        propulsion,
        gnssRO,
        updatedControls,
        thermalDeratingActive
      );
      nodeDissipations[id] = diss;
      totalInternalHeatW += diss.heatW;
    });

    // Partition environmental heat inputs
    const nodeEnvHeat: Record<ThermalNodeId, number> = {
      SOLAR_PANELS: directSolarAbsorbedW * 0.85 + albedoAbsorbedW * 0.7,
      RADIATOR: directSolarAbsorbedW * 0.05 + earthIRAbsorbedW * 0.2,
      CHASSIS: directSolarAbsorbedW * 0.10 + earthIRAbsorbedW * 0.6 + albedoAbsorbedW * 0.3,
      BATTERY: 0,
      OBC_CORE: 0,
      PAYLOAD_GNSS: 0,
      RF_PA: 0,
      ADCS_WHEELS: 0,
    };

    // Calculate Radiative Heat Rejection to Deep Space (3 K)
    // Q_rad = eps * sigma * A * (T^4 - T_space^4)
    const nodeRadiation: Record<ThermalNodeId, number> = {
      SOLAR_PANELS: 0.85 * STEFAN_BOLTZMANN_SIGMA * (areaBodyXFaceM2 + areaBodyYFaceM2 + areaBodyZFaceM2 + areaSolarWingsM2) * Math.pow(nodes['SOLAR_PANELS'].temperatureK, 4),
      RADIATOR: effectiveRadiatorEmissivity * STEFAN_BOLTZMANN_SIGMA * areaRadiatorM2 * Math.pow(nodes['RADIATOR'].temperatureK, 4),
      CHASSIS: 0.05 * STEFAN_BOLTZMANN_SIGMA * 0.015 * Math.pow(nodes['CHASSIS'].temperatureK, 4), // Structural MLI leakage
      BATTERY: 0,
      OBC_CORE: 0,
      PAYLOAD_GNSS: 0,
      RF_PA: 0,
      ADCS_WHEELS: 0,
    };

    let totalHeatRejectedW = 0;
    (Object.keys(nodeRadiation) as ThermalNodeId[]).forEach((id) => {
      totalHeatRejectedW += nodeRadiation[id];
    });

    // Compute Net Heat Flow and Temperature Integration for each node
    const updatedNodes: Record<ThermalNodeId, ThermalNode> = {} as any;
    let anyWarning = false;

    (Object.keys(nodes) as ThermalNodeId[]).forEach((id) => {
      const currentNode = nodes[id];
      const diss = nodeDissipations[id];
      const qEnv = nodeEnvHeat[id] || 0;
      const qRad = nodeRadiation[id] || 0;

      // Conductive exchanges with all other connected nodes
      let qCond = 0;
      (Object.keys(nodes) as ThermalNodeId[]).forEach((otherId) => {
        if (id !== otherId) {
          const conductance = getG(id, otherId);
          if (conductance > 0) {
            // Heat flowing INTO this node from warmer neighbor
            qCond += conductance * (nodes[otherId].temperatureK - currentNode.temperatureK);
          }
        }
      });

      // Net Heat Flow rate (Watts)
      const qNet = diss.heatW + qEnv + qCond - qRad;

      // dT/dt = qNet / C (Kelvin / sec)
      const dTdt = qNet / currentNode.heatCapacityJPerK;
      const newTempC = currentNode.temperatureC + dTdt * clampedDt;
      const newTempK = newTempC + KELVIN_ZERO_C;

      const updatedNode: ThermalNode = {
        ...currentNode,
        temperatureC: Number(newTempC.toFixed(2)),
        temperatureK: Number(newTempK.toFixed(2)),
        internalHeatDissipationW: diss.heatW,
        environmentalHeatInputW: Number(qEnv.toFixed(2)),
        conductiveHeatTransferW: Number(qCond.toFixed(2)),
        radiativeRejectionW: Number(qRad.toFixed(2)),
        netHeatFlowW: Number(qNet.toFixed(2)),
        rateOfTempChangeCPerMin: Number((dTdt * 60).toFixed(3)),
        heaterActive: diss.heaterActive,
        activeCoolingCoupling: id === 'OBC_CORE' || id === 'RF_PA' ? gStrapWPerK : 0,
        status: 'NOMINAL',
      };

      updatedNode.status = ThermalPhysics.evaluateNodeStatus(updatedNode);
      if (updatedNode.status !== 'NOMINAL') {
        anyWarning = true;
      }

      updatedNodes[id] = updatedNode;
    });

    // Mean Internal Temperature (Battery, OBC, Chassis, Payload)
    const internalMeanTemp = (
      updatedNodes['BATTERY'].temperatureC +
      updatedNodes['OBC_CORE'].temperatureC +
      updatedNodes['CHASSIS'].temperatureC +
      updatedNodes['PAYLOAD_GNSS'].temperatureC
    ) / 4.0;

    const totalHeatInputW = directSolarAbsorbedW + albedoAbsorbedW + earthIRAbsorbedW + totalInternalHeatW;
    const netImbalanceW = totalHeatInputW - totalHeatRejectedW;

    // Mean spacecraft heat capacity ~ 4900 J/K
    const spacecraftRateCPerMin = (netImbalanceW / 4900) * 60;

    // 5. Orbital cycle timing
    const orbitalPeriodSec = (orbitElements.periodMinutes || 94.5) * 60;
    // Eclipse fraction of orbit typically ~35%
    const eclipseDurationSec = orbitalPeriodSec * 0.36;
    const sunlightDurationSec = orbitalPeriodSec - eclipseDurationSec;

    const prevEnv = prevState.environment;
    const timeInRegime = prevEnv.eclipseState === eclipseState
      ? prevEnv.timeInCurrentRegimeSec + clampedDt
      : clampedDt;

    const updatedEnvironment: ThermalEnvironment = {
      solarIrradianceWPerM2: Number(effectiveIrradiance.toFixed(1)),
      solarFluxDirectW: Number(directSolarAbsorbedW.toFixed(2)),
      earthAlbedoFluxW: Number(albedoAbsorbedW.toFixed(2)),
      earthIRFluxW: Number(earthIRAbsorbedW.toFixed(2)),
      totalHeatInputW: Number(totalHeatInputW.toFixed(2)),
      totalHeatRejectedW: Number(totalHeatRejectedW.toFixed(2)),
      netThermalImbalanceW: Number(netImbalanceW.toFixed(2)),
      rateOfSpacecraftTempChangeCPerMin: Number(spacecraftRateCPerMin.toFixed(3)),
      eclipseState,
      eclipseFraction: Number(eclipseFraction.toFixed(3)),
      timeInCurrentRegimeSec: Math.round(timeInRegime),
      predictedTimeInEclipseSec: Math.round(eclipseDurationSec),
      predictedTimeInSunlightSec: Math.round(sunlightDurationSec),
    };

    return {
      internalMeanTempC: Number(internalMeanTemp.toFixed(1)),
      chassisTempC: updatedNodes['CHASSIS'].temperatureC,
      batteryTempC: updatedNodes['BATTERY'].temperatureC,
      obcTempC: updatedNodes['OBC_CORE'].temperatureC,
      payloadTempC: updatedNodes['PAYLOAD_GNSS'].temperatureC,
      rfPaTempC: updatedNodes['RF_PA'].temperatureC,
      adcsTempC: updatedNodes['ADCS_WHEELS'].temperatureC,
      radiatorTempC: updatedNodes['RADIATOR'].temperatureC,
      solarPanelTempC: updatedNodes['SOLAR_PANELS'].temperatureC,
      nodes: updatedNodes,
      controls: updatedControls,
      environment: updatedEnvironment,
      hasThermalWarning: anyWarning,
      thermalDeratingActive,
      autoProtectionEngaged: updatedControls.louverAutoThermostat || battHeaterFiring,
    };
  }
}
