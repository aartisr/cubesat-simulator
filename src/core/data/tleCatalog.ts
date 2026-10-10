import { KeplerianElements, SpaceDebris } from '../../types/telemetry';

export interface SatellitePreset {
  id: string;
  name: string;
  formFactor: '1U' | '3U' | '6U' | '12U';
  noradId: number;
  missionDescription: string;
  massKg: number;
  batteryCapacityWh: number;
  solarCapacityW: number;
  initialElements: KeplerianElements;
}

export const CUBESAT_PRESETS: SatellitePreset[] = [
  {
    id: 'pcss-ii',
    name: 'PCSS-II (Virtual Twin)',
    formFactor: '3U',
    noradId: 58920,
    missionDescription: 'Autonomous 3U CubeSat carrying hyper-spectral Earth Imager & autonomous collision avoidance reaction wheel package.',
    massKg: 4.85,
    batteryCapacityWh: 40.0,
    solarCapacityW: 18.5,
    initialElements: {
      semiMajorAxis: 6898.137, // ~520 km altitude
      eccentricity: 0.0012,
      inclination: 97.45, // Sun-synchronous orbit
      raan: 142.3,
      argOfPerigee: 78.5,
      trueAnomaly: 35.0,
      meanAnomaly: 34.8,
      periodMinutes: 95.0,
      apogeeAltitude: 528.0,
      perigeeAltitude: 512.0,
    },
  },
  {
    id: 'planet-dove',
    name: 'Dove Flock-4P',
    formFactor: '3U',
    noradId: 44800,
    missionDescription: 'Planet Labs Earth observation CubeSat in near-polar Sun-synchronous orbit with continuous 3-meter optical imaging.',
    massKg: 5.2,
    batteryCapacityWh: 50.0,
    solarCapacityW: 24.0,
    initialElements: {
      semiMajorAxis: 6878.137, // ~500 km
      eccentricity: 0.0018,
      inclination: 97.4,
      raan: 215.1,
      argOfPerigee: 120.4,
      trueAnomaly: 190.2,
      meanAnomaly: 189.9,
      periodMinutes: 94.6,
      apogeeAltitude: 512.0,
      perigeeAltitude: 488.0,
    },
  },
  {
    id: 'lightsail-2',
    name: 'LightSail 2',
    formFactor: '3U',
    noradId: 44415,
    missionDescription: 'The Planetary Society solar-sailing demonstrator utilizing photon pressure for propellant-free orbit raising.',
    massKg: 5.0,
    batteryCapacityWh: 30.0,
    solarCapacityW: 14.0,
    initialElements: {
      semiMajorAxis: 7098.137, // ~720 km
      eccentricity: 0.0055,
      inclination: 24.0, // Low inclination
      raan: 45.6,
      argOfPerigee: 210.3,
      trueAnomaly: 65.0,
      meanAnomaly: 64.7,
      periodMinutes: 99.1,
      apogeeAltitude: 759.0,
      perigeeAltitude: 681.0,
    },
  },
  {
    id: 'biosentinel',
    name: 'BioSentinel (Deep LEO/Lunar Path)',
    formFactor: '6U',
    noradId: 54231,
    missionDescription: 'NASA Ames 6U deep space CubeSat studying biological DNA repair mechanisms in deep space radiation environments.',
    massKg: 13.5,
    batteryCapacityWh: 95.0,
    solarCapacityW: 42.0,
    initialElements: {
      semiMajorAxis: 7178.137, // ~800 km
      eccentricity: 0.0025,
      inclination: 51.64, // ISS-like plane
      raan: 310.2,
      argOfPerigee: 14.2,
      trueAnomaly: 110.0,
      meanAnomaly: 109.8,
      periodMinutes: 100.8,
      apogeeAltitude: 818.0,
      perigeeAltitude: 782.0,
    },
  },
];

export const TRACKED_SPACE_DEBRIS: SpaceDebris[] = [
  {
    id: 'deb-cosmos-2251-frag',
    catalogNumber: 33814,
    name: 'COSMOS 2251 DEB (#33814)',
    type: 'FRAGMENT',
    rcsM2: 0.18,
    estimatedMassKg: 1.4,
    semiMajorAxisKm: 6899.5,
    eccentricity: 0.0024,
    inclinationDeg: 97.8,
    raanDeg: 142.1,
    argOfPerigeeDeg: 82.0,
    meanAnomalyDeg: 36.5,
    meanMotionRevsPerDay: 15.15,
    positionECI: { x: 0, y: 0, z: 0 },
    velocityECI: { x: 0, y: 0, z: 0 },
    currentDistanceKm: 0,
  },
  {
    id: 'deb-fengyun-1c-frag',
    catalogNumber: 30422,
    name: 'FENGYUN 1C DEB (#30422)',
    type: 'FRAGMENT',
    rcsM2: 0.45,
    estimatedMassKg: 3.2,
    semiMajorAxisKm: 6920.0,
    eccentricity: 0.012,
    inclinationDeg: 98.6,
    raanDeg: 148.0,
    argOfPerigeeDeg: 15.0,
    meanAnomalyDeg: 42.0,
    meanMotionRevsPerDay: 15.11,
    positionECI: { x: 0, y: 0, z: 0 },
    velocityECI: { x: 0, y: 0, z: 0 },
    currentDistanceKm: 0,
  },
  {
    id: 'deb-cz4b-upper-stage',
    catalogNumber: 25792,
    name: 'CZ-4B R/B ROCKET BODY (#25792)',
    type: 'ROCKET_BODY',
    rcsM2: 4.8,
    estimatedMassKg: 1200.0,
    semiMajorAxisKm: 6885.0,
    eccentricity: 0.0031,
    inclinationDeg: 96.9,
    raanDeg: 139.8,
    argOfPerigeeDeg: 110.0,
    meanAnomalyDeg: 31.0,
    meanMotionRevsPerDay: 15.18,
    positionECI: { x: 0, y: 0, z: 0 },
    velocityECI: { x: 0, y: 0, z: 0 },
    currentDistanceKm: 0,
  },
  {
    id: 'deb-iridium-33-frag',
    catalogNumber: 34105,
    name: 'IRIDIUM 33 DEB (#34105)',
    type: 'FRAGMENT',
    rcsM2: 0.09,
    estimatedMassKg: 0.6,
    semiMajorAxisKm: 6905.2,
    eccentricity: 0.0019,
    inclinationDeg: 86.4,
    raanDeg: 165.2,
    argOfPerigeeDeg: 45.0,
    meanAnomalyDeg: 75.0,
    meanMotionRevsPerDay: 15.14,
    positionECI: { x: 0, y: 0, z: 0 },
    velocityECI: { x: 0, y: 0, z: 0 },
    currentDistanceKm: 0,
  },
  {
    id: 'deb-sl16-zenit',
    catalogNumber: 22220,
    name: 'SL-16 R/B ZENIT (#22220)',
    type: 'ROCKET_BODY',
    rcsM2: 12.5,
    estimatedMassKg: 8500.0,
    semiMajorAxisKm: 7220.0,
    eccentricity: 0.008,
    inclinationDeg: 71.0,
    raanDeg: 88.0,
    argOfPerigeeDeg: 190.0,
    meanAnomalyDeg: 12.0,
    meanMotionRevsPerDay: 14.12,
    positionECI: { x: 0, y: 0, z: 0 },
    velocityECI: { x: 0, y: 0, z: 0 },
    currentDistanceKm: 0,
  },
];
