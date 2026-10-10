import {
  Vector3D,
  KeplerianElements,
  GeodeticCoords,
} from '../../types/telemetry';
import { EARTH_RADIUS_KM } from './solar';

export const MU_EARTH = 398600.4418; // km^3 / s^2 (Earth gravitational parameter)
export const J2_EARTH = 1.08262668e-3; // Second zonal harmonic (Earth oblateness)
export const EARTH_ROTATION_RATE_RAD_S = 7.292115e-5; // rad/s (Earth angular velocity)
export const WGS84_A = 6378.137; // km
export const WGS84_F = 1 / 298.257223563; // flattening
export const WGS84_B = WGS84_A * (1 - WGS84_F); // 6356.7523142 km
export const WGS84_E_SQ = 2 * WGS84_F - WGS84_F * WGS84_F; // eccentricity squared

export class OrbitalMechanics {
  /**
   * Solves Kepler's equation M = E - e * sin(E) for Eccentric Anomaly E (radians)
   * High-accuracy Newton-Raphson iteration with Danby starting guess
   */
  public static solveKepler(meanAnomalyRad: number, eccentricity: number): number {
    let M = meanAnomalyRad % (2 * Math.PI);
    if (M < 0) M += 2 * Math.PI;

    // Danby initial guess
    let E = M + eccentricity * Math.sin(M) + 0.5 * eccentricity * eccentricity * Math.sin(2 * M);
    const tol = 1e-12;
    const maxIter = 30;

    for (let i = 0; i < maxIter; i++) {
      const f = E - eccentricity * Math.sin(E) - M;
      const fPrime = 1 - eccentricity * Math.cos(E);
      const fDoublePrime = eccentricity * Math.sin(E);
      // Halley's rational correction step
      const delta = f / (fPrime - (0.5 * f * fDoublePrime) / fPrime);
      E -= delta;
      if (Math.abs(delta) < tol) break;
    }

    return E;
  }

  /**
   * Propagates Keplerian elements with J2 perturbations over time delta t (seconds)
   */
  /**
   * Propagates Keplerian elements with optional J2 zonal perturbation (Earth's oblateness)
   * Calculates secular nodal regression rate (dOmega/dt) and perigee precession (domega/dt)
   */
  public static propagate(
    initial: KeplerianElements,
    dtSeconds: number,
    enableJ2 = true
  ): {
    elements: KeplerianElements;
    positionECI: Vector3D;
    velocityECI: Vector3D;
    nodalRegressionRateDegDay: number;
    perigeePrecessionRateDegDay: number;
    accumulatedNodalShiftDeg: number;
    groundTrackNodalShiftDegOrbit: number;
  } {
    const a = initial.semiMajorAxis;
    const e = initial.eccentricity;
    const incRad = (initial.inclination * Math.PI) / 180;
    const p = a * (1 - e * e); // Semi-latus rectum (km)

    // Mean motion n0 (rad/s)
    const n0 = Math.sqrt(MU_EARTH / (a * a * a));

    let dOmega_dt = 0;
    let domega_dt = 0;
    let dn = 0;

    if (enableJ2) {
      // J2 Secular rates of change:
      // RAAN nodal regression rate: dOmega/dt = -1.5 * n0 * J2 * (R_e / p)^2 * cos(i)
      const factor = 1.5 * n0 * J2_EARTH * Math.pow(EARTH_RADIUS_KM / p, 2);
      dOmega_dt = -factor * Math.cos(incRad); // rad/s

      // Argument of perigee drift rate: domega/dt = 0.75 * n0 * J2 * (R_e / p)^2 * (5*cos^2(i) - 1)
      domega_dt = 0.5 * factor * (5 * Math.pow(Math.cos(incRad), 2) - 1); // rad/s

      // Anomalous mean motion correction due to J2:
      const eta = Math.sqrt(1 - e * e);
      dn = 0.75 * n0 * J2_EARTH * Math.pow(EARTH_RADIUS_KM / p, 2) * eta * (3 * Math.pow(Math.cos(incRad), 2) - 1);
    }

    const n = n0 + dn;

    // Propagate angles:
    let newRAANRad = (initial.raan * Math.PI) / 180 + dOmega_dt * dtSeconds;
    let newArgPerigeeRad = (initial.argOfPerigee * Math.PI) / 180 + domega_dt * dtSeconds;
    let newMeanAnomalyRad = (initial.meanAnomaly * Math.PI) / 180 + n * dtSeconds;

    // Normalize angles to [0, 2*PI)
    newRAANRad = ((newRAANRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    newArgPerigeeRad = ((newArgPerigeeRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    newMeanAnomalyRad = ((newMeanAnomalyRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Solve for Eccentric Anomaly E
    const E = this.solveKepler(newMeanAnomalyRad, e);

    // True Anomaly nu
    const sinNu = (Math.sqrt(1 - e * e) * Math.sin(E)) / (1 - e * Math.cos(E));
    const cosNu = (Math.cos(E) - e) / (1 - e * Math.cos(E));
    let nuRad = Math.atan2(sinNu, cosNu);
    if (nuRad < 0) nuRad += 2 * Math.PI;

    // Radius in orbital plane (km)
    const r = a * (1 - e * Math.cos(E));

    // Perifocal coordinates (P, Q, W)
    const pX = r * Math.cos(nuRad);
    const pY = r * Math.sin(nuRad);

    const h = Math.sqrt(MU_EARTH * p);
    const vX = -(MU_EARTH / h) * Math.sin(nuRad);
    const vY = (MU_EARTH / h) * (e + Math.cos(nuRad));

    // Transform from Perifocal to ECI frame using 3-1-3 Euler rotation matrix:
    const cosOm = Math.cos(newRAANRad);
    const sinOm = Math.sin(newRAANRad);
    const cosInc = Math.cos(incRad);
    const sinInc = Math.sin(incRad);
    const cosW = Math.cos(newArgPerigeeRad);
    const sinW = Math.sin(newArgPerigeeRad);

    const Px = cosOm * cosW - sinOm * sinW * cosInc;
    const Py = sinOm * cosW + cosOm * sinW * cosInc;
    const Pz = sinW * sinInc;

    const Qx = -cosOm * sinW - sinOm * cosW * cosInc;
    const Qy = -sinOm * sinW + cosOm * cosW * cosInc;
    const Qz = cosW * sinInc;

    const positionECI: Vector3D = {
      x: pX * Px + pY * Qx,
      y: pX * Py + pY * Qy,
      z: pX * Pz + pY * Qz,
    };

    const velocityECI: Vector3D = {
      x: vX * Px + vY * Qx,
      y: vX * Py + vY * Qy,
      z: vX * Pz + vY * Qz,
    };

    const periodSec = 2 * Math.PI / n;
    const apogeeAlt = a * (1 + e) - EARTH_RADIUS_KM;
    const perigeeAlt = a * (1 - e) - EARTH_RADIUS_KM;

    // Rates in degrees/day
    const nodalRegressionRateDegDay = dOmega_dt * 86400 * (180 / Math.PI);
    const perigeePrecessionRateDegDay = domega_dt * 86400 * (180 / Math.PI);
    const accumulatedNodalShiftDeg = (dOmega_dt * dtSeconds * 180) / Math.PI;

    // Longitudinal displacement of ground track per revolution:
    // delta_lambda = (omega_earth - dOmega/dt) * Period
    const groundTrackNodalShiftDegOrbit =
      ((EARTH_ROTATION_RATE_RAD_S - dOmega_dt) * periodSec * 180) / Math.PI;

    const updatedElements: KeplerianElements = {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: initial.inclination,
      raan: (newRAANRad * 180) / Math.PI,
      argOfPerigee: (newArgPerigeeRad * 180) / Math.PI,
      meanAnomaly: (newMeanAnomalyRad * 180) / Math.PI,
      trueAnomaly: (nuRad * 180) / Math.PI,
      periodMinutes: periodSec / 60,
      apogeeAltitude: apogeeAlt,
      perigeeAltitude: perigeeAlt,
    };

    return {
      elements: updatedElements,
      positionECI,
      velocityECI,
      nodalRegressionRateDegDay,
      perigeePrecessionRateDegDay,
      accumulatedNodalShiftDeg,
      groundTrackNodalShiftDegOrbit,
    };
  }

  /**
   * Backwards-compatible alias for propagate with J2 enabled
   */
  public static propagateJ2(
    initial: KeplerianElements,
    dtSeconds: number
  ) {
    return this.propagate(initial, dtSeconds, true);
  }

  /**
   * Greenwich Mean Sidereal Time (GMST) in radians at given timestamp
   */
  public static getGMSTRadians(epochMs: number): number {
    const jd = epochMs / 86400000 + 2440587.5;
    const d = jd - 2451545.0; // days since J2000.0
    // GMST in degrees = 280.46061837 + 360.98564736629 * d
    const gmstDeg = (280.46061837 + 360.98564736629 * d) % 360;
    const gmstNorm = (gmstDeg + 360) % 360;
    return (gmstNorm * Math.PI) / 180;
  }

  /**
   * Converts ECI coordinates to WGS84 Geodetic coordinates (Latitude, Longitude, Altitude)
   */
  public static eciToGeodetic(posECI: Vector3D, epochMs: number): GeodeticCoords {
    const gmst = this.getGMSTRadians(epochMs);

    // Rotate ECI to ECEF around Z-axis by GMST angle
    const cosG = Math.cos(gmst);
    const sinG = Math.sin(gmst);
    const xECEF = cosG * posECI.x + sinG * posECI.y;
    const yECEF = -sinG * posECI.x + cosG * posECI.y;
    const zECEF = posECI.z;

    // Longitude in degrees [-180, 180]
    let longitude = Math.atan2(yECEF, xECEF) * (180 / Math.PI);
    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;

    // Bowring's algorithm for WGS84 geodetic latitude and ellipsoidal height
    const p = Math.sqrt(xECEF * xECEF + yECEF * yECEF);
    const theta = Math.atan2(zECEF * WGS84_A, p * WGS84_B);

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    const ePrimeSq = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
    const phi = Math.atan2(
      zECEF + ePrimeSq * WGS84_B * Math.pow(sinTheta, 3),
      p - WGS84_E_SQ * WGS84_A * Math.pow(cosTheta, 3)
    );

    const sinPhi = Math.sin(phi);
    const N = WGS84_A / Math.sqrt(1 - WGS84_E_SQ * sinPhi * sinPhi);
    const altitude = p / Math.cos(phi) - N;

    const latitude = (phi * 180) / Math.PI;

    return {
      latitude,
      longitude,
      altitude,
    };
  }

  /**
   * Computes elevation, azimuth, and slant range from ground station to satellite
   */
  public static computeGroundStationLookAngles(
    satPosECI: Vector3D,
    stationLatDeg: number,
    stationLonDeg: number,
    stationAltM: number,
    epochMs: number
  ): {
    elevationDeg: number;
    azimuthDeg: number;
    slantRangeKm: number;
    inView: boolean;
  } {
    const gmst = this.getGMSTRadians(epochMs);

    // Station ECEF position
    const phi = (stationLatDeg * Math.PI) / 180;
    const lam = (stationLonDeg * Math.PI) / 180;
    const h = stationAltM / 1000;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const N = WGS84_A / Math.sqrt(1 - WGS84_E_SQ * sinPhi * sinPhi);

    const stationX_ECEF = (N + h) * cosPhi * Math.cos(lam);
    const stationY_ECEF = (N + h) * cosPhi * Math.sin(lam);
    const stationZ_ECEF = (N * (1 - WGS84_E_SQ) + h) * sinPhi;

    // Sat in ECEF
    const cosG = Math.cos(gmst);
    const sinG = Math.sin(gmst);
    const satX_ECEF = cosG * satPosECI.x + sinG * satPosECI.y;
    const satY_ECEF = -sinG * satPosECI.x + cosG * satPosECI.y;
    const satZ_ECEF = satPosECI.z;

    // Vector from station to satellite in ECEF
    const dx = satX_ECEF - stationX_ECEF;
    const dy = satY_ECEF - stationY_ECEF;
    const dz = satZ_ECEF - stationZ_ECEF;

    const slantRangeKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Transform from ECEF to Topocentric Horizon SEZ (South, East, Zenith)
    const sinLam = Math.sin(lam);
    const cosLam = Math.cos(lam);

    // East = -sinLam*dx + cosLam*dy
    const east = -sinLam * dx + cosLam * dy;
    // South = sinPhi*cosLam*dx + sinPhi*sinLam*dy - cosPhi*dz
    const south = sinPhi * cosLam * dx + sinPhi * sinLam * dy - cosPhi * dz;
    // North = -South
    const north = -south;
    // Zenith / Up = cosPhi*cosLam*dx + cosPhi*sinLam*dy + sinPhi*dz
    const up = cosPhi * cosLam * dx + cosPhi * sinLam * dy + sinPhi * dz;

    const horizontalDist = Math.sqrt(north * north + east * east);
    const elevationRad = Math.atan2(up, horizontalDist);
    let azimuthRad = Math.atan2(east, north);
    if (azimuthRad < 0) azimuthRad += 2 * Math.PI;

    const elevationDeg = (elevationRad * 180) / Math.PI;
    const azimuthDeg = (azimuthRad * 180) / Math.PI;

    return {
      elevationDeg,
      azimuthDeg,
      slantRangeKm,
      inView: elevationDeg >= 5.0, // Standard 5-degree mask
    };
  }

  /**
   * Generates a forward ground track path (array of lat, lon) for visual rendering
   */
  public static generateGroundTrack(
    currentElements: KeplerianElements,
    startEpochMs: number,
    numPoints = 120,
    orbitSpan = 1.5,
    enableJ2 = true
  ): Array<{ lat: number; lon: number; epoch: number }> {
    const track: Array<{ lat: number; lon: number; epoch: number }> = [];
    const periodSec = currentElements.periodMinutes * 60;
    const totalDurationSec = periodSec * orbitSpan;
    const stepSec = totalDurationSec / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const dt = i * stepSec;
      const targetTime = startEpochMs + dt * 1000;
      const prop = this.propagate(currentElements, dt, enableJ2);
      const geo = this.eciToGeodetic(prop.positionECI, targetTime);
      track.push({
        lat: geo.latitude,
        lon: geo.longitude,
        epoch: targetTime,
      });
    }

    return track;
  }
}
