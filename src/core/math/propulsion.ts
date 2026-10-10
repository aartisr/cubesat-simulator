import {
  Vector3D,
  KeplerianElements,
  OrbitalState,
  PropulsionState,
  ThrusterManeuverConfig,
  ManeuverDirection,
  ManeuverRecord,
} from '../../types/telemetry';
import { MU_EARTH, WGS84_A } from './sgp4';
import { EARTH_RADIUS_KM } from './solar';

export const G0_ACCEL = 9.80665; // m/s^2 standard gravity
export const CUBESAT_DRY_MASS_KG = 4.0; // Standard 3U/6U bus mass

export class PropulsionPhysics {
  /**
   * Generates default initial state for CubeSat micro-propulsion system
   */
  public static getDefaultPropulsionState(): PropulsionState {
    const defaultConfig: ThrusterManeuverConfig = {
      direction: 'PROGRADE',
      targetDeltaVMs: 0.50,
      thrustMilliNewtons: 50,
      specificImpulseSec: 110,
      valveHeatingEnabled: true,
      attitudeLockRequired: true,
    };

    const initialHistory: ManeuverRecord[] = [
      {
        id: 'burn-init-01',
        timestamp: Date.now() - 3600000 * 4,
        direction: 'PROGRADE',
        deltaVMs: 0.35,
        durationSec: 28.2,
        propellantConsumedG: 1.31,
        energyConsumedWh: 0.089,
        initialSemiMajorAxisKm: 6878.1,
        finalSemiMajorAxisKm: 6878.7,
        initialApogeeKm: 505.2,
        finalApogeeKm: 506.4,
        initialPerigeeKm: 494.8,
        finalPerigeeKm: 495.0,
        peakLoadW: 11.4,
      },
    ];

    return {
      enabled: true,
      status: 'STANDBY',
      propellantMassGrams: 243.5,
      propellantCapacityGrams: 250.0,
      tankPressureBar: 3.2,
      chamberTempC: 21.0,
      currentThrustMilliN: 0,
      currentPowerDrawW: 0,
      currentMassFlowRateGramsPerSec: 0,
      cumulativeDeltaVMs: 0.35,
      totalPropellantConsumedGrams: 6.5,
      config: defaultConfig,
      activeBurn: null,
      history: initialHistory,
    };
  }

  /**
   * Computes the unit direction vector in Earth-Centered Inertial (ECI) coordinates
   * based on the maneuver orientation mode.
   */
  public static getDirectionVectorECI(
    posECI: Vector3D,
    velECI: Vector3D,
    direction: ManeuverDirection
  ): Vector3D {
    const vMag = Math.sqrt(velECI.x ** 2 + velECI.y ** 2 + velECI.z ** 2) || 1;
    const rMag = Math.sqrt(posECI.x ** 2 + posECI.y ** 2 + posECI.z ** 2) || 1;

    // Tangential unit velocity vector (Prograde)
    const prograde: Vector3D = {
      x: velECI.x / vMag,
      y: velECI.y / vMag,
      z: velECI.z / vMag,
    };

    // Radial unit position vector
    const radial: Vector3D = {
      x: posECI.x / rMag,
      y: posECI.y / rMag,
      z: posECI.z / rMag,
    };

    // Angular momentum vector h = r x v
    const hx = posECI.y * velECI.z - posECI.z * velECI.y;
    const hy = posECI.z * velECI.x - posECI.x * velECI.z;
    const hz = posECI.x * velECI.y - posECI.y * velECI.x;
    const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;

    const normal: Vector3D = {
      x: hx / hMag,
      y: hy / hMag,
      z: hz / hMag,
    };

    switch (direction) {
      case 'PROGRADE':
        return prograde;
      case 'RETROGRADE':
        return { x: -prograde.x, y: -prograde.y, z: -prograde.z };
      case 'NORMAL':
        return normal;
      case 'ANTI_NORMAL':
        return { x: -normal.x, y: -normal.y, z: -normal.z };
      case 'RADIAL_OUT':
        return radial;
      case 'RADIAL_IN':
        return { x: -radial.x, y: -radial.y, z: -radial.z };
      default:
        return prograde;
    }
  }

  /**
   * Computes electrical power draw (Watts) for the propulsion subsystem
   * based on operational status and preheating state.
   */
  public static calculateSubsystemPower(
    status: PropulsionState['status'],
    valveHeatingEnabled: boolean,
    thrustMilliN: number
  ): {
    thrusterPowerW: number;
    heatersPowerW: number;
    valvesPowerW: number;
    adcsCouplingLoadW: number;
    totalPropulsionLoadW: number;
  } {
    let heatersPowerW = 0;
    let valvesPowerW = 0;
    let adcsCouplingLoadW = 0; // Extra reaction wheel counter-torque against thruster misalignment

    if (status === 'ARMED') {
      valvesPowerW = 0.5; // Telemetry & safety interlock bias
    } else if (status === 'PREHEATING') {
      heatersPowerW = valveHeatingEnabled ? 6.5 : 2.0;
      valvesPowerW = 0.8;
      adcsCouplingLoadW = 0.4;
    } else if (status === 'FIRING') {
      heatersPowerW = valveHeatingEnabled ? 6.5 : 1.5;
      valvesPowerW = 3.5 * (thrustMilliN / 50); // Proportional solenoid PWM driver
      adcsCouplingLoadW = 1.4; // Reaction wheel high-torque slew hold
    } else if (status === 'COOLDOWN') {
      heatersPowerW = 0.8; // Thermal sensor polling & chamber purge
      valvesPowerW = 0.2;
    }

    const thrusterPowerW = heatersPowerW + valvesPowerW;
    const totalPropulsionLoadW = thrusterPowerW + adcsCouplingLoadW;

    return {
      thrusterPowerW,
      heatersPowerW,
      valvesPowerW,
      adcsCouplingLoadW,
      totalPropulsionLoadW,
    };
  }

  /**
   * Estimates propellant requirement, burn duration, and battery energy cost
   * for a proposed delta-v maneuver using the Tsiolkovsky Rocket Equation.
   */
  public static estimateManeuverCost(
    deltaVMs: number,
    thrustMilliN: number,
    ispSec: number,
    currentPropellantGrams: number,
    satelliteDryMassKg = CUBESAT_DRY_MASS_KG,
    valveHeatingEnabled = true
  ): {
    propellantRequiredGrams: number;
    burnDurationSec: number;
    massFlowRateGramsPerSec: number;
    estimatedEnergyWh: number;
    estimatedBatteryDrainSocPercent: number;
    feasiblePropellant: boolean;
    feasibleEnergy: boolean;
  } {
    const totalMassKg = satelliteDryMassKg + currentPropellantGrams / 1000;
    const cEffective = ispSec * G0_ACCEL; // Effective exhaust velocity (m/s)

    // Tsiolkovsky: delta_m = m0 * (1 - exp(-deltaV / c))
    const massFraction = 1 - Math.exp(-deltaVMs / cEffective);
    const propellantRequiredKg = totalMassKg * massFraction;
    const propellantRequiredGrams = Number((propellantRequiredKg * 1000).toFixed(2));

    // Mass flow rate: m_dot = F / (Isp * g0)
    const thrustN = thrustMilliN / 1000;
    const massFlowRateKgPerSec = thrustN / cEffective;
    const massFlowRateGramsPerSec = massFlowRateKgPerSec * 1000;

    // Burn duration: t = delta_m / m_dot
    const burnDurationSec = Number((propellantRequiredGrams / massFlowRateGramsPerSec).toFixed(1));

    // Power during firing: ~11.4 W, preheat 6.8 W (e.g. 5 sec preheat)
    const preheatSec = valveHeatingEnabled ? 5 : 1;
    const powerFiringW = valveHeatingEnabled ? 11.4 : 6.0;
    const energyFiringWh = (powerFiringW * burnDurationSec) / 3600;
    const energyPreheatWh = (6.8 * preheatSec) / 3600;
    const estimatedEnergyWh = Number((energyFiringWh + energyPreheatWh).toFixed(3));

    // Approximate battery drain for a nominal 40 Wh pack
    const estimatedBatteryDrainSocPercent = Number(((estimatedEnergyWh / 40.0) * 100).toFixed(2));

    const feasiblePropellant = propellantRequiredGrams <= currentPropellantGrams;
    const feasibleEnergy = estimatedBatteryDrainSocPercent < 25; // Don't allow maneuvers draining >25% in one single burst

    return {
      propellantRequiredGrams,
      burnDurationSec,
      massFlowRateGramsPerSec: Number(massFlowRateGramsPerSec.toFixed(4)),
      estimatedEnergyWh,
      estimatedBatteryDrainSocPercent,
      feasiblePropellant,
      feasibleEnergy,
    };
  }

  /**
   * Rigorous conversion of state vectors (positionECI km, velocityECI km/s)
   * into Keplerian orbital elements.
   */
  public static stateVectorToKeplerian(
    posECI: Vector3D,
    velECI: Vector3D
  ): KeplerianElements {
    const r = Math.sqrt(posECI.x ** 2 + posECI.y ** 2 + posECI.z ** 2);
    const v = Math.sqrt(velECI.x ** 2 + velECI.y ** 2 + velECI.z ** 2);

    // Specific mechanical energy E = v^2/2 - mu/r
    const energy = (v * v) / 2 - MU_EARTH / r;

    // Semi-major axis a = -mu / (2*E)
    let a = -MU_EARTH / (2 * energy);
    if (!isFinite(a) || a < 1000) a = 6878.14; // fallback safeguard

    // Angular momentum h = r x v
    const hx = posECI.y * velECI.z - posECI.z * velECI.y;
    const hy = posECI.z * velECI.x - posECI.x * velECI.z;
    const hz = posECI.x * velECI.y - posECI.y * velECI.x;
    const h = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;

    // Eccentricity vector e = (v x h)/mu - r/|r|
    const vCrossHx = velECI.y * hz - velECI.z * hy;
    const vCrossHy = velECI.z * hx - velECI.x * hz;
    const vCrossHz = velECI.x * hy - velECI.y * hx;

    const ex = vCrossHx / MU_EARTH - posECI.x / r;
    const ey = vCrossHy / MU_EARTH - posECI.y / r;
    const ez = vCrossHz / MU_EARTH - posECI.z / r;
    let e = Math.sqrt(ex * ex + ey * ey + ez * ez);
    if (!isFinite(e) || e < 0) e = 0.001;

    // Inclination i = arccos(hz / h)
    const incRad = Math.acos(Math.max(-1, Math.min(1, hz / h)));
    const inclination = (incRad * 180) / Math.PI;

    // Node vector n = k x h = (-hy, hx, 0)
    const nx = -hy;
    const ny = hx;
    const n = Math.sqrt(nx * nx + ny * ny);

    // Right Ascension of the Ascending Node (RAAN, Omega)
    let raanRad = 0;
    if (n > 1e-7) {
      raanRad = Math.acos(Math.max(-1, Math.min(1, nx / n)));
      if (ny < 0) raanRad = 2 * Math.PI - raanRad;
    }
    const raan = (raanRad * 180) / Math.PI;

    // Argument of perigee (omega)
    let argPerigeeRad = 0;
    if (n > 1e-7 && e > 1e-7) {
      const nDotE = nx * ex + ny * ey;
      argPerigeeRad = Math.acos(Math.max(-1, Math.min(1, nDotE / (n * e))));
      if (ez < 0) argPerigeeRad = 2 * Math.PI - argPerigeeRad;
    }
    const argOfPerigee = (argPerigeeRad * 180) / Math.PI;

    // True anomaly (nu)
    let nuRad = 0;
    if (e > 1e-7) {
      const rDotE = posECI.x * ex + posECI.y * ey + posECI.z * ez;
      nuRad = Math.acos(Math.max(-1, Math.min(1, rDotE / (r * e))));
      const rDotV = posECI.x * velECI.x + posECI.y * velECI.y + posECI.z * velECI.z;
      if (rDotV < 0) nuRad = 2 * Math.PI - nuRad;
    }
    const trueAnomaly = (nuRad * 180) / Math.PI;

    // Eccentric anomaly E
    const sinNu = Math.sin(nuRad);
    const cosNu = Math.cos(nuRad);
    const Eanom = Math.atan2(Math.sqrt(1 - e * e) * sinNu, e + cosNu);

    // Mean anomaly M = E - e*sin(E)
    let meanAnomalyRad = Eanom - e * Math.sin(Eanom);
    if (meanAnomalyRad < 0) meanAnomalyRad += 2 * Math.PI;
    const meanAnomaly = (meanAnomalyRad * 180) / Math.PI;

    // Period T = 2*pi * sqrt(a^3 / mu)
    const periodSec = 2 * Math.PI * Math.sqrt(Math.max(1, a * a * a) / MU_EARTH);
    const periodMinutes = periodSec / 60;

    const apogeeAltitude = a * (1 + e) - EARTH_RADIUS_KM;
    const perigeeAltitude = a * (1 - e) - EARTH_RADIUS_KM;

    return {
      semiMajorAxis: Number(a.toFixed(3)),
      eccentricity: Number(e.toFixed(6)),
      inclination: Number(inclination.toFixed(4)),
      raan: Number(raan.toFixed(4)),
      argOfPerigee: Number(argOfPerigee.toFixed(4)),
      trueAnomaly: Number(trueAnomaly.toFixed(4)),
      meanAnomaly: Number(meanAnomaly.toFixed(4)),
      periodMinutes: Number(periodMinutes.toFixed(2)),
      apogeeAltitude: Number(apogeeAltitude.toFixed(2)),
      perigeeAltitude: Number(perigeeAltitude.toFixed(2)),
    };
  }

  /**
   * Applies an instantaneous or discrete thruster delta-v step to the satellite's
   * velocity vector and updates orbital elements.
   */
  public static applyDeltaV(
    orbit: OrbitalState,
    deltaVMs: number,
    direction: ManeuverDirection
  ): {
    updatedOrbit: OrbitalState;
    deltaVVectorKmS: Vector3D;
  } {
    const dirUnit = this.getDirectionVectorECI(
      orbit.positionECI,
      orbit.velocityECI,
      direction
    );

    // deltaVMs is in m/s -> convert to km/s
    const deltaVKmS = deltaVMs / 1000;
    const deltaVVectorKmS: Vector3D = {
      x: dirUnit.x * deltaVKmS,
      y: dirUnit.y * deltaVKmS,
      z: dirUnit.z * deltaVKmS,
    };

    const newVelECI: Vector3D = {
      x: orbit.velocityECI.x + deltaVVectorKmS.x,
      y: orbit.velocityECI.y + deltaVVectorKmS.y,
      z: orbit.velocityECI.z + deltaVVectorKmS.z,
    };

    const newElements = this.stateVectorToKeplerian(orbit.positionECI, newVelECI);

    const updatedOrbit: OrbitalState = {
      ...orbit,
      velocityECI: newVelECI,
      elements: newElements,
    };

    return {
      updatedOrbit,
      deltaVVectorKmS,
    };
  }
}
