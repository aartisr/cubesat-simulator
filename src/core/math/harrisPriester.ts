import { Vector3D, KeplerianElements } from '../../types/telemetry';
import { MU_EARTH, EARTH_ROTATION_RATE_RAD_S } from './sgp4';
import { EARTH_RADIUS_KM } from './solar';

export interface HarrisPriesterTableEntry {
  altitudeKm: number;
  rhoMin: number; // kg / m^3
  rhoMax: number; // kg / m^3
}

/**
 * Standard Harris-Priester Atmospheric Density Table (100 km to 1000 km)
 * Tabulated for mean solar radio flux F10.7 ~ 145-150 sfu.
 * Values reflect the diurnal minimum (night) and maximum (bulge peak) upper atmosphere densities.
 */
export const HARRIS_PRIESTER_TABLE: HarrisPriesterTableEntry[] = [
  { altitudeKm: 100, rhoMin: 4.974e-7,  rhoMax: 4.974e-7 },
  { altitudeKm: 120, rhoMin: 2.490e-8,  rhoMax: 2.490e-8 },
  { altitudeKm: 130, rhoMin: 8.377e-9,  rhoMax: 8.710e-9 },
  { altitudeKm: 140, rhoMin: 3.899e-9,  rhoMax: 4.059e-9 },
  { altitudeKm: 150, rhoMin: 2.122e-9,  rhoMax: 2.215e-9 },
  { altitudeKm: 160, rhoMin: 1.263e-9,  rhoMax: 1.344e-9 },
  { altitudeKm: 170, rhoMin: 8.008e-10, rhoMax: 8.758e-10 },
  { altitudeKm: 180, rhoMin: 5.283e-10, rhoMax: 6.010e-10 },
  { altitudeKm: 190, rhoMin: 3.617e-10, rhoMax: 4.297e-10 },
  { altitudeKm: 200, rhoMin: 2.557e-10, rhoMax: 3.162e-10 },
  { altitudeKm: 210, rhoMin: 1.855e-10, rhoMax: 2.396e-10 },
  { altitudeKm: 220, rhoMin: 1.373e-10, rhoMax: 1.853e-10 },
  { altitudeKm: 230, rhoMin: 1.034e-10, rhoMax: 1.455e-10 },
  { altitudeKm: 240, rhoMin: 7.915e-11, rhoMax: 1.157e-10 },
  { altitudeKm: 250, rhoMin: 6.143e-11, rhoMax: 9.308e-11 },
  { altitudeKm: 260, rhoMin: 4.831e-11, rhoMax: 7.555e-11 },
  { altitudeKm: 270, rhoMin: 3.844e-11, rhoMax: 6.182e-11 },
  { altitudeKm: 280, rhoMin: 3.090e-11, rhoMax: 5.095e-11 },
  { altitudeKm: 290, rhoMin: 2.505e-11, rhoMax: 4.226e-11 },
  { altitudeKm: 300, rhoMin: 2.046e-11, rhoMax: 3.526e-11 },
  { altitudeKm: 320, rhoMin: 1.391e-11, rhoMax: 2.511e-11 },
  { altitudeKm: 340, rhoMin: 9.684e-12, rhoMax: 1.819e-11 },
  { altitudeKm: 360, rhoMin: 6.890e-12, rhoMax: 1.337e-11 },
  { altitudeKm: 380, rhoMin: 4.992e-12, rhoMax: 9.955e-12 },
  { altitudeKm: 400, rhoMin: 3.674e-12, rhoMax: 7.492e-12 },
  { altitudeKm: 420, rhoMin: 2.738e-12, rhoMax: 5.689e-12 },
  { altitudeKm: 440, rhoMin: 2.062e-12, rhoMax: 4.355e-12 },
  { altitudeKm: 460, rhoMin: 1.567e-12, rhoMax: 3.357e-12 },
  { altitudeKm: 480, rhoMin: 1.201e-12, rhoMax: 2.603e-12 },
  { altitudeKm: 500, rhoMin: 9.273e-13, rhoMax: 2.030e-12 },
  { altitudeKm: 520, rhoMin: 7.214e-13, rhoMax: 1.591e-12 },
  { altitudeKm: 540, rhoMin: 5.649e-13, rhoMax: 1.254e-12 },
  { altitudeKm: 560, rhoMin: 4.450e-13, rhoMax: 9.932e-13 },
  { altitudeKm: 580, rhoMin: 3.525e-13, rhoMax: 7.899e-13 },
  { altitudeKm: 600, rhoMin: 2.806e-13, rhoMax: 6.309e-13 },
  { altitudeKm: 650, rhoMin: 1.579e-13, rhoMax: 3.738e-13 },
  { altitudeKm: 700, rhoMin: 9.071e-14, rhoMax: 2.274e-13 },
  { altitudeKm: 750, rhoMin: 5.311e-14, rhoMax: 1.414e-13 },
  { altitudeKm: 800, rhoMin: 3.167e-14, rhoMax: 8.932e-14 },
  { altitudeKm: 850, rhoMin: 1.921e-14, rhoMax: 5.731e-14 },
  { altitudeKm: 900, rhoMin: 1.182e-14, rhoMax: 3.731e-14 },
  { altitudeKm: 950, rhoMin: 7.378e-15, rhoMax: 2.463e-14 },
  { altitudeKm: 1000, rhoMin: 4.679e-15, rhoMax: 1.644e-14 },
];

export interface HarrisPriesterDensityResult {
  densityKgM3: number;
  rhoMinKgM3: number;
  rhoMaxKgM3: number;
  bulgeAngleDeg: number;       // Angle psi between satellite and bulge apex
  diurnalFactor: number;       // cos^n(psi / 2)
  scaleHeightKm: number;       // Local atmospheric scale height H
  bulgeApexVectorECI: Vector3D;
  subsolarAngleDeg: number;
  diurnalRatio: number;        // rho / rhoMin
}

export interface AerodynamicDragResult {
  density: HarrisPriesterDensityResult;
  relVelocityKmS: number;      // Magnitude of satellite velocity relative to co-rotating atmosphere
  relVelocityVectorECI: Vector3D;
  dragDecelVectorECI: Vector3D; // m / s^2
  dragDecelMagnitudeMs2: number;
  dragDecelMicroG: number;     // micro-g (10^-6 g0)
  dragForceMicroN: number;     // micro-Newtons
  dynamicPressurePa: number;   // Pascals (0.5 * rho * v_rel^2)
  ballisticCoefficientKgM2: number; // B = m / (Cd * A)
}

export interface OrbitalDecayRatesResult {
  semiMajorAxisDecayMetersPerSec: number;
  semiMajorAxisDecayMetersPerDay: number;
  semiMajorAxisDecayKmPerYear: number;
  apogeeDecayMetersPerDay: number;
  perigeeDecayMetersPerDay: number;
  periodDecayMsPerDay: number; // ms / day
  reentryLifetimeDays: number;
  reentryStatus: 'STABLE' | 'MODERATE_DECAY' | 'RAPID_DECAY' | 'CRITICAL_REENTRY';
}

export interface DecayProjectionTrajectoryPoint {
  timeDays: number;
  dateStr: string;
  altitudeKm: number;
  apogeeKm: number;
  perigeeKm: number;
  semiMajorAxisKm: number;
  densityKgM3: number;
  dragDecelMicroG: number;
  decayRateMetersDay: number;
}

export interface ScenarioDecayCurve {
  id: string;
  name: string;
  color: string;
  f107Flux: number;
  areaM2: number;
  lifetimeDays: number;
  points: { day: number; altitudeKm: number }[];
}

export class HarrisPriesterPhysics {
  /**
   * Computes the Apex unit vector of the diurnal atmospheric bulge.
   * In the Harris-Priester model, the bulge peak lags the Sun by approximately
   * 30 degrees (~2 hours of right ascension) eastward due to thermospheric thermal inertia.
   */
  public static calculateBulgeVector(sunVectorECI: Vector3D, lagAngleDeg = 30): Vector3D {
    const norm = Math.sqrt(sunVectorECI.x ** 2 + sunVectorECI.y ** 2 + sunVectorECI.z ** 2) || 1;
    const sx = sunVectorECI.x / norm;
    const sy = sunVectorECI.y / norm;
    const sz = sunVectorECI.z / norm;

    // Right ascension and declination of the Sun
    const raSun = Math.atan2(sy, sx);
    const decSun = Math.asin(Math.max(-1, Math.min(1, sz)));

    // Apply diurnal bulge lag angle eastward in right ascension
    const lagRad = (lagAngleDeg * Math.PI) / 180;
    const raBulge = raSun + lagRad;

    return {
      x: Math.cos(decSun) * Math.cos(raBulge),
      y: Math.cos(decSun) * Math.sin(raBulge),
      z: Math.sin(decSun),
    };
  }

  /**
   * Evaluates atmospheric density rho(h, psi) using the Harris-Priester model
   * scaled for real-time solar radio flux F10.7 (sfu).
   *
   * @param altitudeKm Satellite altitude above mean Earth surface (km)
   * @param positionECI Satellite position vector in ECI frame (km)
   * @param sunVectorECI Normalized Sun vector in ECI frame
   * @param f107Flux Solar 10.7 cm radio flux (sfu), nominal reference 145 sfu
   * @param hpExponentN Bulge cosine power exponent n (2 to 6, default 4 or 6)
   * @param lagAngleDeg Diurnal bulge eastward lag angle (default 30 deg)
   */
  public static calculateDensity(
    altitudeKm: number,
    positionECI: Vector3D,
    sunVectorECI: Vector3D,
    f107Flux = 145,
    hpExponentN = 4,
    lagAngleDeg = 30
  ): HarrisPriesterDensityResult {
    // 1. Clamp altitude within model domain (100 km to 1000 km)
    const h = Math.max(100, Math.min(1000, altitudeKm));

    // 2. Find table bracket [h_i, h_{i+1}]
    let idx = 0;
    for (let i = 0; i < HARRIS_PRIESTER_TABLE.length - 1; i++) {
      if (h >= HARRIS_PRIESTER_TABLE[i].altitudeKm && h <= HARRIS_PRIESTER_TABLE[i + 1].altitudeKm) {
        idx = i;
        break;
      }
    }

    const tLower = HARRIS_PRIESTER_TABLE[idx];
    const tUpper = HARRIS_PRIESTER_TABLE[idx + 1];

    // Scale heights between table altitude levels
    const dh = tUpper.altitudeKm - tLower.altitudeKm;
    const hMin = dh / Math.log(tLower.rhoMin / tUpper.rhoMin);
    const hMax = dh / Math.log(tLower.rhoMax / tUpper.rhoMax);

    // Exponential interpolation to satellite altitude h
    let rhoMinH = tLower.rhoMin * Math.exp(-(h - tLower.altitudeKm) / hMin);
    let rhoMaxH = tLower.rhoMax * Math.exp(-(h - tLower.altitudeKm) / hMax);

    // 3. Solar flux F10.7 scaling
    // Upper thermospheric density scales with solar UV / EUV flux (F10.7 index).
    // The solar heating sensitivity increases with altitude as the atmosphere expands outward.
    const refFlux = 145.0;
    const fluxRatio = Math.max(0.4, Math.min(3.5, f107Flux / refFlux));
    const altitudeSensitivity = 1.0 + Math.max(0, (h - 200) / 400) * 1.4;
    const solarFactor = Math.pow(fluxRatio, altitudeSensitivity);

    rhoMinH *= solarFactor;
    rhoMaxH *= solarFactor;

    // 4. Calculate diurnal bulge apex vector and angular separation psi
    const bulgeApex = this.calculateBulgeVector(sunVectorECI, lagAngleDeg);

    const rSatMag = Math.sqrt(positionECI.x ** 2 + positionECI.y ** 2 + positionECI.z ** 2) || 1;
    const uSat = {
      x: positionECI.x / rSatMag,
      y: positionECI.y / rSatMag,
      z: positionECI.z / rSatMag,
    };

    // Cosine of angle psi between satellite and bulge apex
    const cosPsi = Math.max(-1, Math.min(1, uSat.x * bulgeApex.x + uSat.y * bulgeApex.y + uSat.z * bulgeApex.z));
    const psiRad = Math.acos(cosPsi);
    const bulgeAngleDeg = (psiRad * 180) / Math.PI;

    // Subsolar angle for reference
    const cosSubsolar = Math.max(
      -1,
      Math.min(1, uSat.x * sunVectorECI.x + uSat.y * sunVectorECI.y + uSat.z * sunVectorECI.z)
    );
    const subsolarAngleDeg = (Math.acos(cosSubsolar) * 180) / Math.PI;

    // 5. Harris-Priester interpolation formula:
    // cos^2(psi/2) = (1 + cos(psi)) / 2
    // factor = [cos^2(psi/2)]^(n / 2) = [(1 + cos(psi)) / 2]^(n / 2)
    const cosHalfPsiSq = Math.max(0, (1 + cosPsi) / 2);
    const diurnalFactor = Math.pow(cosHalfPsiSq, hpExponentN / 2);

    const densityKgM3 = rhoMinH + (rhoMaxH - rhoMinH) * diurnalFactor;
    const diurnalRatio = densityKgM3 / Math.max(1e-20, rhoMinH);
    const meanScaleHeight = (hMin + hMax) / 2;

    return {
      densityKgM3,
      rhoMinKgM3: rhoMinH,
      rhoMaxKgM3: rhoMaxH,
      bulgeAngleDeg,
      diurnalFactor,
      scaleHeightKm: meanScaleHeight,
      bulgeApexVectorECI: bulgeApex,
      subsolarAngleDeg,
      diurnalRatio,
    };
  }

  /**
   * Computes aerodynamic drag vector and deceleration accounting for
   * satellite velocity relative to Earth's co-rotating upper atmosphere.
   *
   * @param positionECI Position vector in km
   * @param velocityECI Velocity vector in km/s
   * @param densityResult Harris-Priester density result
   * @param dragCoefficient Cd (typically 2.0 - 2.5 for CubeSats, default 2.2)
   * @param crossSectionAreaM2 Cross-sectional area in flight direction (m^2)
   * @param massKg Satellite mass in kg
   */
  public static calculateAerodynamicDrag(
    positionECI: Vector3D,
    velocityECI: Vector3D,
    densityResult: HarrisPriesterDensityResult,
    dragCoefficient = 2.2,
    crossSectionAreaM2 = 0.03,
    massKg = 4.85
  ): AerodynamicDragResult {
    // Earth atmospheric co-rotation velocity: v_atm = omega_earth x r
    // omega_earth = [0, 0, 7.292115e-5] rad/s
    const vAtmECI: Vector3D = {
      x: -EARTH_ROTATION_RATE_RAD_S * positionECI.y,
      y: EARTH_ROTATION_RATE_RAD_S * positionECI.x,
      z: 0,
    };

    // Velocity relative to atmosphere in km/s
    const vRelECI: Vector3D = {
      x: velocityECI.x - vAtmECI.x,
      y: velocityECI.y - vAtmECI.y,
      z: velocityECI.z - vAtmECI.z,
    };

    const vRelMagKmS = Math.sqrt(vRelECI.x ** 2 + vRelECI.y ** 2 + vRelECI.z ** 2) || 0.001;
    const vRelMagMs = vRelMagKmS * 1000;

    // Unit relative velocity vector
    const uVrel: Vector3D = {
      x: vRelECI.x / vRelMagKmS,
      y: vRelECI.y / vRelMagKmS,
      z: vRelECI.z / vRelMagKmS,
    };

    // Ballistic Coefficient B = m / (Cd * A) [kg / m^2]
    const effectiveCd = Math.max(0.5, dragCoefficient);
    const effectiveArea = Math.max(0.001, crossSectionAreaM2);
    const effectiveMass = Math.max(0.1, massKg);
    const ballisticCoeff = effectiveMass / (effectiveCd * effectiveArea);

    // Dynamic Pressure q = 0.5 * rho * v_rel^2 [Pa]
    const dynamicPressurePa = 0.5 * densityResult.densityKgM3 * (vRelMagMs ** 2);

    // Drag deceleration magnitude: a_drag = (1 / B) * q = 0.5 * Cd * (A / m) * rho * v_rel^2 [m / s^2]
    const dragDecelMagnitudeMs2 = dynamicPressurePa / ballisticCoeff;
    const dragDecelMicroG = (dragDecelMagnitudeMs2 / 9.80665) * 1e6;

    // Drag force F = m * a_drag [N] -> convert to micro-Newtons
    const dragForceMicroN = effectiveMass * dragDecelMagnitudeMs2 * 1e6;

    // Deceleration vector opposing relative motion [m / s^2]
    const dragDecelVectorECI: Vector3D = {
      x: -dragDecelMagnitudeMs2 * uVrel.x,
      y: -dragDecelMagnitudeMs2 * uVrel.y,
      z: -dragDecelMagnitudeMs2 * uVrel.z,
    };

    return {
      density: densityResult,
      relVelocityKmS: vRelMagKmS,
      relVelocityVectorECI: vRelECI,
      dragDecelVectorECI,
      dragDecelMagnitudeMs2,
      dragDecelMicroG,
      dragForceMicroN,
      dynamicPressurePa,
      ballisticCoefficientKgM2: ballisticCoeff,
    };
  }

  /**
   * Calculates secular orbital decay rates based on Gauss planetary perturbation equations
   * under atmospheric drag in near-circular or low-eccentricity LEO.
   *
   * da/dt = - Cd * (A / m) * rho * v_rel * a  [m / s]
   */
  public static calculateDecayRates(
    elements: KeplerianElements,
    drag: AerodynamicDragResult,
    dragCoefficient = 2.2,
    crossSectionAreaM2 = 0.03,
    massKg = 4.85
  ): OrbitalDecayRatesResult {
    const aMeters = elements.semiMajorAxis * 1000;
    const e = elements.eccentricity;
    const vRelMs = drag.relVelocityKmS * 1000;
    const rho = drag.density.densityKgM3;
    const areaOverMass = crossSectionAreaM2 / massKg;

    // Secular semi-major axis decay rate [m / s]
    // Negative because drag removes orbital energy
    const daDtMs = -dragCoefficient * areaOverMass * rho * vRelMs * aMeters;

    const daDtMetersDay = daDtMs * 86400;
    const daDtKmYear = (daDtMetersDay * 365.25) / 1000;

    // Apogee and perigee decay rates [m / day]
    // Drag reduces apogee faster than perigee in elliptical orbits
    const dApogeeMetersDay = daDtMetersDay * (1 + 2 * e);
    const dPerigeeMetersDay = daDtMetersDay * (1 - 2 * e);

    // Period decay rate: dP/dt = (3/2) * (P / a) * (da/dt)
    // Period in seconds = elements.periodMinutes * 60
    const periodSec = elements.periodMinutes * 60;
    const dPdtSecSec = (1.5 * periodSec / aMeters) * daDtMs;
    const periodDecayMsPerDay = Math.abs(dPdtSecSec * 86400 * 1000);

    // Re-entry lifetime estimation:
    // Scale height integration: delta_h / decay_rate
    const currentAltKm = elements.semiMajorAxis - EARTH_RADIUS_KM;
    const criticalReentryAltKm = 180.0;
    const altAboveReentryKm = Math.max(0, currentAltKm - criticalReentryAltKm);

    let reentryLifetimeDays: number;
    if (altAboveReentryKm <= 0) {
      reentryLifetimeDays = 0;
    } else {
      // Analytical exponential atmosphere integration:
      // T_lifetime ~ H / |da/dt|_current * [exp(delta_h / H) - 1] (capped realistically)
      const scaleHeightKm = Math.max(25, drag.density.scaleHeightKm);
      const absDecayKmDay = Math.max(1e-6, Math.abs(daDtMetersDay) / 1000);
      reentryLifetimeDays = (scaleHeightKm / absDecayKmDay) * (Math.exp(Math.min(3.5, altAboveReentryKm / scaleHeightKm)) - 1);
      // Clamp for numerical sanity: max 100 years
      reentryLifetimeDays = Math.min(36525, Math.max(0.1, reentryLifetimeDays));
    }

    let reentryStatus: OrbitalDecayRatesResult['reentryStatus'] = 'STABLE';
    if (currentAltKm <= 200 || reentryLifetimeDays < 30) {
      reentryStatus = 'CRITICAL_REENTRY';
    } else if (reentryLifetimeDays < 180) {
      reentryStatus = 'RAPID_DECAY';
    } else if (reentryLifetimeDays < 730) {
      reentryStatus = 'MODERATE_DECAY';
    } else {
      reentryStatus = 'STABLE';
    }

    return {
      semiMajorAxisDecayMetersPerSec: daDtMs,
      semiMajorAxisDecayMetersPerDay: daDtMetersDay,
      semiMajorAxisDecayKmPerYear: daDtKmYear,
      apogeeDecayMetersPerDay: dApogeeMetersDay,
      perigeeDecayMetersPerDay: dPerigeeMetersDay,
      periodDecayMsPerDay,
      reentryLifetimeDays,
      reentryStatus,
    };
  }

  /**
   * Projects orbital decay trajectories forward in time over multiple months or years
   * using multi-step numerical integration of the Harris-Priester drag model.
   * Compares solar minimum, nominal flux, solar maximum, and active deorbit sail configurations.
   */
  public static generateDecayComparisonScenarios(
    initialAltitudeKm: number,
    initialEccentricity: number,
    baseF107Flux = 145,
    baseAreaM2 = 0.03,
    cd = 2.2,
    massKg = 4.85
  ): ScenarioDecayCurve[] {
    const scenarios: {
      id: string;
      name: string;
      color: string;
      f107Flux: number;
      areaM2: number;
    }[] = [
      {
        id: 'current',
        name: `Current Space Weather (${baseF107Flux} sfu)`,
        color: '#22d3ee', // Cyan
        f107Flux: baseF107Flux,
        areaM2: baseAreaM2,
      },
      {
        id: 'solar_min',
        name: 'Solar Minimum / Quiet (70 sfu)',
        color: '#10b981', // Emerald
        f107Flux: 70,
        areaM2: baseAreaM2,
      },
      {
        id: 'solar_max',
        name: 'Solar Maximum / Active (220 sfu)',
        color: '#f59e0b', // Amber
        f107Flux: 220,
        areaM2: baseAreaM2,
      },
      {
        id: 'solar_storm',
        name: 'Severe Solar Flare / Storm (320 sfu)',
        color: '#ef4444', // Red
        f107Flux: 320,
        areaM2: baseAreaM2,
      },
      {
        id: 'drag_sail',
        name: 'Deorbit Drag Sail Deployed (0.12 m²)',
        color: '#a855f7', // Purple
        f107Flux: baseF107Flux,
        areaM2: 0.12,
      },
    ];

    const horizonDays = 365 * 5; // 5-year maximum projection
    const stepDays = 15; // 15-day integration steps

    return scenarios.map((sc) => {
      let alt = initialAltitudeKm;
      let e = initialEccentricity;
      const points: { day: number; altitudeKm: number }[] = [];
      let deorbitDay = horizonDays;

      for (let day = 0; day <= horizonDays; day += stepDays) {
        points.push({ day, altitudeKm: Number(Math.max(120, alt).toFixed(1)) });

        if (alt <= 180) {
          deorbitDay = day;
          break;
        }

        // Compute mean Harris-Priester density at this altitude
        // Using average diurnal factor 0.5 for secular long-term orbit integration
        const dummyPos: Vector3D = { x: alt + EARTH_RADIUS_KM, y: 0, z: 0 };
        const dummySun: Vector3D = { x: 1, y: 0, z: 0 };
        const dens = this.calculateDensity(alt, dummyPos, dummySun, sc.f107Flux, 4);

        // Circular orbital velocity v = sqrt(mu / r)
        const rKm = alt + EARTH_RADIUS_KM;
        const vMs = Math.sqrt(MU_EARTH / rKm) * 1000;
        const areaOverMass = sc.areaM2 / massKg;

        // Secular da/dt in m/s
        const daDtMs = -cd * areaOverMass * dens.densityKgM3 * vMs * (rKm * 1000);
        const altLossKm = (Math.abs(daDtMs) * 86400 * stepDays) / 1000;

        alt -= altLossKm;
        // Circularization of orbit
        e = Math.max(0, e - (altLossKm / rKm) * 0.5);
      }

      return {
        id: sc.id,
        name: sc.name,
        color: sc.color,
        f107Flux: sc.f107Flux,
        areaM2: sc.areaM2,
        lifetimeDays: deorbitDay,
        points,
      };
    });
  }

  /**
   * Calculates required Thruster Delta-V to maintain orbital altitude
   * counteracting Harris-Priester atmospheric drag over mission intervals.
   */
  public static calculateReboostRequirement(
    decayRateMetersDay: number,
    currentAltitudeKm: number,
    thrustMilliNewtons = 50,
    ispSec = 110
  ): {
    deltaVMsPerMonth: number;
    deltaVMsPerYear: number;
    propellantGramsPerMonth: number;
    propellantGramsPerYear: number;
    burnDurationSecPerMonth: number;
  } {
    const absDecayMDay = Math.abs(decayRateMetersDay);
    const rKm = currentAltitudeKm + EARTH_RADIUS_KM;
    const vOrbitMs = Math.sqrt(MU_EARTH / rKm) * 1000;

    // Hohmann reboost delta-v: delta_v = (v / 2) * (delta_a / a)
    // To restore delta_a altitude loss:
    const monthlyAltitudeLossM = absDecayMDay * 30.4375;
    const yearlyAltitudeLossM = absDecayMDay * 365.25;

    const aM = rKm * 1000;
    const deltaVMsPerMonth = (vOrbitMs / (2 * aM)) * monthlyAltitudeLossM;
    const deltaVMsPerYear = (vOrbitMs / (2 * aM)) * yearlyAltitudeLossM;

    // Propellant flow rate: m_dot = F / (g0 * Isp)
    const thrustN = thrustMilliNewtons / 1000;
    const mDotGramsPerSec = (thrustN / (9.80665 * ispSec)) * 1000;

    // Rocket equation delta_m ~ m0 * (1 - exp(-delta_v / (g0 * Isp)))
    const satMassGrams = 4850;
    const cMs = 9.80665 * ispSec;
    const propMonthGrams = satMassGrams * (1 - Math.exp(-deltaVMsPerMonth / cMs));
    const propYearGrams = satMassGrams * (1 - Math.exp(-deltaVMsPerYear / cMs));

    const burnSecPerMonth = deltaVMsPerMonth / (thrustN / (satMassGrams / 1000));

    return {
      deltaVMsPerMonth: Number(deltaVMsPerMonth.toFixed(3)),
      deltaVMsPerYear: Number(deltaVMsPerYear.toFixed(3)),
      propellantGramsPerMonth: Number(propMonthGrams.toFixed(2)),
      propellantGramsPerYear: Number(propYearGrams.toFixed(2)),
      burnDurationSecPerMonth: Number(burnSecPerMonth.toFixed(1)),
    };
  }
}
