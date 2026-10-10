import { Vector3D } from '../../types/telemetry';

export const EARTH_RADIUS_KM = 6378.137;
export const SUN_RADIUS_KM = 696340;
export const AU_KM = 149597870.7;
export const SOLAR_CONSTANT_W_M2 = 1361.0;

export class SolarPhysics {
  /**
   * Calculates Julian Date from JavaScript epoch ms
   */
  public static getJulianDate(epochMs: number): number {
    return epochMs / 86400000 + 2440587.5;
  }

  /**
   * Calculates Earth-Centered Inertial (ECI) Sun direction unit vector
   * Uses high-precision low-eccentricity solar ephemeris model (Meeus algorithm)
   */
  public static getSunVectorECI(epochMs: number): Vector3D {
    const jd = this.getJulianDate(epochMs);
    const d = jd - 2451545.0; // days since J2000.0

    // Mean anomaly of the Sun (rad)
    const g = (357.529 + 0.98560028 * d) * (Math.PI / 180);
    // Mean longitude of the Sun (rad)
    const q = (280.459 + 0.98564736 * d) * (Math.PI / 180);
    // Geocentric apparent ecliptic longitude of the Sun (rad)
    const L = q + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * (Math.PI / 180);
    // Obliquity of the ecliptic (rad)
    const e = (23.439 - 0.00000036 * d) * (Math.PI / 180);

    // ECI coordinates of the Sun (unit vector)
    const x = Math.cos(L);
    const y = Math.cos(e) * Math.sin(L);
    const z = Math.sin(e) * Math.sin(L);

    return { x, y, z };
  }

  /**
   * Determines Earth shadow condition:
   * 'SUNLIGHT' (100% illuminated)
   * 'PENUMBRA' (partial occultation)
   * 'UMBRA' (complete darkness)
   */
  public static calculateEclipse(satPosECI: Vector3D, sunDirECI: Vector3D): {
    state: 'SUNLIGHT' | 'PENUMBRA' | 'UMBRA';
    fraction: number;
  } {
    // Distance of satellite from Earth center
    const rSat = Math.sqrt(satPosECI.x * satPosECI.x + satPosECI.y * satPosECI.y + satPosECI.z * satPosECI.z);
    if (rSat < 1e-3) return { state: 'SUNLIGHT', fraction: 1 };

    // Projection of satellite position along Sun vector
    const sDotR = satPosECI.x * sunDirECI.x + satPosECI.y * sunDirECI.y + satPosECI.z * sunDirECI.z;

    // If satellite is on the sunward side of Earth (sDotR > 0), it is always illuminated
    if (sDotR >= 0) {
      return { state: 'SUNLIGHT', fraction: 1.0 };
    }

    // Perpendicular distance from Earth-Sun line to satellite
    // d_perp = sqrt(rSat^2 - sDotR^2)
    const dPerpSq = rSat * rSat - sDotR * sDotR;
    const dPerp = Math.sqrt(Math.max(0, dPerpSq));

    // Conical shadow bounds at distance |sDotR| behind Earth
    // Semi-angles of umbra and penumbra cones
    const distBehind = Math.abs(sDotR);
    const rEarth = EARTH_RADIUS_KM;

    // Umbra boundary radius at this distance
    // sin(alpha_u) = (R_sun - R_earth) / AU
    const sinAlphaU = (SUN_RADIUS_KM - rEarth) / AU_KM;
    const rUmbra = rEarth - distBehind * sinAlphaU;

    // Penumbra boundary radius at this distance
    const sinAlphaP = (SUN_RADIUS_KM + rEarth) / AU_KM;
    const rPenumbra = rEarth + distBehind * sinAlphaP;

    if (dPerp <= rUmbra) {
      return { state: 'UMBRA', fraction: 0.0 };
    } else if (dPerp < rPenumbra) {
      // Linear transition in penumbra zone
      const fraction = (dPerp - rUmbra) / (rPenumbra - rUmbra);
      return {
        state: 'PENUMBRA',
        fraction: Math.max(0, Math.min(1, fraction)),
      };
    } else {
      return { state: 'SUNLIGHT', fraction: 1.0 };
    }
  }

  /**
   * Beta angle beta = arcsin(h_hat · s_hat)
   * Angle between orbital plane and geocentric solar vector.
   * h = r x v is orbital angular momentum vector.
   */
  public static calculateBetaAngle(posECI: Vector3D, velECI: Vector3D, sunDirECI: Vector3D): number {
    // h = r x v
    const hx = posECI.y * velECI.z - posECI.z * velECI.y;
    const hy = posECI.z * velECI.x - posECI.x * velECI.z;
    const hz = posECI.x * velECI.y - posECI.y * velECI.x;

    const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz);
    if (hMag < 1e-6) return 0;

    const hNorm = { x: hx / hMag, y: hy / hMag, z: hz / hMag };
    const dot = hNorm.x * sunDirECI.x + hNorm.y * sunDirECI.y + hNorm.z * sunDirECI.z;

    const clamped = Math.max(-1, Math.min(1, dot));
    return Math.asin(clamped) * (180 / Math.PI);
  }

  /**
   * Calculates the Solar Incidence Angle on each satellite body face and deployable wing,
   * returning exact power output and thermal derated efficiency.
   */
  public static calculateSolarPanelIncidence(
    sunVecECI: Vector3D,
    quaternion: { w: number; x: number; y: number; z: number },
    panelsDeployed: boolean,
    eclipseFraction: number,
    panelTempC = 25.0,
    solarCapacityW = 18.5
  ) {
    // 1. Transform Sun Vector from ECI to Satellite Body Frame:
    // v_body = q^-1 * v_eci * q
    const lenQ = Math.sqrt(quaternion.w ** 2 + quaternion.x ** 2 + quaternion.y ** 2 + quaternion.z ** 2) || 1;
    const qNorm = {
      w: quaternion.w / lenQ,
      x: quaternion.x / lenQ,
      y: quaternion.y / lenQ,
      z: quaternion.z / lenQ,
    };
    const qInv = { w: qNorm.w, x: -qNorm.x, y: -qNorm.y, z: -qNorm.z };

    // Quaternion multiplication qInv * sunVec * q
    const qv = { w: 0, x: sunVecECI.x, y: sunVecECI.y, z: sunVecECI.z };
    const t1 = {
      w: qInv.w * qv.w - qInv.x * qv.x - qInv.y * qv.y - qInv.z * qv.z,
      x: qInv.w * qv.x + qInv.x * qv.w + qInv.y * qv.z - qInv.z * qv.y,
      y: qInv.w * qv.y - qInv.x * qv.z + qInv.y * qv.w + qInv.z * qv.x,
      z: qInv.w * qv.z + qInv.x * qv.y - qInv.y * qv.x + qInv.z * qv.w,
    };
    const res = {
      w: t1.w * qNorm.w - t1.x * qNorm.x - t1.y * qNorm.y - t1.z * qNorm.z,
      x: t1.w * qNorm.x + t1.x * qNorm.w + t1.y * qNorm.z - t1.z * qNorm.y,
      y: t1.w * qNorm.y - t1.x * qNorm.z + t1.y * qNorm.w + t1.z * qNorm.x,
      z: t1.w * qNorm.z + t1.x * qNorm.y - t1.y * qNorm.x + t1.z * qNorm.w,
    };

    const sBodyMag = Math.sqrt(res.x ** 2 + res.y ** 2 + res.z ** 2) || 1;
    const sunVectorBody: Vector3D = {
      x: res.x / sBodyMag,
      y: res.y / sBodyMag,
      z: res.z / sBodyMag,
    };

    // 2. Define Body Faces & Solar Array Geometry
    // Triple-junction GaAs nominal efficiency with temperature derating (-0.25%/°C above 25°C)
    const baseCellEffPercent = 29.5;
    const tempDerateFactor = 1.0 - 0.0025 * (panelTempC - 25.0);
    const cellEfficiencyPercent = Math.max(18.0, Math.min(32.0, baseCellEffPercent * tempDerateFactor));

    interface FaceSpec {
      faceId: '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z' | 'WING_LEFT' | 'WING_RIGHT';
      name: string;
      normalBody: Vector3D;
      areaM2: number;
      isDeployable: boolean;
    }

    const faceSpecs: FaceSpec[] = [
      { faceId: '+X', name: '+X Starboard Face (3U)', normalBody: { x: 1, y: 0, z: 0 }, areaM2: 0.030, isDeployable: false },
      { faceId: '-X', name: '-X Port Face (3U)', normalBody: { x: -1, y: 0, z: 0 }, areaM2: 0.030, isDeployable: false },
      { faceId: '+Y', name: '+Y Zenith Face (3U)', normalBody: { x: 0, y: 1, z: 0 }, areaM2: 0.030, isDeployable: false },
      { faceId: '-Y', name: '-Y Nadir Face (3U)', normalBody: { x: 0, y: -1, z: 0 }, areaM2: 0.030, isDeployable: false },
      { faceId: '+Z', name: '+Z Sun Boresight Face (1U)', normalBody: { x: 0, y: 0, z: 1 }, areaM2: 0.010, isDeployable: false },
      { faceId: '-Z', name: '-Z Payload Aft Face (1U)', normalBody: { x: 0, y: 0, z: -1 }, areaM2: 0.005, isDeployable: false },
      { faceId: 'WING_LEFT', name: 'Port Deployable Wing (+Z Normal)', normalBody: { x: 0, y: 0, z: 1 }, areaM2: 0.055, isDeployable: true },
      { faceId: 'WING_RIGHT', name: 'Starboard Deployable Wing (+Z Normal)', normalBody: { x: 0, y: 0, z: 1 }, areaM2: 0.055, isDeployable: true },
    ];

    let totalRawPowerW = 0;
    const panelFaces = faceSpecs.map((spec) => {
      // If deployable wing is stowed, it contributes 0 area
      const activeArea = spec.isDeployable && !panelsDeployed ? 0 : spec.areaM2;

      // Cosine of incidence: dot product of normal and sun direction in body frame
      const dot = spec.normalBody.x * sunVectorBody.x +
                  spec.normalBody.y * sunVectorBody.y +
                  spec.normalBody.z * sunVectorBody.z;

      const cosIncidence = Math.max(0, dot);
      const angleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
      const incidenceAngleDeg = (angleRad * 180) / Math.PI;

      const isIlluminated = dot > 0.001 && eclipseFraction > 0.001 && activeArea > 0;

      // Power generated: P = Irradiance * EclipseFraction * Area * Efficiency * cos(theta) * MPPT(0.96)
      const mpptEff = 0.96;
      const powerOutputW = activeArea > 0
        ? SOLAR_CONSTANT_W_M2 * eclipseFraction * activeArea * (cellEfficiencyPercent / 100) * mpptEff * cosIncidence
        : 0;

      totalRawPowerW += powerOutputW;

      return {
        faceId: spec.faceId,
        name: spec.name,
        normalBody: spec.normalBody,
        areaM2: activeArea,
        incidenceAngleDeg: Number(incidenceAngleDeg.toFixed(2)),
        cosIncidence: Number(cosIncidence.toFixed(4)),
        isIlluminated,
        powerOutputW: Number(powerOutputW.toFixed(2)),
        cellEfficiencyPercent: Number(cellEfficiencyPercent.toFixed(2)),
      };
    });

    // Scale to match rated spacecraft capacity curve
    const maxReferenceArea = 0.03 * 4 + 0.01 + (panelsDeployed ? 0.11 : 0);
    const nominalMaxW = solarCapacityW * (panelsDeployed ? 1.0 : 0.35);
    const scaling = nominalMaxW / (SOLAR_CONSTANT_W_M2 * maxReferenceArea * (baseCellEffPercent / 100) * 0.96 * 0.5 || 1);
    const scaledTotalPowerW = Number((totalRawPowerW * scaling * (eclipseFraction > 0 ? 1 : 0)).toFixed(2));

    const effectiveHarvestingEfficiencyPercent = Number(
      (cellEfficiencyPercent * (eclipseFraction > 0 ? 1 : 0)).toFixed(1)
    );

    return {
      panelFaces,
      sunVectorBody,
      totalArrayPowerW: scaledTotalPowerW,
      effectiveHarvestingEfficiencyPercent,
    };
  }
}

