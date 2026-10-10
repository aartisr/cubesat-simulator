import {
  Vector3D,
  SpaceDebris,
  ConjunctionAssessment,
  OrbitalState,
} from '../../types/telemetry';

export class CollisionPhysics {
  /**
   * Calculates relative position and velocity between satellite and debris
   */
  public static getRelativeState(sat: OrbitalState, debris: SpaceDebris): {
    rRel: Vector3D;
    vRel: Vector3D;
    distKm: number;
    relSpeedKmS: number;
  } {
    const rRel: Vector3D = {
      x: debris.positionECI.x - sat.positionECI.x,
      y: debris.positionECI.y - sat.positionECI.y,
      z: debris.positionECI.z - sat.positionECI.z,
    };

    const vRel: Vector3D = {
      x: debris.velocityECI.x - sat.velocityECI.x,
      y: debris.velocityECI.y - sat.velocityECI.y,
      z: debris.velocityECI.z - sat.velocityECI.z,
    };

    const distKm = Math.sqrt(rRel.x * rRel.x + rRel.y * rRel.y + rRel.z * rRel.z);
    const relSpeedKmS = Math.sqrt(vRel.x * vRel.x + vRel.y * vRel.y + vRel.z * vRel.z);

    return { rRel, vRel, distKm, relSpeedKmS };
  }

  /**
   * Predicts Time of Closest Approach (TCA) and Miss Distance
   * Linear relative motion approximation for short encounter window
   */
  public static predictTCA(
    rRel: Vector3D,
    vRel: Vector3D,
    currentEpochMs: number
  ): {
    tcaEpochMs: number;
    tcaSeconds: number;
    missDistanceKm: number;
    bPlaneOffset: { x: number; y: number };
  } {
    const vMagSq = vRel.x * vRel.x + vRel.y * vRel.y + vRel.z * vRel.z;
    if (vMagSq < 1e-8) {
      const d = Math.sqrt(rRel.x * rRel.x + rRel.y * rRel.y + rRel.z * rRel.z);
      return {
        tcaEpochMs: currentEpochMs,
        tcaSeconds: 0,
        missDistanceKm: d,
        bPlaneOffset: { x: d, y: 0 },
      };
    }

    // t_tca = - (r · v) / |v|^2
    const rDotV = rRel.x * vRel.x + rRel.y * vRel.y + rRel.z * vRel.z;
    let tcaSec = -rDotV / vMagSq;

    // If TCA is in the past, encounter already occurred or receding
    if (tcaSec < 0) {
      tcaSec = 0;
    }

    // Miss vector at TCA: r_tca = r + v * t_tca
    const rx = rRel.x + vRel.x * tcaSec;
    const ry = rRel.y + vRel.y * tcaSec;
    const rz = rRel.z + vRel.z * tcaSec;
    const missDistanceKm = Math.sqrt(rx * rx + ry * ry + rz * rz);

    return {
      tcaEpochMs: currentEpochMs + tcaSec * 1000,
      tcaSeconds: tcaSec,
      missDistanceKm,
      bPlaneOffset: {
        x: rx,
        y: Math.sqrt(ry * ry + rz * rz),
      },
    };
  }

  /**
   * Calculates Probability of Collision (Pc) using 2D encounter plane Gaussian integration
   * Combined Hard Body Radius (HBR) = R_sat (0.5m) + R_debris (from RCS)
   */
  public static calculateCollisionProbability(
    missDistanceKm: number,
    rcsM2: number,
    sigmaCrossTrackKm = 0.08, // 80m standard deviation
    sigmaAlongTrackKm = 0.25  // 250m along-track uncertainty
  ): number {
    // Equivalent sphere radius of debris
    const rDebrisM = Math.max(0.1, Math.sqrt(rcsM2 / Math.PI));
    const rSatM = 0.6; // 3U/6U CubeSat diagonal
    const hbrM = rSatM + rDebrisM;
    const hbrKm = hbrM / 1000; // km

    // If miss distance is huge, Pc is virtually zero
    if (missDistanceKm > 10.0) return 0.0;

    // Standard Foster/Chan 2D Gaussian integration over hard body radius circle
    const d = missDistanceKm;
    const sigmaSq = (sigmaCrossTrackKm * sigmaAlongTrackKm);
    
    // Mahalanobis distance squared
    const u = (d * d) / (2 * sigmaSq);
    const hardBodyAreaKm2 = Math.PI * hbrKm * hbrKm;
    const peakPdf = 1 / (2 * Math.PI * sigmaSq);

    // Probability Pc = area * pdf(miss_distance)
    let pc = hardBodyAreaKm2 * peakPdf * Math.exp(-u);

    // Cap at physical maximum 1.0
    if (pc > 1.0) pc = 1.0;
    if (pc < 1e-12) pc = 0.0;

    return pc;
  }

  /**
   * Evaluates Conjunction Data Message (CDM) severity and recommends evasion maneuver
   */
  public static evaluateConjunction(
    sat: OrbitalState,
    debris: SpaceDebris
  ): ConjunctionAssessment {
    const { rRel, vRel, relSpeedKmS } = this.getRelativeState(sat, debris);
    const { tcaEpochMs, tcaSeconds, missDistanceKm } = this.predictTCA(
      rRel,
      vRel,
      sat.simulatedTime
    );

    const pc = this.calculateCollisionProbability(missDistanceKm, debris.rcsM2);

    let severity: 'NOMINAL' | 'MONITOR' | 'WARNING' | 'CRITICAL' = 'NOMINAL';
    let action = 'No maneuver required. Continue routine tracking.';
    let recDeltaV = 0.0;

    if (missDistanceKm < 0.2 || pc > 1e-3) {
      severity = 'CRITICAL';
      action = 'IMMEDIATE CAM (Collision Avoidance Maneuver) REQUIRED. High collision probability.';
      recDeltaV = 0.85; // m/s
    } else if (missDistanceKm < 1.0 || pc > 1e-4) {
      severity = 'WARNING';
      action = 'Evasion burn recommended at next ascending node. Expand miss distance > 5 km.';
      recDeltaV = 0.42; // m/s
    } else if (missDistanceKm < 5.0 || pc > 1e-6) {
      severity = 'MONITOR';
      action = 'Close approach flagged. Monitor radar ephemeris covariance update.';
      recDeltaV = 0.15;
    }

    // Direction perpendicular to relative velocity and satellite velocity (cross-track thrust)
    const vSat = sat.velocityECI;
    const bx = vSat.y * vRel.z - vSat.z * vRel.y;
    const by = vSat.z * vRel.x - vSat.x * vRel.z;
    const bz = vSat.x * vRel.y - vSat.y * vRel.x;
    const bMag = Math.sqrt(bx * bx + by * by + bz * bz) || 1;

    const burnVectorECI: Vector3D = {
      x: (bx / bMag) * recDeltaV,
      y: (by / bMag) * recDeltaV,
      z: (bz / bMag) * recDeltaV,
    };

    return {
      debrisId: debris.id,
      debrisName: debris.name,
      catalogNumber: debris.catalogNumber,
      timeOfClosestApproach: tcaEpochMs,
      timeToTcaSeconds: tcaSeconds,
      missDistanceKm,
      relativeVelocityKmS: relSpeedKmS,
      collisionProbability: pc,
      severity,
      recommendedAction: action,
      recommendedDeltaVMs: recDeltaV,
      burnVectorECI,
      maneuverExecuted: false,
    };
  }
}
