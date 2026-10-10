import {
  GNSSConstellation,
  GNSSOccultation,
  OccultationType,
  OccultationStatus,
  SoundingPoint,
  EdgeAIMicroController,
  GNSSROState,
} from '../../types/telemetry';

export class GNSSROPhysics {
  /**
   * Generates a physically grounded vertical atmospheric sounding profile (0 to 60 km altitude)
   * grounded in the US Standard Atmosphere 1976 with latitude-dependent tropopause dynamics
   * and Edge-AI INT8 quantization emulation.
   */
  public static generateAtmosphericProfile(
    lat: number,
    lon: number,
    anomalyType?: string | null
  ): SoundingPoint[] {
    const absLat = Math.abs(lat);
    // Tropopause height varies from ~17 km at equator down to ~9 km at poles
    const tropopauseAltKm = 17.0 - (absLat / 90) * 8.0;
    // Tropopause temperature: colder at equator (~ -80°C) than at poles (~ -55°C)
    const tropopauseTempC = -78.0 + (absLat / 90) * 23.0;

    // Sea level surface temperature (warmer at equator, colder at poles)
    let surfaceTempC = 28.0 - (absLat / 90) * 45.0;
    if (anomalyType?.includes('Tropical Cyclone')) {
      surfaceTempC = 29.5;
    }

    // Surface pressure in hPa
    const surfacePresHPa = anomalyType?.includes('Cyclone') ? 958.0 : 1013.25;

    const levels = 50; // 50 vertical sounding bins from 0.5 km to 60 km
    const profile: SoundingPoint[] = [];

    for (let i = 0; i <= levels; i++) {
      const z = Number(((i / levels) * 58 + 0.5).toFixed(1)); // 0.5 km to 58.5 km

      let tempC: number;
      if (z <= tropopauseAltKm) {
        // Troposphere: standard lapse rate (~ -6.5 °C/km)
        const lapseRate = (surfaceTempC - tropopauseTempC) / tropopauseAltKm;
        tempC = surfaceTempC - lapseRate * z;
      } else if (z <= 20.0) {
        // Tropopause isothermal layer
        tempC = tropopauseTempC;
      } else if (z <= 47.0) {
        // Stratosphere ozone heating layer (warms up to ~ -2°C at stratopause 47 km)
        const stratLapse = (-2.0 - tropopauseTempC) / (47.0 - 20.0);
        tempC = tropopauseTempC + stratLapse * (z - 20.0);
      } else {
        // Mesosphere cooling layer
        tempC = -2.0 - 2.8 * (z - 47.0);
      }

      // Atmospheric River humidity anomaly or tropical cyclone warm-core anomaly
      if (anomalyType?.includes('Tropical Cyclone') && z >= 10 && z <= 15) {
        tempC += 3.8; // Warm core anomaly in upper troposphere
      } else if (anomalyType?.includes('Atmospheric River') && z < 4.0) {
        tempC += 1.2;
      }

      const tempK = tempC + 273.15;

      // Barometric pressure calculation P(z) = P0 * exp(-g * z / (R * T_avg))
      // Effective scale height ~ 7.2 km
      const scaleHeight = 7.2;
      const pressureHPa = Number((surfacePresHPa * Math.exp(-z / scaleHeight)).toFixed(2));

      // Density rho = P / (R_dry * T) in kg/m^3 (R_dry = 287.058 J/(kg·K))
      const densityKgM3 = Number(((pressureHPa * 100) / (287.058 * tempK)).toFixed(4));

      // Specific humidity (water vapor) concentrated in lower troposphere
      let specificHumidityGKg = 0;
      if (z < 12.0) {
        const satVaporPresHPa = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
        let rhPercent = 0.75 * Math.exp(-z / 3.0); // relative humidity decreasing with altitude
        if (anomalyType?.includes('Atmospheric River') && z < 6.0) {
          rhPercent = Math.min(0.98, rhPercent * 1.6); // Heavy water vapor plume
        }
        const vaporPres = Math.min(pressureHPa * 0.4, satVaporPresHPa * rhPercent);
        specificHumidityGKg = Number(((622.0 * vaporPres) / pressureHPa).toFixed(2));
      }

      // Smith-Weintraub equation for atmospheric radio refractivity N
      // N = 77.6 * (P / T) + 3.73e5 * (e / T^2)
      const dryN = 77.6 * (pressureHPa / tempK);
      const wetN = z < 12.0 ? 3.73e5 * ((specificHumidityGKg * pressureHPa / 622.0) / (tempK ** 2)) : 0;
      const refractivityN = Number((dryN + wetN).toFixed(2));

      // Bending angle in microradians (Abel forward transform approximation)
      const bendingAngleMicrorad = Number((refractivityN * 0.12 * Math.exp(-z / 8.5) * 1000).toFixed(1));

      // Edge-AI INT8 quantization emulation:
      // Simulates real ARM Cortex-M55 / Ethos-U55 INT8 neural inference noise:
      // Quantization noise ~ +/- 0.12°C with slight neural interpolation smoothing
      const quantNoise = (Math.sin(z * 4.2 + lat) * 0.14) + (Math.cos(z * 2.1) * 0.08);
      const int8NeuralTempC = Number((tempC + quantNoise).toFixed(2));
      const int8ErrorDegC = Number(Math.abs(int8NeuralTempC - tempC).toFixed(3));

      profile.push({
        altitudeKm: z,
        temperatureK: Number(tempK.toFixed(1)),
        temperatureC: Number(tempC.toFixed(2)),
        pressureHPa,
        refractivityN,
        specificHumidityGKg,
        densityKgM3,
        bendingAngleMicrorad,
        int8NeuralTempC,
        int8ErrorDegC,
      });
    }

    return profile;
  }

  /**
   * Evaluates planetary climate anomalies based on geographic tangent location and sounding profile
   */
  public static detectClimateAnomaly(lat: number, lon: number): string | null {
    // Pacific Atmospheric River
    if (lat >= 30 && lat <= 48 && lon >= -150 && lon <= -120) {
      return 'Atmospheric River Influx (Pineapple Express AR4, PWV > 49mm)';
    }
    // Western Pacific Typhoon Alley
    if (lat >= 10 && lat <= 26 && lon >= 120 && lon <= 155) {
      return 'Tropical Cyclone Warm Core (+3.8K upper-level eye anomaly)';
    }
    // Polar Vortex boundary / Sudden Stratospheric Warming
    if (Math.abs(lat) >= 65) {
      return 'Polar Vortex Boundary Shear (SSW Precursor Detected)';
    }
    // Intertropical Convergence Zone (ITCZ)
    if (Math.abs(lat) <= 7) {
      return 'ITCZ Deep Convective Tower (Tropospheric Moisture Surge)';
    }
    // North Atlantic Storm Track
    if (lat >= 42 && lat <= 60 && lon >= -50 && lon <= -10) {
      return 'North Atlantic Jet Stream Inversion (Tropopause Folding)';
    }
    return null;
  }

  /**
   * Returns human-readable climate region name for given coordinates
   */
  public static getClimateRegion(lat: number, lon: number): string {
    if (lat > 66) return 'Arctic Polar Vortex Zone';
    if (lat < -66) return 'Antarctic Polar Vortex';
    if (Math.abs(lat) < 15) return 'Equatorial Convective Belt (ITCZ)';
    if (lat > 23 && lat < 55 && lon > -160 && lon < -120) return 'Eastern North Pacific';
    if (lat > 10 && lat < 30 && lon > 110 && lon < 160) return 'Western Pacific Basin';
    if (lat > 30 && lat < 60 && lon > -60 && lon < 10) return 'North Atlantic Storm Corridor';
    if (lat > -35 && lat < -15 && lon > 115 && lon < 155) return 'Southern Ocean Jet Stream';
    return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  }

  /**
   * Creates initial curated completed sounding catalog across global climate zones
   */
  public static createSeedSoundings(): GNSSOccultation[] {
    const seedTargets = [
      { prn: 'GPS PRN-14', constellation: 'GPS' as GNSSConstellation, lat: 36.4, lon: -138.2, type: 'SETTING' as OccultationType },
      { prn: 'Galileo E22', constellation: 'GALILEO' as GNSSConstellation, lat: 18.2, lon: 134.7, type: 'SETTING' as OccultationType },
      { prn: 'GLONASS 731', constellation: 'GLONASS' as GNSSConstellation, lat: 71.5, lon: 24.3, type: 'RISING' as OccultationType },
      { prn: 'BeiDou B19', constellation: 'BEIDOU' as GNSSConstellation, lat: -4.8, lon: -61.2, type: 'SETTING' as OccultationType },
      { prn: 'GPS PRN-29', constellation: 'GPS' as GNSSConstellation, lat: 49.3, lon: -34.8, type: 'RISING' as OccultationType },
      { prn: 'Galileo E05', constellation: 'GALILEO' as GNSSConstellation, lat: -74.1, lon: 12.0, type: 'SETTING' as OccultationType },
    ];

    const now = Date.now();

    return seedTargets.map((tgt, idx) => {
      const anomaly = this.detectClimateAnomaly(tgt.lat, tgt.lon);
      const profile = this.generateAtmosphericProfile(tgt.lat, tgt.lon, anomaly);
      const rawKB = 24850; // 24.85 MB raw 50Hz high-rate occultation stream
      const compKB = 1.82; // 1.82 KB quantized BUFR sounding packet

      return {
        id: `sounding-seed-${idx + 1}`,
        gnssSatellite: tgt.prn,
        constellation: tgt.constellation,
        type: tgt.type,
        status: 'COMPRESSED' as OccultationStatus,
        tangentLat: tgt.lat,
        tangentLon: tgt.lon,
        tangentAltitudeKm: 0.8,
        impactParameterKm: 6378.137 + 0.8,
        progressPercent: 100,
        timestampMs: now - (seedTargets.length - idx) * 360000,
        rawDataSizeKB: rawKB,
        edgeCompressedSizeKB: compKB,
        compressionRatio: Number((rawKB / compKB).toFixed(0)),
        excessDopplerHz: -42.8 + idx * 8.4,
        signalSnrDb: 44.5 - idx * 1.5,
        anomalyDetected: anomaly,
        climateRegion: this.getClimateRegion(tgt.lat, tgt.lon),
        profile,
      };
    });
  }

  /**
   * Generates a new live occultation candidate event based on current CubeSat geodetic position
   */
  public static createActiveOccultation(
    satLat: number,
    satLon: number,
    satAltKm: number,
    counter: number
  ): GNSSOccultation {
    const constellations: GNSSConstellation[] = ['GPS', 'GALILEO', 'GLONASS', 'BEIDOU'];
    const constChoice = constellations[counter % constellations.length];
    const prnNum = (counter * 7 + 3) % 32 + 1;
    const prnName = `${constChoice} PRN-${prnNum.toString().padStart(2, '0')}`;

    // Tangent point is roughly 15° to 30° away along limb line-of-sight
    const bearingRad = (counter * 67 * Math.PI) / 180;
    const tangentDistDeg = 22.5;
    const tangentLat = Math.max(-85, Math.min(85, satLat + Math.cos(bearingRad) * tangentDistDeg));
    const tangentLon = ((satLon + Math.sin(bearingRad) * tangentDistDeg + 540) % 360) - 180;

    const isSetting = counter % 2 === 0;
    const anomaly = this.detectClimateAnomaly(tangentLat, tangentLon);
    const profile = this.generateAtmosphericProfile(tangentLat, tangentLon, anomaly);

    return {
      id: `occ-active-${Date.now()}-${counter}`,
      gnssSatellite: prnName,
      constellation: constChoice,
      type: isSetting ? 'SETTING' : 'RISING',
      status: 'TRACKING_LIMB',
      tangentLat: Number(tangentLat.toFixed(2)),
      tangentLon: Number(tangentLon.toFixed(2)),
      tangentAltitudeKm: isSetting ? 68.0 : 4.5,
      impactParameterKm: 6378.137 + (isSetting ? 68.0 : 4.5),
      progressPercent: isSetting ? 15 : 85,
      timestampMs: Date.now(),
      rawDataSizeKB: 24500,
      edgeCompressedSizeKB: 1.82,
      compressionRatio: 13461,
      excessDopplerHz: isSetting ? -18.4 : 26.2,
      signalSnrDb: 46.2,
      anomalyDetected: anomaly,
      climateRegion: this.getClimateRegion(tangentLat, tangentLon),
      profile,
    };
  }

  /**
   * Returns default Edge-AI Micro-Controller state
   */
  public static getDefaultEdgeAIState(): EdgeAIMicroController {
    return {
      processorModel: 'ARM Cortex-M55 + Ethos-U55 microNPU (250 MHz)',
      architecture: 'Zero-Moving-Parts Payload (3U/6U Envelope, 1U Volume)',
      powerMode: 'ACTIVE_INFERENCE',
      powerConsumptionW: 1.65, // Micro-controller edge AI consumes only ~1.65 W
      sramUsageKB: 384,
      maxSramKB: 512,
      flashModelSizeKB: 1420,
      maxFlashKB: 2048,
      quantScheme: 'INT8 Post-Training Quantized (TFLite Micro / CMSIS-NN)',
      inferenceLatencyMs: 38.4,
      throughputInferencesPerSec: 26.0,
      snrGainDb: 4.8,
      totalDataDownlinkSavedMB: 148.2, // ~148 MB downlink bandwidth saved already
      totalSoundingsProcessed: 6,
      neuralAbelErrorRmsePercent: 0.18,
      autoPriorityAlertEnabled: true,
    };
  }

  /**
   * Returns default initial GNSS-RO State
   */
  public static getDefaultGNSSROState(): GNSSROState {
    const seedSoundings = this.createSeedSoundings();
    return {
      enabled: true,
      activeOccultations: [
        {
          id: 'occ-live-1',
          gnssSatellite: 'GPS PRN-07',
          constellation: 'GPS',
          type: 'SETTING',
          status: 'TRACKING_LIMB',
          tangentLat: 38.6,
          tangentLon: -136.4,
          tangentAltitudeKm: 34.2,
          impactParameterKm: 6378.137 + 34.2,
          progressPercent: 52,
          timestampMs: Date.now(),
          rawDataSizeKB: 24700,
          edgeCompressedSizeKB: 1.82,
          compressionRatio: 13571,
          excessDopplerHz: -38.2,
          signalSnrDb: 45.1,
          anomalyDetected: 'Atmospheric River Influx (Pineapple Express AR4, PWV > 49mm)',
          climateRegion: 'Eastern North Pacific',
          profile: this.generateAtmosphericProfile(38.6, -136.4, 'Atmospheric River Influx'),
        },
      ],
      completedSoundings: seedSoundings,
      selectedSoundingId: seedSoundings[0].id,
      receiverRfPowerW: 1.15, // COTS GNSS-RO front-end receiver
      totalPowerDrawW: 2.80,  // 1.15 W (RF front-end) + 1.65 W (Edge-AI micro-NPU)
      edgeAI: this.getDefaultEdgeAIState(),
      filterConstellations: {
        GPS: true,
        GALILEO: true,
        GLONASS: true,
        BEIDOU: true,
      },
      continuousSoundingRatePerHour: 14.5, // ~350 soundings per day globally
    };
  }
}
