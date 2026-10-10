export type OrbitMode = 
  | 'DETUMBLE' 
  | 'SUN_POINTING' 
  | 'NADIR_POINTING' 
  | 'GROUND_TRACKING' 
  | 'SAFE_MODE' 
  | 'MANEUVER_BURN';

export type CubeSatFormFactor = '1U' | '3U' | '6U' | '12U';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface EulerAngles {
  roll: number;  // degrees
  pitch: number; // degrees
  yaw: number;   // degrees
}

export interface KeplerianElements {
  semiMajorAxis: number;     // km (a)
  eccentricity: number;      // e
  inclination: number;       // deg (i)
  raan: number;              // deg (Right Ascension of Ascending Node, Omega)
  argOfPerigee: number;      // deg (omega)
  trueAnomaly: number;       // deg (nu)
  meanAnomaly: number;       // deg (M)
  periodMinutes: number;     // min (T)
  apogeeAltitude: number;    // km
  perigeeAltitude: number;   // km
}

export interface GeodeticCoords {
  latitude: number;   // deg (-90 to +90)
  longitude: number;  // deg (-180 to +180)
  altitude: number;   // km
}

export interface OrbitalState {
  epoch: number;             // timestamp ms
  simulatedTime: number;     // timestamp ms
  positionECI: Vector3D;     // km in Earth-Centered Inertial
  velocityECI: Vector3D;     // km/s
  geodetic: GeodeticCoords;
  elements: KeplerianElements;
  sunVectorECI: Vector3D;    // normalized
  eclipseState: 'SUNLIGHT' | 'PENUMBRA' | 'UMBRA';
  eclipseFraction: number;   // 0.0 (full shadow) to 1.0 (full sunlight)
  betaAngle: number;         // deg angle between orbit plane and Sun
  j2Enabled: boolean;
  nodalRegressionRateDegDay: number; // dOmega/dt in deg/day
  accumulatedNodalShiftDeg: number;  // total delta Omega accumulated since epoch
  perigeePrecessionRateDegDay: number; // domega/dt in deg/day
  groundTrackNodalShiftDegOrbit: number; // nodal shift per orbit on Earth surface (deg/orbit)
}

export interface ADCSState {
  mode: OrbitMode;
  quaternion: Quaternion;
  targetQuaternion: Quaternion;
  angularVelocity: Vector3D; // rad/s
  euler: EulerAngles;
  wheelSpeedRpm: [number, number, number]; // 3 reaction wheels (RPM)
  wheelTorqueNm: [number, number, number];
  magnetorquerDipoleAm2: [number, number, number]; // A*m^2
  magneticFieldNanoTesla: Vector3D; // Earth magnetic field vector at satellite position
  pointingErrorDeg: number;
  detumbleRate: number;      // rad/s magnitude
  propulsion?: PropulsionState;
}

export type SolarFaceId = '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z' | 'WING_LEFT' | 'WING_RIGHT';

export interface SolarPanelFaceTelemetry {
  faceId: SolarFaceId;
  name: string;
  normalBody: Vector3D;
  areaM2: number;
  incidenceAngleDeg: number;
  cosIncidence: number;
  isIlluminated: boolean;
  powerOutputW: number;
  cellEfficiencyPercent: number;
}

export interface EPSState {
  solarPanelDeployed: boolean;
  solarIrradianceWPerM2: number; // ~1361 W/m² in LEO
  solarArrayPowerW: number;      // Watts generated
  batteryVoltageV: number;       // Volts (nominal 8.2V for 2S or 12.6V for 3S)
  batteryCurrentA: number;       // Net Amps (+ charging, - discharging)
  batterySocPercent: number;     // State of Charge %
  batteryCapacityWh: number;     // Nominal capacity Wh
  batteryRemainingWh: number;
  batteryTempC: number;          // Battery Celsius
  solarPanelTempC: number;       // Panel Celsius
  bus3v3CurrentA: number;
  bus5vCurrentA: number;
  bus12vCurrentA: number;
  totalLoadPowerW: number;
  lowPowerModeActive: boolean;
  panelFaces: SolarPanelFaceTelemetry[];
  sunVectorBody: Vector3D;
  effectiveHarvestingEfficiencyPercent: number;
}

export interface GroundStation {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  minElevationDeg: number;
  activeFrequencyMHz: number;
}

export interface GroundPass {
  stationId: string;
  stationName: string;
  aos: number; // Acquisition of Signal (timestamp ms)
  los: number; // Loss of Signal (timestamp ms)
  maxElevationDeg: number;
  durationSeconds: number;
  inContactNow: boolean;
  currentElevationDeg: number;
  currentAzimuthDeg: number;
  currentSlantRangeKm: number;
}

export interface CommsState {
  transceiverEnabled: boolean;
  band: 'UHF' | 'S-BAND' | 'X-BAND';
  frequencyMHz: number;
  rfPowerWatts: number;
  dopplerShiftHz: number;
  slantRangeKm: number;
  elevationDeg: number;
  azimuthDeg: number;
  fsplDb: number;            // Free Space Path Loss in dB
  receivedSnrDb: number;      // Signal-to-Noise Ratio
  bitErrorRate: number;       // e.g. 1e-6
  activeGroundStation: GroundStation | null;
  linkStatus: 'DISCONNECTED' | 'ACQUIRING' | 'LINK_LOCKED' | 'DATA_DOWNLINK';
  downlinkSpeedKbps: number;
  packetsDownlinked: number;
  bufferQueueKBytes: number;
}

export interface SpaceDebris {
  id: string;
  catalogNumber: number;
  name: string;
  type: 'ROCKET_BODY' | 'FRAGMENT' | 'PAYLOAD_DEBRIS' | 'DEFUNCT_SAT';
  rcsM2: number;              // Radar Cross Section area in m^2
  estimatedMassKg: number;
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argOfPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevsPerDay: number;
  positionECI: Vector3D;
  velocityECI: Vector3D;
  currentDistanceKm: number;
}

export interface ConjunctionAssessment {
  debrisId: string;
  debrisName: string;
  catalogNumber: number;
  timeOfClosestApproach: number; // timestamp ms
  timeToTcaSeconds: number;
  missDistanceKm: number;
  relativeVelocityKmS: number;
  collisionProbability: number;  // Pc value, e.g. 1.2e-4
  severity: 'NOMINAL' | 'MONITOR' | 'WARNING' | 'CRITICAL';
  recommendedAction: string;
  recommendedDeltaVMs: number;   // Recommended burn in m/s
  burnVectorECI: Vector3D;
  maneuverExecuted: boolean;
}

export interface TelemetryFrame {
  timestamp: number;
  simTime: number;
  orbit: OrbitalState;
  adcs: ADCSState;
  eps: EPSState;
  comms: CommsState;
  conjunctions: ConjunctionAssessment[];
  gnssRO?: GNSSROState;
  propulsion?: PropulsionState;
  thermal?: ThermalState;
}

export type GNSSConstellation = 'GPS' | 'GALILEO' | 'GLONASS' | 'BEIDOU';
export type OccultationType = 'SETTING' | 'RISING';
export type OccultationStatus = 'AQUIRING' | 'TRACKING_LIMB' | 'INVERTING_ABEL' | 'COMPRESSED';

export interface SoundingPoint {
  altitudeKm: number;
  temperatureK: number;
  temperatureC: number;
  pressureHPa: number;
  refractivityN: number;
  specificHumidityGKg: number;
  densityKgM3: number;
  bendingAngleMicrorad: number;
  int8NeuralTempC: number; // Onboard Edge-AI reconstructed temperature
  int8ErrorDegC: number;
}

export interface GNSSOccultation {
  id: string;
  gnssSatellite: string;
  constellation: GNSSConstellation;
  type: OccultationType;
  status: OccultationStatus;
  tangentLat: number;
  tangentLon: number;
  tangentAltitudeKm: number;
  impactParameterKm: number;
  progressPercent: number;
  timestampMs: number;
  rawDataSizeKB: number;
  edgeCompressedSizeKB: number;
  compressionRatio: number;
  excessDopplerHz: number;
  signalSnrDb: number;
  anomalyDetected: string | null;
  climateRegion: string;
  profile: SoundingPoint[];
}

export interface EdgeAIMicroController {
  processorModel: string;
  architecture: string;
  powerMode: 'ACTIVE_INFERENCE' | 'BURST_NEURAL' | 'DEEP_SLEEP';
  powerConsumptionW: number;
  sramUsageKB: number;
  maxSramKB: number;
  flashModelSizeKB: number;
  maxFlashKB: number;
  quantScheme: string;
  inferenceLatencyMs: number;
  throughputInferencesPerSec: number;
  snrGainDb: number;
  totalDataDownlinkSavedMB: number;
  totalSoundingsProcessed: number;
  neuralAbelErrorRmsePercent: number;
  autoPriorityAlertEnabled: boolean;
}

export interface GNSSROState {
  enabled: boolean;
  activeOccultations: GNSSOccultation[];
  completedSoundings: GNSSOccultation[];
  selectedSoundingId: string | null;
  receiverRfPowerW: number;
  totalPowerDrawW: number;
  edgeAI: EdgeAIMicroController;
  filterConstellations: Record<GNSSConstellation, boolean>;
  continuousSoundingRatePerHour: number;
}

export type ManeuverDirection =
  | 'PROGRADE'
  | 'RETROGRADE'
  | 'NORMAL'
  | 'ANTI_NORMAL'
  | 'RADIAL_OUT'
  | 'RADIAL_IN';

export type ThrusterStatus =
  | 'STANDBY'
  | 'ARMED'
  | 'PREHEATING'
  | 'FIRING'
  | 'COOLDOWN';

export interface ThrusterManeuverConfig {
  direction: ManeuverDirection;
  targetDeltaVMs: number;       // m/s
  thrustMilliNewtons: number;   // mN (e.g. 50 mN)
  specificImpulseSec: number;   // s (e.g. 110s)
  valveHeatingEnabled: boolean; // Pre-heater (+6.5W)
  attitudeLockRequired: boolean;// Require ADCS pointing error < 2.0°
}

export interface ManeuverRecord {
  id: string;
  timestamp: number;
  direction: ManeuverDirection;
  deltaVMs: number;
  durationSec: number;
  propellantConsumedG: number;
  energyConsumedWh: number;
  initialSemiMajorAxisKm: number;
  finalSemiMajorAxisKm: number;
  initialApogeeKm: number;
  finalApogeeKm: number;
  initialPerigeeKm: number;
  finalPerigeeKm: number;
  peakLoadW: number;
}

export interface PropulsionState {
  enabled: boolean;
  status: ThrusterStatus;
  propellantMassGrams: number;
  propellantCapacityGrams: number;
  tankPressureBar: number;
  chamberTempC: number;
  currentThrustMilliN: number;
  currentPowerDrawW: number;
  currentMassFlowRateGramsPerSec: number;
  cumulativeDeltaVMs: number;
  totalPropellantConsumedGrams: number;
  config: ThrusterManeuverConfig;
  activeBurn: {
    inProgress: boolean;
    startSimTime: number;
    durationPlannedSec: number;
    durationElapsedSec: number;
    targetDeltaVMs: number;
    achievedDeltaVMs: number;
    direction: ManeuverDirection;
    initialOrbit: KeplerianElements;
  } | null;
  history: ManeuverRecord[];
}

export type DragAttitudePreset = 'FEATHERED' | 'NOMINAL' | 'BROADSIDE' | 'DEORBIT_SAIL' | 'CUSTOM';

export interface DragParameters {
  cd: number;                   // Drag coefficient (1.8 - 2.8, nominal 2.2)
  crossSectionAreaM2: number;   // Frontal area in flight direction (0.01 - 0.15 m^2)
  satelliteMassKg: number;      // Satellite mass in kg
  f107SolarFlux: number;        // Solar 10.7cm radio flux (65 - 350 sfu)
  hpExponentN: number;          // Bulge power exponent n (2 to 6, nominal 4)
  bulgeLagDeg: number;          // Diurnal bulge lag angle (nominally 30 deg)
  attitudeMode: DragAttitudePreset;
}

export interface AtmosphericDragTelemetry {
  enabled: boolean;
  densityKgM3: number;
  rhoMinKgM3: number;
  rhoMaxKgM3: number;
  diurnalRatio: number;          // rho / rhoMin
  bulgeAngleDeg: number;         // Angular distance to diurnal bulge apex
  diurnalBulgeFraction: number;  // cos^n(psi/2)
  subsolarAngleDeg: number;
  scaleHeightKm: number;
  relVelocityKmS: number;
  dragDecelVectorECI: Vector3D;
  dragDecelMagnitudeMs2: number;
  dragDecelMicroG: number;       // micro-g
  dragForceMicroN: number;       // micro-Newtons
  dynamicPressurePa: number;
  ballisticCoefficientKgM2: number;
  semiMajorAxisDecayMetersDay: number;
  semiMajorAxisDecayKmYear: number;
  apogeeDecayMetersDay: number;
  perigeeDecayMetersDay: number;
  periodDecayMsPerDay: number;
  reentryLifetimeDays: number;
  reentryStatus: 'STABLE' | 'MODERATE_DECAY' | 'RAPID_DECAY' | 'CRITICAL_REENTRY';
  cumulativeAltitudeLossMeters: number;
  parameters: DragParameters;
}

export type ThermalNodeId =
  | 'BATTERY'
  | 'OBC_CORE'
  | 'PAYLOAD_GNSS'
  | 'RF_PA'
  | 'ADCS_WHEELS'
  | 'CHASSIS'
  | 'RADIATOR'
  | 'SOLAR_PANELS';

export type ThermalNodeCategory = 'INTERNAL_COMPONENT' | 'STRUCTURE' | 'EXTERNAL_SURFACE';

export type ThermalNodeStatus =
  | 'NOMINAL'
  | 'COLD_WARNING'
  | 'HOT_WARNING'
  | 'CRITICAL_COLD'
  | 'CRITICAL_HOT';

export interface ThermalNode {
  id: ThermalNodeId;
  name: string;
  category: ThermalNodeCategory;
  temperatureC: number;
  temperatureK: number;
  minOperatingTempC: number;
  maxOperatingTempC: number;
  minSurvivalTempC: number;
  maxSurvivalTempC: number;
  heatCapacityJPerK: number;
  internalHeatDissipationW: number;
  environmentalHeatInputW: number;
  conductiveHeatTransferW: number;
  radiativeRejectionW: number;
  netHeatFlowW: number;
  rateOfTempChangeCPerMin: number;
  status: ThermalNodeStatus;
  activeCoolingCoupling: number; // Conductance W/K to radiator
  heaterActive: boolean;
}

export type ThermalStrapMode = 'ISOLATED' | 'BALANCED' | 'MAX_COOLING';

export interface HeatDissipationControls {
  louverAperturePercent: number;        // 0 - 100%
  louverAutoThermostat: boolean;        // Closed-loop auto adjustment
  louverTargetTempC: number;            // Target thermostat temp (°C)
  batteryHeaterEnabled: boolean;        // Battery patch heater manual switch
  batteryHeaterAutoThermostat: boolean; // Auto-engage when battery < 2°C
  batteryHeaterPowerW: number;          // Active heater dissipation (0 or ~3.2 W)
  payloadHeaterEnabled: boolean;        // Payload patch heater manual switch
  payloadHeaterAutoThermostat: boolean;
  payloadHeaterPowerW: number;          // Active heater dissipation (0 or ~2.0 W)
  thermalStrapMode: ThermalStrapMode;   // Variable pyrolytic strap conductance
  activeThermalDerating: boolean;       // Throttle OBC clock & RF PA power if hot
  deepSpaceRadiationShield: boolean;    // MLI blanket effectiveness
}

export interface ThermalEnvironment {
  solarIrradianceWPerM2: number;       // Direct flux in W/m² (0 in umbra, ~1361 in direct sun)
  solarFluxDirectW: number;            // Direct absorbed solar power (W)
  earthAlbedoFluxW: number;            // Absorbed reflected Earth albedo (W)
  earthIRFluxW: number;                // Absorbed planetary IR emission (W)
  totalHeatInputW: number;             // Sum of all heat sources (W)
  totalHeatRejectedW: number;          // Total radiative cooling to deep space (W)
  netThermalImbalanceW: number;        // Net dQ/dt for spacecraft (W)
  rateOfSpacecraftTempChangeCPerMin: number; // Mean spacecraft dT/dt (°C/min)
  eclipseState: 'SUNLIGHT' | 'PENUMBRA' | 'UMBRA';
  eclipseFraction: number;             // 0.0 to 1.0
  timeInCurrentRegimeSec: number;
  predictedTimeInEclipseSec: number;
  predictedTimeInSunlightSec: number;
}

export interface ThermalState {
  internalMeanTempC: number;
  chassisTempC: number;
  batteryTempC: number;
  obcTempC: number;
  payloadTempC: number;
  rfPaTempC: number;
  adcsTempC: number;
  radiatorTempC: number;
  solarPanelTempC: number;
  nodes: Record<ThermalNodeId, ThermalNode>;
  controls: HeatDissipationControls;
  environment: ThermalEnvironment;
  hasThermalWarning: boolean;
  thermalDeratingActive: boolean;
  autoProtectionEngaged: boolean;
}



